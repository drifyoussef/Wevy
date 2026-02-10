const admin = require('firebase-admin');
const path = require('path');

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return admin;
  }

  try {
    // Option 1: Using service account file
    const serviceAccountPath = path.join(__dirname, 'firebase-adminsdk.json');
    
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      console.log('✅ Firebase Admin initialized with service account');
    } catch (fileError) {
      // Option 2: Using environment variables (for production)
      console.warn('⚠️ Service account file not found, using default credentials');
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }

    firebaseInitialized = true;
    return admin;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

module.exports = { initializeFirebase, admin };
