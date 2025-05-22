// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB68jUbHK-r-zs3RBsv8Dfjq05GIlNq6C4",
  authDomain: "billingapp-saifinance.firebaseapp.com",
  projectId: "billingapp-saifinance",
  storageBucket: "billingapp-saifinance.firebasestorage.app",
  messagingSenderId: "47042357714",
  appId: "1:47042357714:web:1d3af7a5f7b19dd119800b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = firebase.firestore();
// const auth = firebase.auth();