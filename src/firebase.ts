import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
   apiKey: "AIzaSyCOk_yef2gRBCdm8FwEgeidK7TrK1Yvcd0",
  authDomain: "inter-level-progress-manager.firebaseapp.com",
  projectId: "inter-level-progress-manager",
  storageBucket: "inter-level-progress-manager.firebasestorage.app",
  messagingSenderId: "379503088311",
  appId: "1:379503088311:web:e2dc87d55f9fc66c133332"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);