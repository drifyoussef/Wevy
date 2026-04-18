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
      householdId: req.params.householdId,
      status: 'active'
    });
    
    if (!list) {
      list = {
        householdId: req.params.householdId,
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
        householdId: req.params.householdId,
        status: 'active'
      },
      { 
        $push: { items: { $each: newItems } },
        $addToSet: { recipeIds: recipeId },
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          householdId: req.params.householdId,
          status: 'active',
          recipeIds: [recipeId],
          createdAt: new Date()
        }
      },
      { returnDocument: 'after', upsert: true }
    );
    
    console.log('Add recipe result:', result);
    
    if (!result?.value) {
      console.error('No value in result:', result);
      return res.status(500).json({ error: 'Failed to add recipe to list' });
    }
    
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
        householdId: req.params.householdId,
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
        householdId: req.params.householdId,
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
        householdId: req.params.householdId,
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

// Add manual item to shopping list
router.post('/:householdId/add-item', async (req, res) => {
  try {
    const { name, quantity, unit, category } = req.body;
    
    if (!name || !quantity) {
      return res.status(400).json({ error: 'Name and quantity are required' });
    }
    
    const db = getDB();
    
    const newItem = {
      id: new ObjectId().toString(),
      name,
      quantity: parseFloat(quantity),
      unit: unit || 'pcs',
      category: category || 'other',
      isChecked: false,
      addedManually: true,
      createdAt: new Date()
    };
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: req.params.householdId,
        status: 'active'
      },
      { 
        $push: { items: newItem },
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          householdId: req.params.householdId,
          status: 'active',
          recipeIds: [],
          createdAt: new Date()
        }
      },
      { returnDocument: 'after', upsert: true }
    );
    
    console.log('Add item result:', result);
    
    // Get the updated shopping list
    const shoppingList = await db.collection('shopping_lists').findOne({
      householdId: req.params.householdId,
      status: 'active'
    });
    
    if (!shoppingList) {
      console.error('Failed to retrieve shopping list after add');
      return res.status(500).json({ error: 'Failed to add item' });
    }
    
    res.json({ shoppingList });
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete item from shopping list
router.delete('/:householdId/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const db = getDB();
    
    console.log('Delete item request:', { itemId, householdId: req.params.householdId });
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: req.params.householdId,
        status: 'active'
      },
      { 
        $pull: { items: { id: itemId } },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    
    console.log('Delete item result:', result);
    
    // Get the updated shopping list
    const shoppingList = await db.collection('shopping_lists').findOne({
      householdId: req.params.householdId,
      status: 'active'
    });
    
    if (!shoppingList) {
      console.error('Failed to retrieve shopping list after delete');
      return res.status(500).json({ error: 'Failed to delete item' });
    }
    
    res.json({ shoppingList });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle item checked status
router.patch('/:householdId/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { isChecked } = req.body;
    const db = getDB();
    
    console.log('Toggle item request:', { itemId, isChecked, householdId: req.params.householdId });
    
    const result = await db.collection('shopping_lists').findOneAndUpdate(
      { 
        householdId: req.params.householdId,
        status: 'active',
        'items.id': itemId
      },
      { 
        $set: { 
          'items.$.isChecked': isChecked,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    
    console.log('Toggle item result:', result);
    
    // Get the updated shopping list
    const shoppingList = await db.collection('shopping_lists').findOne({
      householdId: req.params.householdId,
      status: 'active'
    });
    
    if (!shoppingList) {
      console.error('Failed to retrieve shopping list after toggle');
      return res.status(500).json({ error: 'Failed to toggle item' });
    }
    
    res.json({ shoppingList });
  } catch (error) {
    console.error('Toggle item error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
