import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️ IMPORTANT: Add your Firebase credentials here
// Get these from your Firebase Console: https://console.firebase.google.com/
// Project Settings > General > Your apps > SDK setup and configuration

const firebaseConfig = {
    apiKey: "AIzaSyArxXmWSJI3PJOZBne0YB6brPrEP1LSshE",
    authDomain: "nav-cu-43d83.firebaseapp.com",
    projectId: "nav-cu-43d83",
    storageBucket: "nav-cu-43d83.firebasestorage.app",
    messagingSenderId: "247457206762",
    appId: "1:247457206762:web:c02af99975a45c8cd6a293",
    measurementId: "G-6VK5NB1XJF"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;

