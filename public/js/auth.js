// public/js/auth.js

// --- DOM Element Cache ---
let signinLink, signoutLink, userEmailDisplay, authModal, authModalContent,
    signinForm, signupForm, closeAuthModalBtns,
    signinErrorP, signupErrorP, showSignupFormLink, showSigninFormLink,
    navCreateInvoiceLink, saveInvoiceBtn, mainContentAreas, createNewInvoiceBtnDashboard;

function cacheAuthDOMElements() {
    signinLink = document.getElementById('signin-link');
    signoutLink = document.getElementById('signout-link');
    userEmailDisplay = document.getElementById('user-email-display');
    authModal = document.getElementById('auth-modal');
    authModalContent = document.getElementById('auth-modal-content');
    signinForm = document.getElementById('signin-form');
    signupForm = document.getElementById('signup-form');
    closeAuthModalBtns = document.querySelectorAll('.btn-close-modal');
    signinErrorP = document.getElementById('signin-error');
    signupErrorP = document.getElementById('signup-error');
    showSignupFormLink = document.getElementById('show-signup-form-link');
    showSigninFormLink = document.getElementById('show-signin-form-link');
    navCreateInvoiceLink = document.getElementById('nav-create-invoice');
    saveInvoiceBtn = document.getElementById('save-invoice-btn');
    mainContentAreas = document.querySelectorAll('.main-content-area');
    createNewInvoiceBtnDashboard = document.getElementById('btn-create-new-invoice'); // Button on dashboard
}

// --- UI Update Logic ---
async function updateAuthUI(user, isInitialLoad = false) { // isInitialLoad is less critical for flashing now
    console.log(`updateAuthUI called. Path: ${window.location.pathname}, User: ${user ? user.uid : 'None'}, isInitialLoad: ${isInitialLoad}`);
    if (!signinLink) cacheAuthDOMElements(); // Ensure elements are cached if not already

    // Do NOT make mainContentAreas globally visible here. Visibility is decided below.

    if (user) {
        console.log('updateAuthUI: User is present. Checking admin status...');
        const adminStatus = await checkAdminStatus(user);

        if (!adminStatus) {
            console.log('updateAuthUI: User is not admin. Signing out, hiding content, showing modal.');
            if (mainContentAreas) mainContentAreas.forEach(area => area.style.visibility = 'hidden');
            // Note: signOut will trigger onAuthStateChanged, which will call updateAuthUI again with user=null.
            // So, opening modal here might be redundant but ensures it's shown if signOut is slow or alert blocks.
            if (authModal && typeof openAuthModal === 'function') openAuthModal('signin'); 
            await firebase.auth().signOut(); 
            alert('Access denied. Only admin users can access this application.');
            return; // Exit to prevent further UI changes for this non-admin state
        }
        
        console.log('updateAuthUI: User is admin. Showing content, hiding modal.');
        if (mainContentAreas) mainContentAreas.forEach(area => area.style.visibility = 'visible');
        if (authModal && typeof closeAuthModal === 'function') closeAuthModal();

        // Standard UI updates for logged-in admin user
        if (userEmailDisplay) { userEmailDisplay.textContent = user.email; userEmailDisplay.style.display = 'inline'; }
        if (signinLink) signinLink.style.display = 'none';
        if (signoutLink) signoutLink.style.display = 'inline';
        if (navCreateInvoiceLink) navCreateInvoiceLink.style.display = 'inline-block';
        if (createNewInvoiceBtnDashboard) createNewInvoiceBtnDashboard.style.display = 'inline-flex';
        if (saveInvoiceBtn && window.location.pathname.includes('create-invoice.html')) {
            saveInvoiceBtn.disabled = false;
            saveInvoiceBtn.innerHTML = '<i class="fas fa-save"></i> ' + (document.getElementById('invoice-id')?.value ? 'Update Invoice' : 'Save Invoice');
        }

    } else { // No user (definitively from onAuthStateChanged or after signOut)
        console.log('updateAuthUI: No user. Hiding content.');
        if (mainContentAreas) mainContentAreas.forEach(area => area.style.visibility = 'hidden');

        // Standard UI updates for logged-out user
        if (userEmailDisplay) userEmailDisplay.style.display = 'none';
        if (signinLink) signinLink.style.display = 'inline';
        if (signoutLink) signoutLink.style.display = 'none';
        if (navCreateInvoiceLink) navCreateInvoiceLink.style.display = 'inline-block'; // Or hide if not relevant when logged out
        if (createNewInvoiceBtnDashboard) createNewInvoiceBtnDashboard.style.display = 'none';
        if (saveInvoiceBtn && window.location.pathname.includes('create-invoice.html')) {
            saveInvoiceBtn.disabled = true;
            saveInvoiceBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Save';
        }

        const currentPath = window.location.pathname;
        const isPotentiallyProtectedPage = currentPath.includes('create-invoice.html') ||
                                       currentPath.includes('view-invoice.html') ||
                                       currentPath.includes('index.html') || 
                                       currentPath === '/' || currentPath.endsWith('/billing-app/') || currentPath.endsWith('/billing-app');
        
        console.log(`updateAuthUI: No user. Path: ${currentPath}, isPotentiallyProtectedPage: ${isPotentiallyProtectedPage}`);
        if (isPotentiallyProtectedPage) {
            console.log('updateAuthUI: No user on protected page. Opening auth modal.');
            if (typeof openAuthModal === 'function') openAuthModal('signin');
        } else {
            // If on a public page and somehow modal is open, close it.
            if (authModal && typeof closeAuthModal === 'function') closeAuthModal(); 
        }
    }
}

// --- Admin Verification ---
async function checkAdminStatus(user) {
    if (!user) return false;
    try {
        // Pass true to force a refresh of the token and get the latest claims.
        const idTokenResult = await user.getIdTokenResult(true);
        console.log('User claims from ID token:', idTokenResult.claims);
        return idTokenResult.claims.admin === true;
    } catch (error) {
        console.error('Error getting user claims / checking admin status:', error);
        return false;
    }
}

// --- Modal and Form Switching ---
function openAuthModal(showForm = 'signin') {
    if (!authModal || !signinForm || !signupForm) {
        console.error('Auth modal or forms not found in DOM');
        return;
    }
    authModal.style.display = 'flex';
    if (showForm === 'signup') {
        signupForm.style.display = 'block';
        signinForm.style.display = 'none';
    } else {
        signinForm.style.display = 'block';
        signupForm.style.display = 'none';
    }
    if (signinErrorP) signinErrorP.textContent = '';
    if (signupErrorP) signupErrorP.textContent = '';
}

function closeAuthModal() {
    if (authModal) {
        authModal.style.display = 'none';
    }
    if (signinErrorP) signinErrorP.textContent = '';
    if (signupErrorP) signupErrorP.textContent = '';
}

// --- Firebase Auth Actions ---
async function handleSignIn(e) {
    e.preventDefault();
    if (!signinErrorP || !firebase.auth) return;
    signinErrorP.textContent = '';
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const submitButton = signinForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing In...`;
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        if (signinForm) signinForm.reset();
    } catch (error) {
        console.error("Sign in error:", error);
        signinErrorP.textContent = error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    if (!signupErrorP || !firebase.auth) return;
    signupErrorP.textContent = '';
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing Up...';

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log('User created:', userCredential.user.uid);

        // The setAdminClaim Cloud Function will be triggered on user creation.
        // It will handle creating a user document in Firestore for the first admin.
        // No need for client to write to /users collection here, as it would fail for non-admins.

        if (signupForm) signupForm.reset();
        openAuthModal('signin'); // Switch to sign-in form
        alert('Account created successfully! Please sign in.');

    } catch (error) {
        console.error("Sign up error:", error);
        // Display more user-friendly messages for common errors
        if (error.code === 'auth/email-already-in-use') {
            signupErrorP.textContent = 'This email address is already in use. Please try a different email or sign in.';
        } else if (error.code === 'auth/weak-password') {
            signupErrorP.textContent = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
        } else if (error.code === 'auth/invalid-email') {
            signupErrorP.textContent = 'The email address is not valid. Please enter a correct email.';
        } else {
            signupErrorP.textContent = error.message; // Fallback to default Firebase error
        }
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

async function handleSignOut(e) {
    e.preventDefault();
    if (!firebase.auth) return;
    try {
        await firebase.auth().signOut();
        console.log("User signed out");
        // onAuthStateChanged will update UI.
        // If on dashboard, it will show "please sign in".
        // If on create/view, it will also update and potentially show modal via isInitialLoad logic if page re-triggered
        const path = window.location.pathname;
        if (path.includes('create-invoice.html') || path.includes('view-invoice.html')) {
            window.location.href = 'index.html'; // Redirect to dashboard which will then prompt login if needed
        }

    } catch (error) {
        console.error("Sign out error:", error);
        alert("Error signing out: " + error.message);
    }
}

// --- Main Auth Initialization ---
function initAuth() {
    console.log('initAuth: Initializing authentication. Path:', window.location.pathname);
    cacheAuthDOMElements(); // Cache DOM elements first

    // Initially, hide main content and auth modal to prevent flash.
    // CSS can also be used for a cleaner initial hidden state.
    if (mainContentAreas) mainContentAreas.forEach(area => area.style.visibility = 'hidden');
    if (authModal && typeof closeAuthModal === 'function') {
        // Ensure modal is closed and hidden, closeAuthModal typically handles display:none
        closeAuthModal(); 
    } else if (authModal) {
        authModal.style.display = 'none'; // Fallback if closeAuthModal isn't ready/defined
    }

    if (!firebase.auth) {
        console.error("Firebase Auth SDK not loaded!");
        // If Firebase isn't loaded, we might want to show an error message instead of hiding everything.
        // For now, content remains hidden as per above.
        const body = document.querySelector('body');
        if (body) body.innerHTML = '<p style="text-align:center;color:red;margin-top:50px;">Error: Firebase SDK not loaded. App cannot initialize.</p>';
        return;
    }
    
    // DO NOT call updateAuthUI(null, true) here. 
    // onAuthStateChanged will make the first call to updateAuthUI with the actual user state.

    firebase.auth().onAuthStateChanged(user => {
        console.log(`onAuthStateChanged: Auth state changed. User: ${user ? user.uid : 'None'}, Path: ${window.location.pathname}`);
        // Pass false for isInitialLoad, as this is the definitive state from Firebase.
        updateAuthUI(user, false); 

        const path = window.location.pathname;
        if (!user) { // If user logs out or session expires
            const tableBody = document.getElementById('invoices-table-body');
            if (tableBody && (path.includes('index.html') || path === '/' || path.endsWith('/billing-app/') || path.endsWith('/billing-app'))) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Please sign in to view invoices.</td></tr>';
            }
            const invoiceViewArea = document.getElementById('invoice-view-area');
             if (invoiceViewArea && path.includes('view-invoice.html')) {
                invoiceViewArea.innerHTML = '<p style="text-align:center; color:red;">Please sign in to view this invoice.</p>';
            }
        }

        // Trigger page-specific logic
        if (path.includes('index.html') || path === '/' || path.endsWith('/billing-app/') || path.endsWith('/billing-app')) {
            if (typeof loadInvoicesDashboard === 'function') loadInvoicesDashboard();
        } else if (path.includes('create-invoice.html')) {
            if (typeof initializeInvoiceForm === 'function') initializeInvoiceForm();
        } else if (path.includes('view-invoice.html')) {
            if (typeof initializeViewInvoicePage === 'function') initializeViewInvoicePage();
        }
    });

    if (signinLink) signinLink.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('signin'); });
    if (showSignupFormLink) showSignupFormLink.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('signup'); });
    if (showSigninFormLink) showSigninFormLink.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('signin'); });
    if (closeAuthModalBtns) closeAuthModalBtns.forEach(btn => btn.addEventListener('click', closeAuthModal));
    if (signinForm) signinForm.addEventListener('submit', handleSignIn);
    if (signupForm) signupForm.addEventListener('submit', handleSignUp);
    if (signoutLink) signoutLink.addEventListener('click', handleSignOut);
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initAuth); }
else { initAuth(); }