// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const path = window.location.pathname;
    let currentUser = null; // To store the logged-in user object

    // --- DOM Elements ---
    const mainContent = document.getElementById('main-content');
    const userEmailDisplay = document.getElementById('user-email-display');
    const logoutButton = document.getElementById('logout-btn');

    // Login/Signup page specific elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginFormSection = document.getElementById('login-form-section');
    const signupFormSection = document.getElementById('signup-form-section');
    const authErrorDisplay = document.getElementById('auth-error');

    // Invoice form elements
    const invoiceForm = document.getElementById('invoice-form');
    let itemLinesContainer = document.getElementById('invoice-item-lines'); // Initialize if on create page
    const addItemBtn = document.getElementById('add-item-btn');
    const applyGstCheckbox = document.getElementById('apply-gst');
    const gstRateInput = document.getElementById('gst-rate');

    // Dashboard elements
    const invoicesTableBody = document.getElementById('invoices-table-body');

    // View Invoice elements
    const printInvoiceBtn = document.getElementById('print-invoice-btn');


    // --- Authentication State Change Listener ---
    const unsubscribeAuth = onAuthStateChangedHandler(user => {
        if (user) {
            currentUser = user;
            console.log("User is logged in:", currentUser.uid, currentUser.email);
            if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
            if (logoutButton) logoutButton.style.display = 'inline-block';

            if (path.includes('login.html')) {
                window.location.href = 'index.html'; // Redirect from login if already logged in
            } else {
                if(mainContent) mainContent.style.display = 'block'; // Show content on protected pages
                initializePageBasedOnPath(); // Initialize page specific content
            }
        } else {
            currentUser = null;
            console.log("User is logged out.");
            if (userEmailDisplay) userEmailDisplay.textContent = '';
            if (logoutButton) logoutButton.style.display = 'none';

            const protectedPages = ['index.html', 'create-invoice.html', 'view-invoice.html'];
            if (protectedPages.some(p => path.includes(p) || (path === '/' && p === 'index.html'))) {
                window.location.href = 'login.html'; // Redirect to login if on a protected page
            } else {
                 if (mainContent && !path.includes('login.html')) mainContent.style.display = 'none'; // Hide content if not login page
            }
        }
        setActiveNavLink();
    });

    function setActiveNavLink() {
         const navLinks = document.querySelectorAll('.app-nav .nav-link');
         navLinks.forEach(link => {
             link.classList.remove('active');
             if (path.includes(link.dataset.page) || (path === '/' && link.dataset.page === 'index')) {
                 link.classList.add('active');
             }
         });
    }


    function initializePageBasedOnPath() {
        if (path.includes('index.html') || path === '/') {
            if (invoicesTableBody) loadInvoicesDashboard();
        } else if (path.includes('create-invoice.html')) {
            itemLinesContainer = document.getElementById('invoice-item-lines'); // Ensure it's re-assigned
            initializeInvoiceFormElements();
            const urlParams = new URLSearchParams(window.location.search);
            const invoiceIdToEdit = urlParams.get('edit');
            if (invoiceIdToEdit) {
                loadInvoiceForEditing(invoiceIdToEdit);
            } else {
                populateNewInvoiceDetails();
            }
        } else if (path.includes('view-invoice.html')) {
            loadInvoiceForViewing();
            if (printInvoiceBtn) {
                printInvoiceBtn.addEventListener('click', () => window.print());
            }
        }
    }


    // --- Event Listeners ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await logoutUser();
                // onAuthStateChanged will handle redirect
            } catch (error) {
                console.error("Logout failed directly:", error);
            }
        });
    }

    // Login/Signup Page Logic
    if (path.includes('login.html')) {
         if(mainContent) mainContent.style.display = 'block'; // Login page content is always visible initially
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (authErrorDisplay) authErrorDisplay.textContent = '';
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                try {
                    await loginUser(email, password);
                    // onAuthStateChanged will redirect to index.html
                } catch (error) {
                    if (authErrorDisplay) authErrorDisplay.textContent = error.message;
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (authErrorDisplay) authErrorDisplay.textContent = '';
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                const confirmPassword = document.getElementById('signup-confirm-password').value;

                if (password !== confirmPassword) {
                    if (authErrorDisplay) authErrorDisplay.textContent = "Passwords do not match!";
                    return;
                }
                if (password.length < 6) {
                    if (authErrorDisplay) authErrorDisplay.textContent = "Password must be at least 6 characters.";
                    return;
                }

                try {
                    await signUpUser(email, password);
                    // onAuthStateChanged will redirect to index.html
                } catch (error) {
                    if (authErrorDisplay) authErrorDisplay.textContent = error.message;
                }
            });
        }

        if (showSignupLink && showLoginLink && loginFormSection && signupFormSection) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginFormSection.style.display = 'none';
                signupFormSection.style.display = 'block';
                if (authErrorDisplay) authErrorDisplay.textContent = '';
            });
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                signupFormSection.style.display = 'none';
                loginFormSection.style.display = 'block';
                if (authErrorDisplay) authErrorDisplay.textContent = '';
            });
        }
    }


    // --- Dashboard Logic (index.html) ---
    async function loadInvoicesDashboard() {
        if (!currentUser || !invoicesTableBody) {
            if (invoicesTableBody) invoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Please log in to view invoices.</td></tr>';
            return;
        }
        invoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading...</td></tr>';
        try {
            const invoices = await getInvoices(currentUser.uid);
            if (invoices.length === 0) {
                invoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No invoices found. Create one!</td></tr>';
                return;
            }

            invoicesTableBody.innerHTML = ''; // Clear loading/previous
            invoices.forEach(invoice => {
                const row = invoicesTableBody.insertRow();
                row.innerHTML = `
                    <td>${invoice.invoiceNumber || 'N/A'}</td>
                    <td>${invoice.clientName || 'N/A'}</td>
                    <td>${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}</td>
                    <td>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</td>
                    <td>₹${invoice.totalAmount ? Number(invoice.totalAmount).toFixed(2) : '0.00'}</td>
                    <td><span class="status-${(invoice.status || 'draft').toLowerCase()}">${invoice.status || 'Draft'}</span></td>
                    <td class="actions-cell">
                        <a href="view-invoice.html?id=${invoice.id}" class="btn btn-icon btn-secondary" title="View"><i class="fas fa-eye"></i></a>
                        <a href="create-invoice.html?edit=${invoice.id}" class="btn btn-icon btn-secondary" title="Edit"><i class="fas fa-edit"></i></a>
                        <button class="btn btn-icon btn-danger delete-invoice-btn" data-id="${invoice.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-invoice-btn').forEach(button => {
                button.addEventListener('click', (e) => handleDeleteInvoice(e.currentTarget.dataset.id));
            });

        } catch (error) {
            invoicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading invoices.</td></tr>';
            console.error("Dashboard Error:", error);
        }
    }

    async function handleDeleteInvoice(invoiceId) {
        if (!currentUser) { alert("Please log in."); return; }
        if (confirm('Are you sure you want to delete this invoice?')) {
            try {
                await deleteInvoice(invoiceId, currentUser.uid); // Pass userId for potential server-side checks (though rules are primary)
                alert('Invoice deleted successfully!');
                if (invoicesTableBody) loadInvoicesDashboard(); // Refresh list
            } catch (error) {
                alert('Error deleting invoice. See console for details.');
                console.error("Delete Error:", error);
            }
        }
    }


    // --- Invoice Form Logic (create-invoice.html) ---
    function initializeInvoiceFormElements() {
         // Ensure elements are referenced if this function is called multiple times or on page load
         // itemLinesContainer is already global-like in this script scope if on create-invoice page
         if (addItemBtn) addItemBtn.addEventListener('click', addItemLine);
         if (invoiceForm) invoiceForm.addEventListener('submit', handleInvoiceFormSubmit);

         if (applyGstCheckbox && gstRateInput) {
             applyGstCheckbox.addEventListener('change', () => {
                 gstRateInput.style.display = applyGstCheckbox.checked ? 'inline-block' : 'none';
                 const gstAmountDisplayEl = document.getElementById('gst-amount-display');
                 if(gstAmountDisplayEl) gstAmountDisplayEl.style.display = applyGstCheckbox.checked ? 'block' : 'none';
                 calculateTotals();
             });
             gstRateInput.addEventListener('input', calculateTotals);
         }
         if (itemLinesContainer) {
             itemLinesContainer.addEventListener('input', (event) => {
                 if (event.target.classList.contains('item-qty') || event.target.classList.contains('item-price')) {
                     const row = event.target.closest('tr');
                     if (row) {
                         calculateLineAmount(row);
                         calculateTotals();
                     }
                 }
             });
         }
    }


    async function populateNewInvoiceDetails() {
        if (!currentUser || !invoiceForm) return;
        const invoiceNumberField = document.getElementById('invoice-number');
        const invoiceDateField = document.getElementById('invoice-date');
        if (invoiceNumberField) {
            invoiceNumberField.value = await getNextInvoiceNumber(currentUser.uid); // Pass userId
        }
        if (invoiceDateField) {
            invoiceDateField.value = new Date().toISOString().split('T')[0];
        }
        if(itemLinesContainer && itemLinesContainer.children.length === 0) addItemLine(); // Add one item line by default only if empty
    }


    function addItemLine(item = null) {
        if (!itemLinesContainer) return;
        const row = itemLinesContainer.insertRow();
        row.innerHTML = `
            <td><input type="text" class="item-description form-control" placeholder="Service/Expense description" value="${item ? item.description : ''}" required></td>
            <td><input type="number" class="item-qty form-control" value="${item ? item.quantity : 1}" min="0.01" step="0.01" required></td>
            <td><input type="number" class="item-price form-control" value="${item ? item.unitPrice : 0}" min="0" step="0.01" required></td>
            <td><span class="line-amount">₹0.00</span></td>
            <td><button type="button" class="btn btn-icon btn-danger remove-item-btn" title="Remove Item"><i class="fas fa-minus-circle"></i></button></td>
        `;
        const removeBtn = row.querySelector('.remove-item-btn');
        if(removeBtn) {
             removeBtn.addEventListener('click', () => {
                 row.remove();
                 calculateTotals();
             });
        }
        if(item) calculateLineAmount(row);
        else calculateTotals(); // Recalculate if adding a blank line
    }

    function calculateLineAmount(row) {
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const amountSpan = row.querySelector('.line-amount');
        if (!qtyInput || !priceInput || !amountSpan) return;

        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const amount = qty * price;
        amountSpan.textContent = `₹${amount.toFixed(2)}`;
    }

    function calculateTotals() {
        if (!itemLinesContainer) return; // Only run if on create/edit page
        let subtotal = 0;
        itemLinesContainer.querySelectorAll('tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            subtotal += qty * price;
        });
        const subtotalEl = document.getElementById('subtotal');
        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;

        let gstAmount = 0;
        const applyGst = applyGstCheckbox ? applyGstCheckbox.checked : false;
        const gstAmountValEl = document.getElementById('gst-amount');

        if (applyGst && gstRateInput && gstAmountValEl) {
            const gstRate = parseFloat(gstRateInput.value) || 0;
            gstAmount = subtotal * (gstRate / 100);
            gstAmountValEl.textContent = `₹${gstAmount.toFixed(2)}`;
        } else if (gstAmountValEl) {
            gstAmountValEl.textContent = `₹0.00`;
        }

        const totalAmountEl = document.getElementById('total-amount');
        if (totalAmountEl) totalAmountEl.textContent = `₹${(subtotal + gstAmount).toFixed(2)}`;
    }

    async function handleInvoiceFormSubmit(event) {
        event.preventDefault();
        if (!currentUser) { alert("Please log in to save the invoice."); return; }

        const invoiceIdField = document.getElementById('invoice-id');
        const invoiceId = invoiceIdField ? invoiceIdField.value : null;

        const items = [];
        if (itemLinesContainer) {
            itemLinesContainer.querySelectorAll('tr').forEach(row => {
                const descInput = row.querySelector('.item-description');
                const qtyInput = row.querySelector('.item-qty');
                const priceInput = row.querySelector('.item-price');
                if (descInput && qtyInput && priceInput) {
                     items.push({
                         description: descInput.value,
                         quantity: parseFloat(qtyInput.value) || 0,
                         unitPrice: parseFloat(priceInput.value) || 0,
                         amount: (parseFloat(qtyInput.value) || 0) * (parseFloat(priceInput.value) || 0)
                     });
                }
            });
        }


        if (items.length === 0) {
            alert('Please add at least one item to the invoice.');
            return;
        }

        let subtotalVal = 0;
        items.forEach(item => subtotalVal += item.amount);

        let gstRateVal = 0;
        let gstAmountVal = 0;
        const applyGst = applyGstCheckbox ? applyGstCheckbox.checked : false;
        if (applyGst && gstRateInput) {
            gstRateVal = parseFloat(gstRateInput.value) || 0;
            gstAmountVal = subtotalVal * (gstRateVal / 100);
        }
        const clientNameEl = document.getElementById('client-name');
        const invoiceData = {
            userId: currentUser.uid, // **** IMPORTANT FOR SECURITY RULES ****
            clientName: clientNameEl ? clientNameEl.value : '',
            clientEmail: document.getElementById('client-email').value,
            clientPhone: document.getElementById('client-phone').value,
            clientAddress: document.getElementById('client-address').value,
            invoiceNumber: document.getElementById('invoice-number').value,
            invoiceDate: document.getElementById('invoice-date').value,
            dueDate: document.getElementById('due-date').value,
            status: document.getElementById('invoice-status').value,
            items: items,
            subTotal: subtotalVal,
            gstApplied: applyGst,
            gstRate: gstRateVal,
            gstAmount: gstAmountVal,
            totalAmount: subtotalVal + gstAmountVal,
            notes: document.getElementById('notes').value,
        };

        try {
            const submitButton = invoiceForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            await saveInvoice(invoiceData, invoiceId || null);
            alert(`Invoice ${invoiceId ? 'updated' : 'saved'} successfully!`);
            window.location.href = `index.html`;
        } catch (error) {
            alert(`Error saving invoice: ${error.message}`);
            console.error("Form Submit Error:", error);
            if(submitButton) submitButton.disabled = false;
        }
    }

    async function loadInvoiceForEditing(invoiceId) {
        if (!currentUser || !invoiceForm) return;
        try {
            const invoice = await getInvoiceById(invoiceId, currentUser.uid);
            if (invoice) {
                document.getElementById('invoice-id').value = invoice.id;
                document.getElementById('client-name').value = invoice.clientName || '';
                document.getElementById('client-email').value = invoice.clientEmail || '';
                document.getElementById('client-phone').value = invoice.clientPhone || '';
                document.getElementById('client-address').value = invoice.clientAddress || '';
                document.getElementById('invoice-number').value = invoice.invoiceNumber || '';
                document.getElementById('invoice-date').value = invoice.invoiceDate || '';
                document.getElementById('due-date').value = invoice.dueDate || '';
                document.getElementById('invoice-status').value = invoice.status || 'Draft';
                document.getElementById('notes').value = invoice.notes || '';

                if (itemLinesContainer) itemLinesContainer.innerHTML = ''; // Clear existing
                if (invoice.items && invoice.items.length > 0) {
                    invoice.items.forEach(item => addItemLine(item));
                } else {
                    addItemLine();
                }
                if (applyGstCheckbox && gstRateInput) {
                    applyGstCheckbox.checked = invoice.gstApplied || false;
                    gstRateInput.style.display = applyGstCheckbox.checked ? 'inline-block' : 'none';
                    const gstAmountDisplayEl = document.getElementById('gst-amount-display');
                    if(gstAmountDisplayEl) gstAmountDisplayEl.style.display = applyGstCheckbox.checked ? 'block' : 'none';

                    if (invoice.gstApplied) {
                        gstRateInput.value = invoice.gstRate || 18;
                    }
                }

                calculateTotals();
                const submitBtn = invoiceForm.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Invoice';
                const pageTitle = document.querySelector('h1');
                if (pageTitle) pageTitle.textContent = 'Edit Invoice';

            } else {
                alert('Invoice not found or you do not have permission to edit it.');
                window.location.href = 'index.html';
            }
        } catch (error) {
            alert('Error loading invoice for editing. See console.');
            console.error("Edit Load Error:", error);
        }
    }

    // --- View Invoice Logic (view-invoice.html) ---
    async function loadInvoiceForViewing() {
        if (!currentUser) { console.warn("No current user for viewing invoice."); return; }
        const urlParams = new URLSearchParams(window.location.search);
        const invoiceId = urlParams.get('id');

        if (!invoiceId) {
            alert("No invoice ID provided.");
            window.location.href = 'index.html';
            return;
        }

        try {
            const invoice = await getInvoiceById(invoiceId, currentUser.uid);
            if (invoice) {
                // Populate Company Details (these would ideally come from user settings)
                // document.getElementById('view-company-name').textContent = "Sai Finance"; // Placeholder

                document.getElementById('view-invoice-number').textContent = invoice.invoiceNumber || 'N/A';
                document.getElementById('view-invoice-date').textContent = invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A';
                document.getElementById('view-due-date').textContent = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A';

                document.getElementById('view-client-name').textContent = invoice.clientName || '';
                document.getElementById('view-client-address').textContent = invoice.clientAddress || '';
                document.getElementById('view-client-phone').textContent = invoice.clientPhone || '';
                document.getElementById('view-client-email').textContent = invoice.clientEmail || '';

                const viewItemLines = document.getElementById('view-invoice-item-lines');
                if (viewItemLines) {
                    viewItemLines.innerHTML = ''; // Clear
                    if (invoice.items && invoice.items.length > 0) {
                        invoice.items.forEach(item => {
                            const row = viewItemLines.insertRow();
                            row.innerHTML = `
                                <td>${item.description}</td>
                                <td>${item.quantity}</td>
                                <td>₹${Number(item.unitPrice).toFixed(2)}</td>
                                <td>₹${Number(item.amount).toFixed(2)}</td>
                            `;
                        });
                    }
                }

                document.getElementById('view-subtotal').textContent = `₹${Number(invoice.subTotal).toFixed(2)}`;
                const gstDetailsDiv = document.getElementById('view-gst-details');
                if (invoice.gstApplied && gstDetailsDiv) {
                    gstDetailsDiv.style.display = 'block';
                    // Assuming total GST is split into SGST and CGST for now
                    // For proper SGST/CGST/IGST, you'd need to store info about client's state.
                    const halfGstRate = (invoice.gstRate / 2).toFixed(2);
                    const halfGstAmount = (invoice.gstAmount / 2).toFixed(2);
                    document.getElementById('view-sgst-rate').textContent = halfGstRate;
                    document.getElementById('view-sgst-amount').textContent = `₹${halfGstAmount}`;
                    document.getElementById('view-cgst-rate').textContent = halfGstRate;
                    document.getElementById('view-cgst-amount').textContent = `₹${halfGstAmount}`;
                    // Hide IGST for now or implement logic for it
                    document.getElementById('view-igst-rate').parentElement.style.display = 'none';
                } else if (gstDetailsDiv) {
                    gstDetailsDiv.style.display = 'none';
                }
                document.getElementById('view-total-amount').textContent = `₹${Number(invoice.totalAmount).toFixed(2)}`;
                document.getElementById('view-notes').textContent = invoice.notes || '';

            } else {
                alert("Invoice not found or you do not have permission to view it.");
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Error loading invoice for viewing:", error);
            alert("Error loading invoice details.");
        }
    }

    // Call initialization based on current page after auth state is known
    // This is handled inside onAuthStateChangedHandler for protected pages.
    // For login page, it runs directly as it's not "protected" in the same way.
    if (path.includes('login.html')) {
        initializePageBasedOnPath(); // To set up login/signup form toggles
    }


}); // End DOMContentLoaded