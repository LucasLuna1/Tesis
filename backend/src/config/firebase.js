const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Configuración simplificada
if (!admin.apps.length) {
  try {
    let firebaseInitialized = false;

    // Opción 1: Intentar usar archivo de credenciales (serviceAccountKey.json)
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'kani-deportes.firebasestorage.app'
      });
      console.log('✅ Firebase inicializado con archivo de credenciales (serviceAccountKey.json)');
      firebaseInitialized = true;
    }

    // Opción 2: Intentar usar variables de entorno si están disponibles
    if (!firebaseInitialized && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'kani-deportes.firebasestorage.app'
      });
      
      console.log('✅ Firebase inicializado con variables de entorno');
      firebaseInitialized = true;
    }

    // Opción 3: Usar Application Default Credentials (para desarrollo local con gcloud)
    if (!firebaseInitialized) {
      admin.initializeApp({
        projectId: 'kani-deportes',
        storageBucket: 'kani-deportes.firebasestorage.app'
      });
      
      console.log('⚠️  Firebase inicializado con Application Default Credentials');
      console.log('⚠️  Si tienes problemas de autenticación, necesitas:');
      console.log('   1. Crear un archivo serviceAccountKey.json en backend/');
      console.log('   2. O configurar las variables de entorno en backend/.env');
      console.log('   Puedes descargar el archivo desde Firebase Console > Project Settings > Service Accounts');
      firebaseInitialized = true;
    }
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    console.error('❌ Detalles:', error);
    throw error; // Lanzar error para que se note el problema
  }
}

let db, storage;
try {
  db = admin.firestore();
  storage = admin.storage();
  console.log('✅ Firestore y Storage inicializados correctamente');
} catch (error) {
  console.error('❌ Error accediendo a Firestore/Storage:', error.message);
  throw error; // Lanzar error para que se note el problema
}

module.exports = { admin, db, storage };