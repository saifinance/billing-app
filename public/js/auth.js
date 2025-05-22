// js/auth.js

function getAuthInstance() {
    // Ensure Firebase app is initialized and auth is available
    if (firebase && firebase.apps.length > 0 && typeof firebase.auth === 'function') {
        return firebase.auth();
    } else {
        console.error("Firebase not initialized or Auth module not available when trying to get Auth instance.");
        // Attempt to initialize if config is available, this is a fallback
        if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function' && typeof firebaseConfig !== 'undefined' && firebase.apps.length === 0) {
            console.warn("Attempting to initialize Firebase from auth.js as it wasn't initialized before.");
            firebase.initializeApp(firebaseConfig);
            if (typeof firebase.auth === 'function') return firebase.auth();
        }
        alert("Authentication service is not available. Please try again later.");
        return null;
    }
}

// Sign Up New User
async function signUpUser(email, password) {
    const auth = getAuthInstance();
    if (!auth) return Promise.reject(new Error("Auth service not available"));
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log("User signed up:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Error signing up:", error.code, error.message);
        // alert(`Signup Error: ${error.message}`); // More specific error handling in app.js
        throw error;
    }
}

// Login Existing User
async function loginUser(email, password) {
    const auth = getAuthInstance();
    if (!auth) return Promise.reject(new Error("Auth service not available"));
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("User logged in:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Error logging in:", error.code, error.message);
        // alert(`Login Error: ${error.message}`); // More specific error handling in app.js
        throw error;
    }
}

// Logout Current User
async function logoutUser() {
    const auth = getAuthInstance();
    if (!auth) return Promise.reject(new Error("Auth service not available"));
    try {
        await auth.signOut();
        console.log("User logged out");
        // Redirect handled by onAuthStateChanged in app.js
    } catch (error) {
        console.error("Error logging out:", error);
        alert(`Logout Error: ${error.message}`);
        throw error;
    }
}

// Check Auth State / Get Current User
function onAuthStateChangedHandler(callback) {
    const auth = getAuthInstance();
    if (!auth) {
        console.warn("Auth service not available for onAuthStateChanged listener.");
        callback(null); // Assume no user if auth isn't ready
        return () => {}; // Return a dummy unsubscribe function
    }
    return auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            callback(user);
        } else {
            // User is signed out.
            callback(null);
        }
    });
}

function getCurrentUser() {
    const auth = getAuthInstance();
    if (!auth) return null;
    return auth.currentUser;
}