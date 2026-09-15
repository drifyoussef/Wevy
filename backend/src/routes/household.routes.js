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

// Fetch the authenticated user's document (for displayName, etc.)
const getCurrentUser = async (db, uid) => {
  return db.collection('users').findOne({ _id: new ObjectId(uid) });
};

// Set the user's active household
const setUserHousehold = async (db, uid, householdId) => {
  await db.collection('users').updateOne(
    { _id: new ObjectId(uid) },
    { $set: { householdId: householdId ? new ObjectId(householdId) : null, updatedAt: new Date() } }
  );
};

// Create household
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const db = getDB();
    const currentUser = await getCurrentUser(db, req.user.uid);

    const household = {
      name,
      createdBy: req.user.uid,
      inviteCode: generateInviteCode(),
      members: [{
        userId: req.user.uid,
        email: req.user.email,
        displayName: currentUser?.displayName || req.user.email,
        role: 'admin',
        joinedAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('households').insertOne(household);
    household._id = result.insertedId;

    // The creator's active household becomes the new one
    await setUserHousehold(db, req.user.uid, result.insertedId);

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

    const currentUser = await getCurrentUser(db, req.user.uid);

    // Add member
    const newMember = {
      userId: req.user.uid,
      email: req.user.email,
      displayName: currentUser?.displayName || req.user.email,
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

    // Switch the user's active household to the one they just joined
    await setUserHousehold(db, req.user.uid, household._id);

    res.json({ household: result });
  } catch (error) {
    console.error('Join household error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Regenerate invite code (admin only)
router.post('/:id/regenerate-invite', async (req, res) => {
  try {
    const db = getDB();
    const householdId = new ObjectId(req.params.id);

    const household = await db.collection('households').findOne({ _id: householdId });
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const requester = household.members.find(m => m.userId === req.user.uid);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only an admin can regenerate the invite code' });
    }

    const result = await db.collection('households').findOneAndUpdate(
      { _id: householdId },
      { $set: { inviteCode: generateInviteCode(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({ household: result });
  } catch (error) {
    console.error('Regenerate invite error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a member's role (admin only)
router.put('/:id/members/:userId', async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const db = getDB();
    const householdId = new ObjectId(req.params.id);

    const household = await db.collection('households').findOne({ _id: householdId });
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const requester = household.members.find(m => m.userId === req.user.uid);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only an admin can change roles' });
    }

    const result = await db.collection('households').findOneAndUpdate(
      { _id: householdId, 'members.userId': req.params.userId },
      { $set: { 'members.$.role': role, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ household: result });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a member (admin only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const db = getDB();
    const householdId = new ObjectId(req.params.id);
    const targetUserId = req.params.userId;

    const household = await db.collection('households').findOne({ _id: householdId });
    if (!household) {
      return res.status(404).json({ error: 'Household not found' });
    }

    const requester = household.members.find(m => m.userId === req.user.uid);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only an admin can remove members' });
    }

    if (targetUserId === req.user.uid) {
      return res.status(400).json({ error: 'Use the leave endpoint to remove yourself' });
    }

    const result = await db.collection('households').findOneAndUpdate(
      { _id: householdId },
      {
        $pull: { members: { userId: targetUserId } },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    // Clear the removed member's active household if it pointed here
    await db.collection('users').updateOne(
      { _id: new ObjectId(targetUserId), householdId: householdId },
      { $set: { householdId: null, updatedAt: new Date() } }
    );

    res.json({ household: result });
  } catch (error) {
    console.error('Remove member error:', error);
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
    } else {
      // Remove member
      await db.collection('households').updateOne(
        { _id: householdId },
        {
          $pull: { members: { userId: req.user.uid } },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Clear the user's active household if it pointed here
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.user.uid), householdId: householdId },
      { $set: { householdId: null, updatedAt: new Date() } }
    );

    res.json({ message: 'Left household successfully' });
  } catch (error) {
    console.error('Leave household error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
