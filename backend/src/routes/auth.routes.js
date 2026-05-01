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

// Change password
router.post('/change-password', authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const db = getDB();
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Find user
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.uid) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.user.uid) },
      { $set: { password: hashedPassword, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    
    // Map _id to id
    const userResponse = {
      ...result.value,
      id: result.value._id.toString(),
      householdId: result.value.householdId ? result.value.householdId.toString() : null
    };
    delete userResponse._id;
    
    res.json({ message: 'Password changed successfully', user: userResponse });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('[forgot-password] Request received for email:', email);
    
    const db = getDB();
    
    // Validate input
    if (!email) {
      console.log('[forgot-password] Email not provided');
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user
    console.log('[forgot-password] Checking if user exists...');
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists
      console.log('[forgot-password] User not found, returning generic response:', email);
      return res.status(200).json({ message: 'If the email exists, a reset code has been sent' });
    }
    
    console.log('[forgot-password] User found, generating reset code...');
    
    // Generate reset code (6 digits)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('[forgot-password] Generated reset code:', resetCode, 'for email:', email);
    
    // Store reset code with expiration (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    console.log('[forgot-password] Storing reset code, expires at:', expiresAt);
    
    await db.collection('password_resets').updateOne(
      { email },
      {
        $set: {
          email,
          code: resetCode,
          expiresAt,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log(`\n🔐 PASSWORD RESET CODE FOR ${email}: ${resetCode}\n`);
    console.log('[forgot-password] Reset code stored successfully');
    
    res.json({ message: 'Reset code sent to your email' });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify reset code and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    console.log(`[reset-password] Request received for email: ${email}`);
    
    const db = getDB();
    
    // Validate input
    if (!email || !code || !newPassword) {
      console.log('[reset-password] Validation failed: missing fields');
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }
    
    if (newPassword.length < 6) {
      console.log('[reset-password] Validation failed: password too short');
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Find and verify reset code
    console.log('[reset-password] Looking for password reset record...');
    const resetRecord = await db.collection('password_resets').findOne({ email });
    if (!resetRecord) {
      console.log('[reset-password] No reset record found for email:', email);
      return res.status(400).json({ error: 'No password reset request found' });
    }
    
    console.log('[reset-password] Reset record found, verifying code...');
    if (resetRecord.code !== code) {
      console.log('[reset-password] Invalid code. Expected:', resetRecord.code, 'Received:', code);
      return res.status(400).json({ error: 'Invalid reset code' });
    }
    
    if (new Date() > resetRecord.expiresAt) {
      console.log('[reset-password] Reset code expired');
      return res.status(400).json({ error: 'Reset code has expired' });
    }
    
    // Find user
    console.log('[reset-password] Finding user with email:', email);
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      console.log('[reset-password] User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password
    console.log('[reset-password] Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    console.log('[reset-password] Updating password in database...');
    const result = await db.collection('users').findOneAndUpdate(
      { email },
      { $set: { password: hashedPassword, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    
    if (!result.value) {
      console.log('[reset-password] Failed to update password - no result returned');
      return res.status(404).json({ error: 'Failed to update password' });
    }
    
    console.log('[reset-password] Password updated successfully');
    
    // Delete reset code
    console.log('[reset-password] Deleting reset code...');
    await db.collection('password_resets').deleteOne({ email });
    
    // Map _id to id
    const userResponse = {
      ...result.value,
      id: result.value._id.toString(),
      householdId: result.value.householdId ? result.value.householdId.toString() : null
    };
    delete userResponse._id;
    
    console.log('[reset-password] Sending success response');
    res.json({ message: 'Password reset successfully', user: userResponse });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
