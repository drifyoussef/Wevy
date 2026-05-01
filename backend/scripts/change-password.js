const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wevy';
const EMAIL = 'youssef.drif1@outlook.com';
const NEW_PASSWORD = 'Test123';
const DB_NAME = 'wevy'; // Database name

async function changePassword() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    console.log(`📍 URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    // Use the wevy database
    const db = client.db(DB_NAME);
    
    console.log(`📚 Using database: ${DB_NAME}`);
    
    // Find user
    console.log(`\n🔍 Looking for user with email: ${EMAIL}`);
    const user = await db.collection('users').findOne({ email: EMAIL });
    
    if (!user) {
      console.error(`❌ User not found with email: ${EMAIL}`);
      console.log('\n📋 Users in database:');
      const users = await db.collection('users').find({}).toArray();
      users.forEach(u => {
        console.log(`   - ${u.email} (${u.displayName})`);
      });
      return;
    }
    
    console.log(`✅ User found: ${user.displayName}`);
    console.log(`   User ID: ${user._id}`);
    
    // Hash new password
    console.log(`\n🔐 Hashing password: "${NEW_PASSWORD}"`);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    console.log(`✅ Password hashed`);
    
    // Update password
    console.log(`\n📝 Updating password in database...`);
    const result = await db.collection('users').updateOne(
      { email: EMAIL },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.modifiedCount === 1) {
      console.log(`✅ Password updated successfully!`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📧 Email: ${EMAIL}`);
      console.log(`🔐 New Password: ${NEW_PASSWORD}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    } else {
      console.error(`❌ Failed to update password - modified count: ${result.modifiedCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

changePassword();
