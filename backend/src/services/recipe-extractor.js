// Import a recipe from any link (TikTok, Instagram, Facebook, YouTube, recipe websites...).
//   1. source.js reads the link: caption, structured data, page text, video
//   2. ai.js has a free AI (Gemini, Groq as fallback) turn it into a structured recipe
//   3. the result is cleaned up here so the app always gets well-formed data

const { fetchSource } = require('./recipe-import/source');
const { extractWithAI, CATEGORIES, DIFFICULTIES, MEAL_TYPES } = require('./recipe-import/ai');
const { ImportError } = require('./recipe-import/errors');

const MAX_INGREDIENTS = 60;
const MAX_STEPS = 40;
const MAX_TAGS = 6;

function toText(value, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function toPositiveInt(value, max) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 && number <= max ? number : undefined;
}

function normalizeRecipe(raw) {
  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map(ingredient => {
      const quantity = Number(ingredient?.quantity);
      return {
        name: toText(ingredient?.name, 120),
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity * 100) / 100 : undefined,
        unit: toText(ingredient?.unit, 30),
        category: CATEGORIES.includes(ingredient?.category) ? ingredient.category : 'other'
      };
    })
    .filter(ingredient => ingredient.name)
    .slice(0, MAX_INGREDIENTS);

  const instructions = (Array.isArray(raw.instructions) ? raw.instructions : [])
    // "1. Faire bouillir" -> "Faire bouillir": the app numbers the steps itself
    .map(step => toText(step, 1000).replace(/^\s*(?:étape\s*)?\d+\s*[.):-]\s*/i, ''))
    .filter(Boolean)
    .slice(0, MAX_STEPS);

  const tags = [...new Set(
    (Array.isArray(raw.tags) ? raw.tags : [])
      .map(tag => toText(tag, 30).toLowerCase().replace(/^#/, ''))
      .filter(Boolean)
  )].slice(0, MAX_TAGS);

  const prepTime = toPositiveInt(raw.prepTime, 24 * 60);
  const cookTime = toPositiveInt(raw.cookTime, 3 * 24 * 60);

  return {
    title: toText(raw.title, 120),
    description: toText(raw.description, 600),
    ingredients,
    instructions,
    prepTime,
    cookTime,
    totalTime: prepTime || cookTime ? (prepTime || 0) + (cookTime || 0) : undefined,
    servings: toPositiveInt(raw.servings, 100),
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : undefined,
    mealType: MEAL_TYPES.includes(raw.mealType) ? raw.mealType : undefined,
    tags
  };
}

/**
 * @returns {Promise<{recipe: object, meta: {platform: string, usedVideo: boolean, model: string}}>}
 */
async function extractRecipeFromUrl(url) {
  const source = await fetchSource(url);

  if (!source.video && !source.youtubeUrl && !source.caption && !source.pageText && !source.structuredRecipe) {
    throw new ImportError(422, "Ce lien ne contient rien de lisible. S'il s'agit d'un compte privé, la publication doit être publique.");
  }

  const { recipe: raw, model, usedVideo } = await extractWithAI(source);
  const recipe = normalizeRecipe(raw);

  if (raw.isRecipe === false || (recipe.ingredients.length === 0 && recipe.instructions.length === 0)) {
    throw new ImportError(422, 'Aucune recette trouvée dans ce lien.');
  }

  return {
    recipe: {
      ...recipe,
      title: recipe.title || source.title || 'Recette importée',
      imageUrl: source.imageUrl,
      sourceUrl: source.finalUrl,
      sourcePlatform: ['tiktok', 'instagram', 'facebook', 'youtube'].includes(source.platform) ? source.platform : 'url'
    },
    meta: { platform: source.platform, usedVideo, model }
  };
}

module.exports = { extractRecipeFromUrl, normalizeRecipe };
