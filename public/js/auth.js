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
function updateAuthUI(user, isInitialLoad = false) {
    if (!signinLink) cacheAuthDOMElements();

    mainContentAreas.forEach(area => area.style.visibility = 'visible');

    if (user) {
        if (userEmailDisplay) { userEmailDisplay.textContent = user.email; userEmailDisplay.style.display = 'inline'; }
        if (signinLink) signinLink.style.display = 'none';
        if (signoutLink) signoutLink.style.display = 'inline';
        if (authModal && authModal.style.display !== 'none') closeAuthModal();
        if (navCreateInvoiceLink) navCreateInvoiceLink.style.display = 'inline-block';
        if (createNewInvoiceBtnDashboard) createNewInvoiceBtnDashboard.style.display = 'inline-flex';


        if (saveInvoiceBtn && window.location.pathname.includes('create-invoice.html')) {
            saveInvoiceBtn.disabled = false;
            saveInvoiceBtn.innerHTML = '<i class="fas fa-save"></i> ' + (document.getElementById('invoice-id')?.value ? 'Update Invoice' : 'Save Invoice');
        }
    } else {
        if (userEmailDisplay) userEmailDisplay.style.display = 'none';
        if (signinLink) signinLink.style.display = 'inline';
        if (signoutLink) signoutLink.style.display = 'none';
        if (createNewInvoiceBtnDashboard) createNewInvoiceBtnDashboard.style.display = 'none'; // Hide if not logged in


        const currentPath = window.location.pathname;
        // Show modal immediately if on a page that requires auth and it's the initial check
        const isPotentiallyProtectedPage = currentPath.includes('create-invoice.html') ||
                                       currentPath.includes('view-invoice.html') ||
                                       currentPath.includes('index.html') || // Dashboard also requires login to see invoices
                                       currentPath === '/' || currentPath.endsWith('/billing-app/') || currentPath.endsWith('/billing-app');


        if (isPotentiallyProtectedPage && isInitialLoad) {
            openAuthModal('signin');
        }

        if (saveInvoiceBtn && currentPath.includes('create-invoice.html')) {
            saveInvoiceBtn.disabled = true;
            saveInvoiceBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Save';
        }
        if (navCreateInvoiceLink) navCreateInvoiceLink.style.display = 'inline-block'; // Keep nav link visible
    }
}

// --- Modal and Form Switching ---
function openAuthModal(showForm = 'signin') {
    if (!authModal || !signinForm || !signupForm) cacheAuthDOMElements();
    if (authModal) authModal.style.display = 'flex';
    if (showForm === 'signin') {
        if (signupForm) signupForm.style.display = 'none';
        if (signinForm) signinForm.style.display = 'block';
    } else {
        if (signinForm) signinForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
    }
    if (signinErrorP) signinErrorP.textContent = '';
    if (signupErrorP) signupErrorP.textContent = '';
}

function closeAuthModal() {
    if (!authModal) cacheAuthDOMElements();
    if (authModal) authModal.style.display = 'none';
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
    const password = document.getElementById('signup-password').value; // Assuming confirm password logic is separate or not critical path for this example
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    if (password.length < 6) { signupErrorP.textContent = "Password should be at least 6 characters."; return; }
    submitButton.disabled = true;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing Up...`;
    try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        if (signupForm) signupForm.reset();
        openAuthModal('signin'); // Switch to sign-in after successful signup
    } catch (error) {
        console.error("Sign up error:", error);
        signupErrorP.textContent = error.message;
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
    if (!firebase.auth) {
        console.error("Firebase Auth SDK not loaded!");
        document.querySelectorAll('.main-content-area').forEach(area => area.style.visibility = 'visible');
        return;
    }
    cacheAuthDOMElements();
    updateAuthUI(null, true); // Initial UI: assume logged out, pass true for isInitialLoad

    firebase.auth().onAuthStateChanged(user => {
        console.log("Auth state changed. User:", user ? user.uid : 'None');
        updateAuthUI(user, false);

        const path = window.location.pathname;
        if (!user) { // If user logs out or session expires
            const tableBody = document.getElementById('invoices-table-body');
            if (tableBody && (path.includes('index.html') || path === '/' || path.endsWith('/billing-app/'))) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Please sign in to view invoices.</td></tr>';
            }
            const invoiceViewArea = document.getElementById('invoice-view-area');
             if (invoiceViewArea && path.includes('view-invoice.html')) {
                invoiceViewArea.innerHTML = '<p style="text-align:center; color:red;">Please sign in to view this invoice.</p>';
            }
            // For create-invoice.html, save button is disabled by updateAuthUI
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