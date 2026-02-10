const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

// Create recipe
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const recipeData = req.body;
    
    const recipe = {
      ...recipeData,
      householdId: new ObjectId(recipeData.householdId),
      createdBy: req.user.uid,
      isFavorite: false,
      timesCooked: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('recipes').insertOne(recipe);
    recipe._id = result.insertedId;
    
    res.status(201).json({ recipe });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipes for household
router.get('/household/:householdId', async (req, res) => {
  try {
    const db = getDB();
    const { filters, search } = req.query;
    
    let query = { householdId: new ObjectId(req.params.householdId) };
    
    // Apply filters
    if (filters) {
      const parsedFilters = JSON.parse(filters);
      if (parsedFilters.difficulty) query.difficulty = parsedFilters.difficulty;
      if (parsedFilters.mealType) query.mealType = parsedFilters.mealType;
      if (parsedFilters.maxTime) query.totalTime = { $lte: parsedFilters.maxTime };
    }
    
    // Apply search
    if (search) {
      query.$text = { $search: search };
    }
    
    const recipes = await db.collection('recipes')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json({ recipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const recipe = await db.collection('recipes').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ recipe });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update recipe
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Remove immutable fields
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    const result = await db.collection('recipes').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ recipe: result.value });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.collection('recipes').deleteOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark recipe as cooked
router.post('/:id/cooked', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.collection('recipes').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { 
        $inc: { timesCooked: 1 },
        $set: { lastCookedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    
    res.json({ recipe: result.value });
  } catch (error) {
    console.error('Mark as cooked error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle favorite
router.post('/:id/favorite', async (req, res) => {
  try {
    const db = getDB();
    const recipe = await db.collection('recipes').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    const result = await db.collection('recipes').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { isFavorite: !recipe.isFavorite } },
      { returnDocument: 'after' }
    );
    
    res.json({ recipe: result.value });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
