import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAIivPA6RNBLJggLJsvkP-IdBVRlmIL1-s",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "kani-deportes.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "kani-deportes",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "kani-deportes.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "272963219973",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:272963219973:web:df6a049e2ab9f21735e26c"
};

// Configuración temporal para desarrollo - Railway Backend
let app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // 🔐 Configurar persistencia LOCAL: la sesión persiste al recargar
  // El cierre de sesión al cerrar pestaña se maneja en AuthContext con beforeunload
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.warn('⚠️ No se pudo configurar persistencia local:', error);
    });
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  // 🚀 OPTIMIZACIÓN: Activar persistencia offline de Firestore
  // Esto permite que los datos se guarden localmente y funcionen sin conexión
  if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          // Múltiples tabs abiertos, solo una puede tener persistencia
          console.warn('⚠️ Persistencia no habilitada: múltiples tabs activos');
          // Intentar con persistencia de tab único
          enableIndexedDbPersistence(db)
            .catch((e) => console.warn('⚠️ No se pudo activar persistencia:', e));
        } else if (err.code === 'unimplemented') {
          console.warn('⚠️ Persistencia no soportada en este navegador');
        }
      });
  }
  
  // Inicializar FCM solo si está disponible (navegador)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (error: any) {
  console.warn('Firebase no configurado, usando modo desarrollo:', error.message);
  
  // Mock de Firebase para desarrollo
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'temp-user' } } as any),
    signOut: () => Promise.resolve(),
    onAuthStateChanged: (callback: any) => callback(null)
  } as any;
  
  db = {
    collection: () => ({
      add: () => Promise.resolve({ id: 'temp-id' }),
      get: () => Promise.resolve({ docs: [] }),
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      })
    })
  } as any;
  
  storage = {
    ref: () => ({
      put: () => Promise.resolve(),
      getDownloadURL: () => Promise.resolve('temp-url')
    })
  } as any;
  
  messaging = null;
  app = null;
}

// Exportar las variables
export { auth, db, storage, messaging, getToken, onMessage };
export default app;
