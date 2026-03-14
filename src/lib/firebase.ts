import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVpsitUkfwXj93u-02q808SUeZXtiiPJA",
  authDomain: "voice-u-p.firebaseapp.com",
  projectId: "voice-u-p",
  storageBucket: "voice-u-p.firebasestorage.app",
  messagingSenderId: "52578297855",
  appId: "1:52578297855:web:72db0fb7e8a1d67275e9ca",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
