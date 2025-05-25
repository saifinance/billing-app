
// IMPORTANT NOTE ON API KEY SECURITY:
// The apiKey below is a Firebase Web API key. These keys are designed to be public and are necessary for the Firebase SDK to interact with your Firebase project on the client-side.
// Firebase secures your data primarily through Firebase Security Rules (e.g., in firestore.rules), not by keeping this apiKey secret.
//
// HOWEVER, IT IS CRUCIAL TO:
// 1. Ensure this API key is restricted in the Google Cloud Console to prevent unauthorized use. It should only be allowed to be used from your authorized domains.
// 2. Regularly review the permissions associated with this key in the Google Cloud Console to ensure it only has the minimum necessary access.
// 3. If there's any doubt about previous exposure or if the key had overly permissive settings, consider rotating the key (generate a new one in Firebase console and update it here) and revoking the old one.
//
// The issue regarding an "exposed Google API Key" likely refers to this key. While it's exposed by design for Firebase web apps, the responsibility lies with the project admin to ensure it's properly restricted.

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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // Make sure auth is initialized and