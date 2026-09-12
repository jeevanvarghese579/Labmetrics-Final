import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth';
import {
  disableNetwork,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyCOk_yef2gRBCdm8FwEgeidK7TrK1Yvcd0',
  authDomain: 'inter-level-progress-manager.firebaseapp.com',
  projectId: 'inter-level-progress-manager',
  storageBucket: 'inter-level-progress-manager.firebasestorage.app',
  messagingSenderId: '379503088311',
  appId: '1:379503088311:web:b37328f071189e18133332',
  measurementId: 'G-Z4VEWBKP3S',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
void setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Hold queued writes until Access Manager has revalidated the current session.
export const firestoreNetworkHeld = disableNetwork(db).catch((error) => {
  console.warn('[LabMetrics Sync] Could not initially pause Firestore networking.', error);
});

export const functions = getFunctions(app, 'us-central1');
