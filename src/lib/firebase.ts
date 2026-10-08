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

// Set Firestore log level to error to prevent noisy 10-second backend connection warnings
try {
  setLogLevel('error');
} catch {}

// Initialize Firestore with auto-detect long-polling and multi-tab persistent cache
const databaseId = (firebaseConfigData as Record<string, any>)?.firestoreDatabaseId;

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      firebaseApp,
      {
        experimentalAutoDetectLongPolling: true,
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
          experimentalAutoDetectLongPolling: true,
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


