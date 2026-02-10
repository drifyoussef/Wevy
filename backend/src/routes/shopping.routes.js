const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

// Get or create active shopping list
router.get('/:householdId', async (req, res) => {
  try {
    const db = getDB();
    
    let list = await db.collection('shopping_lists').findOne({
      householdId: new ObjectId(req.params.householdId),
      status: 'active'
    });
    
    if (!list) {
      list = {
        householdId: new ObjectId(req.params.householdId),
        items: [],
        recipeIds: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('shopping_lists').insertOne(list);
      list._id = result.insertedId;
    }
    
    res.json({ shoppingList: list });
  } catch (error) {
    console.error('Get shopping list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add recipe to shopping list
router.post('/:householdId/add-recipe', async (req, res) => {
  try {
    const { recipeId } = req.body;
    const db = getDB();
    
    const recipe = await db.collection('recipes').findOne({
      _id: new ObjectId(recipeId)
    });
    
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Convert ingredients to shopping list items
    const newItems = recipe.ingredients.map(ing => ({
      id: new ObjectId().toString(),
      name: ing.name || ing.item,
      quantity: ing.quantity,
      unit: ing.unit,
      checked: false,
      recipeId: recipeId,
      recipeName: recipe.title
    }));
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: new ObjectId(req.params.householdId),
        status: 'active'
      },
      { 
        $push: { items: { $each: newItems } },
        $addToSet: { recipeIds: recipeId },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after', upsert: true }
    );
    
    res.json({ shoppingList: result.value });
  } catch (error) {
    console.error('Add recipe to list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update shopping list items
router.put('/:householdId', async (req, res) => {
  try {
    const { items } = req.body;
    const db = getDB();
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: new ObjectId(req.params.householdId),
        status: 'active'
      },
      { 
        $set: { 
          items,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    
    res.json({ shoppingList: result.value });
  } catch (error) {
    console.error('Update shopping list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete shopping list
router.post('/:householdId/complete', async (req, res) => {
  try {
    const db = getDB();
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: new ObjectId(req.params.householdId),
        status: 'active'
      },
      { 
        $set: { 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    
    res.json({ shoppingList: result.value });
  } catch (error) {
    console.error('Complete shopping list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear shopping list
router.delete('/:householdId/clear', async (req, res) => {
  try {
    const db = getDB();
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: new ObjectId(req.params.householdId),
        status: 'active'
      },
      { 
        $set: { 
          items: [],
          recipeIds: [],
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    
    res.json({ shoppingList: result.value });
  } catch (error) {
    console.error('Clear shopping list error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
