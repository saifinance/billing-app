
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
// The 'firebase' object is globally available from the CDN script
try {
    if (firebase && typeof firebase.initializeApp === 'function') {
        const app = firebase.initializeApp(firebaseConfig); // Initialize the default app
        const db = firebase.firestore(); // Get Firestore instance from the default app

        // You might want to make 'db' accessible to other scripts if they are not in the same immediate scope
        // or pass it around. For simplicity here, we assume firestoreService.js can access it if loaded after.
        // However, a better practice would be to ensure db is explicitly available.
        // For now, firestoreService.js will try to access firebase.firestore() directly.
        console.log("Firebase Initialized successfully in config.js");
    } else {
        console.error("Firebase object or initializeApp function not found. Ensure Firebase SDKs are loaded before config.js.");
    }
} catch (e) {
    console.error("Error initializing Firebase in config.js:", e);
}

