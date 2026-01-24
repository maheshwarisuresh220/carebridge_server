// app/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// REPLACE THIS WITH YOUR ACTUAL CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCN0ykRySF_neYycvQghAKY4KrhMSCEB1k",
  authDomain: "carebridge-3c5b9.firebaseapp.com",
  projectId: "carebridge-3c5b9",
  storageBucket: "carebridge-3c5b9.firebasestorage.app",
  messagingSenderId: "139042754767",
  appId: "1:139042754767:web:6b65714bfdeeab638827ba",
  measurementId: "G-4XZZNRZ6D8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);