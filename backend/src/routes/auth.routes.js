const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const db = getDB();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a default household for the user
    const household = {
      name: `${displayName}'s Household`,
      createdBy: null, // Will be updated after user creation
      createdAt: new Date(),
      updatedAt: new Date(),
      members: []
    };
    
    const householdResult = await db.collection('households').insertOne(household);
    const householdId = householdResult.insertedId;
    
    // Create user with householdId
    const user = {
      email,
      password: hashedPassword,
      displayName,
      householdId,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
    
    // Update household with user info
    await db.collection('households').updateOne(
      { _id: householdId },
      { 
        $set: { 
          createdBy: user._id,
          members: [{
            userId: user._id,
            displayName: user.displayName,
            role: 'admin',
            joinedAt: new Date()
          }]
        }
      }
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'wevy_secret',
      { expiresIn: '30d' }
    );
    
    // Remove password from response and map _id to id
    delete user.password;
    const userResponse = {
      ...user,
      id: user._id.toString(),
      householdId: user.householdId.toString()
    };
    delete userResponse._id;
    
    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();
    
    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'wevy_secret',
      { expiresIn: '30d' }
    );
    
    // Remove password from response and map _id to id
    delete user.password;
    const userResponse = {
      ...user,
      id: user._id.toString(),
      householdId: user.householdId ? user.householdId.toString() : null
    };
    delete userResponse._id;
    
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.uid) },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Map _id to id
    const userResponse = {
      ...user,
      id: user._id.toString(),
      householdId: user.householdId ? user.householdId.toString() : null
    };
    delete userResponse._id;
    
    res.json({ user: userResponse });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { displayName, avatar } = req.body;
    const db = getDB();
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (displayName) updateData.displayName = displayName;
    if (avatar) updateData.avatar = avatar;
    
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.user.uid) },
      { $set: updateData },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    
    // Map _id to id
    const userResponse = {
      ...result.value,
      id: result.value._id.toString(),
      householdId: result.value.householdId ? result.value.householdId.toString() : null
    };
    delete userResponse._id;
    
    res.json({ user: userResponse });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
