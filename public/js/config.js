
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
try {
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
        if (firebase.apps.length === 0) { // Check if Firebase hasn't been initialized yet
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase Initialized successfully in config.js");
        } else {
            // console.log("Firebase already initialized."); // Default app already exists
        }
    } else {
        console.error("Firebase object or initializeApp function not found. Ensure Firebase SDKs (firebase-app.js) are loaded before config.js.");
    }
} catch (e) {
    console.error("Error initializing Firebase in config.js:", e);
}