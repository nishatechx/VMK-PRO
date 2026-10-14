// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

// Your web app's Firebase configuration loaded from provisioned config
export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Set Firestore log level to silent to prevent noisy backend connection warnings
try {
  setLogLevel('silent');
} catch {}

// Suppress transient 10-second offline warning in console when offline/in proxy
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const text = args
      .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
      .join(' ');
    if (
      text.includes('Could not reach Cloud Firestore backend') ||
      text.includes('Backend didn\'t respond within 10 seconds')
    ) {
      // Suppress offline mode warning - app runs with persistent local cache and server API
      return;
    }
    originalError.apply(console, args);
  };
}

// Initialize Firestore with force long-polling and multi-tab persistent cache
const databaseId = (firebaseConfigData as Record<string, any>)?.firestoreDatabaseId;

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      firebaseApp,
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      databaseId
    );
  } catch {
    try {
      return initializeFirestore(
        firebaseApp,
        {
          experimentalForceLongPolling: true,
        },
        databaseId
      );
    } catch {
      return databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);
    }
  }
}

export const db: Firestore = createFirestoreInstance();
export const auth: Auth = getAuth(firebaseApp);


