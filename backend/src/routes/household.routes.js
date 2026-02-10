const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

// Generate unique invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create household
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const db = getDB();
    
    const household = {
      name,
      createdBy: req.user.uid,
      inviteCode: generateInviteCode(),
      members: [{
        userId: req.user.uid,
        email: req.user.email,
        role: 'admin',
        joinedAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('households').insertOne(household);
    household._id = result.insertedId;
    
    res.status(201).json({ household });
  } catch (error) {
    console.error('Create household error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's households
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const households = await db.collection('households')
      .find({ 'members.userId': req.user.uid })
      .toArray();
    
    res.json({ households });
  } catch (error) {
    console.error('Get households error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get household by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const household = await db.collection('households').findOne({
      _id: new ObjectId(req.params.id),
      'members.userId': req.user.uid
    });
    
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    
    res.json({ household });
  } catch (error) {
    console.error('Get household error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join household with invite code
router.post('/join', async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const db = getDB();
    
    const household = await db.collection('households').findOne({ inviteCode });
    
    if (!household) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    // Check if already a member
    const isMember = household.members.some(m => m.userId === req.user.uid);
    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this household' });
    }
    
    // Add member
    const newMember = {
      userId: req.user.uid,
      email: req.user.email,
      role: 'member',
      joinedAt: new Date()
    };
    
    const result = await db.collection('households').findOneAndUpdate(
      { inviteCode },
      { 
        $push: { members: newMember },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    
    res.json({ household: result.value });
  } catch (error) {
    console.error('Join household error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Leave household
router.delete('/:id/leave', async (req, res) => {
  try {
    const db = getDB();
    const householdId = new ObjectId(req.params.id);
    
    const household = await db.collection('households').findOne({ _id: householdId });
    
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }
    
    // If last member or creator, delete household
    if (household.members.length === 1 || household.createdBy === req.user.uid) {
      await db.collection('households').deleteOne({ _id: householdId });
      return res.json({ message: 'Household deleted' });
    }
    
    // Remove member
    await db.collection('households').updateOne(
      { _id: householdId },
      { 
        $pull: { members: { userId: req.user.uid } },
        $set: { updatedAt: new Date() }
      }
    );
    
    res.json({ message: 'Left household successfully' });
  } catch (error) {
    console.error('Leave household error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
