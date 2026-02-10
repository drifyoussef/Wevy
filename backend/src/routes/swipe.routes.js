const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

// Create or get today's swipe session
router.post('/session', async (req, res) => {
  try {
    const { householdId, recipeIds } = req.body;
    const db = getDB();
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if session already exists for today
    let session = await db.collection('swipe_sessions').findOne({
      householdId: new ObjectId(householdId),
      date: today
    });
    
    if (session) {
      return res.json({ session });
    }
    
    // Create new session
    session = {
      householdId: new ObjectId(householdId),
      date: today,
      status: 'active',
      recipes: recipeIds,
      swipes: [],
      matchedRecipeId: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    const result = await db.collection('swipe_sessions').insertOne(session);
    session._id = result.insertedId;
    
    res.status(201).json({ session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active session for household
router.get('/session/:householdId', async (req, res) => {
  try {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    
    const session = await db.collection('swipe_sessions').findOne({
      householdId: new ObjectId(req.params.householdId),
      date: today,
      status: 'active'
    });
    
    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit swipe
router.post('/swipe', async (req, res) => {
  try {
    const { sessionId, recipeId, direction } = req.body;
    const db = getDB();
    
    const swipe = {
      userId: req.user.uid,
      recipeId,
      direction, // 'left' or 'right'
      timestamp: new Date()
    };
    
    const session = await db.collection('swipe_sessions').findOneAndUpdate(
      { _id: new ObjectId(sessionId) },
      { $push: { swipes: swipe } },
      { returnDocument: 'after' }
    );
    
    // Check if all household members have swiped
    const household = await db.collection('households').findOne({
      _id: session.value.householdId
    });
    
    const memberIds = household.members.map(m => m.userId);
    const swipedUserIds = [...new Set(session.value.swipes.map(s => s.userId))];
    
    // Check for matches
    if (direction === 'right') {
      const rightSwipesForRecipe = session.value.swipes.filter(
        s => s.recipeId === recipeId && s.direction === 'right'
      );
      
      // If all members swiped right on this recipe
      if (rightSwipesForRecipe.length === memberIds.length) {
        await db.collection('swipe_sessions').updateOne(
          { _id: new ObjectId(sessionId) },
          { 
            $set: { 
              status: 'matched',
              matchedRecipeId: recipeId
            }
          }
        );
        
        session.value.status = 'matched';
        session.value.matchedRecipeId = recipeId;
      }
    }
    
    res.json({ session: session.value });
  } catch (error) {
    console.error('Submit swipe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session history
router.get('/history/:householdId', async (req, res) => {
  try {
    const db = getDB();
    const sessions = await db.collection('swipe_sessions')
      .find({ 
        householdId: new ObjectId(req.params.householdId),
        status: 'matched'
      })
      .sort({ date: -1 })
      .limit(30)
      .toArray();
    
    res.json({ sessions });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
