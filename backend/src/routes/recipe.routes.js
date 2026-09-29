const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');
const { extractRecipeFromUrl } = require('../services/recipe-extractor');
const { ImportError } = require('../services/recipe-import/errors');
const { compressDataUri } = require('../services/recipe-import/image');

// All routes require authentication
router.use(authenticateUser);

// Fields a client may set on a recipe (everything else is decided by the server)
const EDITABLE_FIELDS = [
  'title', 'description', 'imageUrl', 'videoUrl', 'sourceUrl', 'sourcePlatform',
  'ingredients', 'instructions', 'prepTime', 'cookTime', 'totalTime', 'difficulty',
  'servings', 'toolsNeeded', 'tags', 'mealType', 'isFavorite'
];

function pickEditable(body) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

/**
 * Cover picture: a regular http(s) link is kept as is, an inline picture (data URI) is
 * compressed so recipe documents stay light; anything else is dropped.
 */
async function prepareImage(data) {
  if (data.imageUrl === undefined || data.imageUrl === null || data.imageUrl === '') return data;

  if (typeof data.imageUrl === 'string' && /^https?:\/\//i.test(data.imageUrl)) return data;

  const compressed = await compressDataUri(data.imageUrl);
  if (typeof compressed === 'string' && compressed.startsWith('data:image/')) {
    data.imageUrl = compressed;
  } else {
    delete data.imageUrl;
  }
  return data;
}

/** Mongo document -> what the app expects (string `id`, no `_id`). */
function toClient(recipe) {
  if (!recipe) return recipe;
  const { _id, ...rest } = recipe;
  return { ...rest, id: _id.toString(), householdId: recipe.householdId?.toString() };
}

async function getUserHouseholdId(uid) {
  const user = await getDB().collection('users').findOne({ _id: new ObjectId(uid) });
  return user?.householdId ? user.householdId.toString() : null;
}

/**
 * Loads a recipe the authenticated user is allowed to touch (one of their household's).
 * Sends the error response itself and returns null otherwise.
 */
async function loadOwnRecipe(req, res) {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(404).json({ error: 'Recipe not found' });
    return null;
  }

  const [recipe, householdId] = await Promise.all([
    getDB().collection('recipes').findOne({ _id: new ObjectId(req.params.id) }),
    getUserHouseholdId(req.user.uid)
  ]);

  // Same answer whether it doesn't exist or belongs to another household: nothing to learn from it
  if (!recipe || !householdId || recipe.householdId?.toString() !== householdId) {
    res.status(404).json({ error: 'Recipe not found' });
    return null;
  }
  return recipe;
}

// ---------- Import from a link (AI) ----------

// Free AI tiers have daily quotas: cap imports per user so one person can't drain them
const IMPORTS_PER_HOUR = 20;
const importLog = new Map(); // uid -> timestamps of recent imports

function allowImport(uid) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (importLog.get(uid) || []).filter(time => time > hourAgo);
  if (recent.length >= IMPORTS_PER_HOUR) {
    importLog.set(uid, recent);
    return false;
  }
  recent.push(Date.now());
  importLog.set(uid, recent);
  return true;
}

// Extract a recipe from any link: TikTok, Instagram, Facebook, YouTube, recipe websites...
router.post('/extract', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    return res.status(400).json({ error: 'Colle un lien pour importer une recette' });
  }
  if (!allowImport(req.user.uid)) {
    return res.status(429).json({ error: "Tu as fait beaucoup d'imports cette heure-ci. Réessaie un peu plus tard." });
  }

  const startedAt = Date.now();
  try {
    const { recipe, meta } = await extractRecipeFromUrl(url);
    console.log(`[extract] ${meta.platform} ${url} -> "${recipe.title}" (${meta.model}, video: ${meta.usedVideo}, ${Date.now() - startedAt} ms)`);
    res.json({ recipe, meta });
  } catch (error) {
    if (error instanceof ImportError) {
      console.warn(`[extract] ${url} -> ${error.status} ${error.message}`, error.cause?.message || '');
      return res.status(error.status).json({ error: error.message });
    }
    console.error('[extract] Unexpected error:', error);
    res.status(500).json({ error: "Erreur inattendue pendant l'import" });
  }
});

// ---------- CRUD, always scoped to the user's household ----------

// Create recipe (in the user's current household, whatever the body says)
router.post('/', async (req, res) => {
  try {
    const householdId = await getUserHouseholdId(req.user.uid);
    if (!householdId) {
      return res.status(403).json({ error: 'Rejoins ou crée un foyer pour ajouter des recettes' });
    }

    const data = await prepareImage(pickEditable(req.body || {}));
    if (!data.title || typeof data.title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const recipe = {
      ...data,
      householdId: new ObjectId(householdId),
      createdBy: req.user.uid,
      isFavorite: Boolean(data.isFavorite),
      timesCooked: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await getDB().collection('recipes').insertOne(recipe);
    recipe._id = result.insertedId;

    res.status(201).json({ recipe: toClient(recipe) });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipes for household
router.get('/household/:householdId', async (req, res) => {
  try {
    const householdId = await getUserHouseholdId(req.user.uid);
    if (!householdId || householdId !== req.params.householdId) {
      return res.status(403).json({ error: 'Access to this household is not allowed' });
    }

    const { filters, search } = req.query;
    const query = { householdId: new ObjectId(householdId) };

    if (filters) {
      const parsedFilters = JSON.parse(filters);
      if (parsedFilters.difficulty) query.difficulty = parsedFilters.difficulty;
      if (parsedFilters.mealType) query.mealType = parsedFilters.mealType;
      if (parsedFilters.maxTime) query.totalTime = { $lte: parsedFilters.maxTime };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const recipes = await getDB().collection('recipes')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ recipes: recipes.map(toClient) });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const recipe = await loadOwnRecipe(req, res);
    if (!recipe) return;
    res.json({ recipe: toClient(recipe) });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update recipe
router.put('/:id', async (req, res) => {
  try {
    const recipe = await loadOwnRecipe(req, res);
    if (!recipe) return;

    const result = await getDB().collection('recipes').findOneAndUpdate(
      { _id: recipe._id },
      { $set: { ...(await prepareImage(pickEditable(req.body || {}))), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({ recipe: toClient(result) });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const recipe = await loadOwnRecipe(req, res);
    if (!recipe) return;

    await getDB().collection('recipes').deleteOne({ _id: recipe._id });
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark recipe as cooked
router.post('/:id/cooked', async (req, res) => {
  try {
    const recipe = await loadOwnRecipe(req, res);
    if (!recipe) return;

    const result = await getDB().collection('recipes').findOneAndUpdate(
      { _id: recipe._id },
      {
        $inc: { timesCooked: 1 },
        $set: { lastCookedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    res.json({ recipe: toClient(result) });
  } catch (error) {
    console.error('Mark as cooked error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle favorite
router.post('/:id/favorite', async (req, res) => {
  try {
    const recipe = await loadOwnRecipe(req, res);
    if (!recipe) return;

    const result = await getDB().collection('recipes').findOneAndUpdate(
      { _id: recipe._id },
      { $set: { isFavorite: !recipe.isFavorite, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({ recipe: toClient(result) });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
