// public/js/app.js

// --- Default Settings & Constants ---
const DEFAULT_BANK_DETAILS = `Thank you for choosing Sai Finance!
Please make payments via Bank Transfer or UPI.
Bank Details:
Account Name: [YOUR SAI FINANCE ACCOUNT NAME]
Account Number: [YOUR ACCOUNT NUMBER]
Bank Name: [YOUR BANK NAME]
IFSC Code: [YOUR IFSC CODE]
UPI ID: [YOUR UPI ID HERE]
For queries, contact Arumugam at +91 7868025380.`;

const COMMON_DEFAULT_INVOICE_ITEMS = [
    { description: "Login Fees", quantity: 1, unitPrice: 0.00 },
    { description: "Processing Fees", quantity: 1, unitPrice: 0.00 },
    { description: "Legal/Notary Fees", quantity: 1, unitPrice: 0.00 },
    { description: "EC+MOD Charges", quantity: 1, unitPrice: 0.00 },
    { description: "Insurance Premium (Estimate)", quantity: 1, unitPrice: 0.00 },
    { description: "Service Commission", quantity: 1, unitPrice: 0.00 }
];

const SERVICE_PACKAGES = {
    home_loan: COMMON_DEFAULT_INVOICE_ITEMS,
    mortgage_loan: COMMON_DEFAULT_INVOICE_ITEMS,
    business_loan: COMMON_DEFAULT_INVOICE_ITEMS,
    personal_loan: COMMON_DEFAULT_INVOICE_ITEMS,
    agri_loan: COMMON_DEFAULT_INVOICE_ITEMS,
    lap_loan: COMMON_DEFAULT_INVOICE_ITEMS,
    other_custom: []
};

// --- Global Variables ---
let itemLinesContainer;
let invoiceForm;
let currentInvoiceId = null; // Used for edit mode, set by DOMContentLoaded

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // initAuth() in auth.js will now handle triggering page-specific logic
    // after auth state is confirmed, by calling functions defined in this file (app.js)
    // or view-invoice-app.js

    // We still need to get currentInvoiceId if on create/edit page for initializeInvoiceForm
    const urlParams = new URLSearchParams(window.location.search);
    currentInvoiceId = urlParams.get('edit') || urlParams.get('id'); // For edit or view
});


// --- Dashboard Logic (index.html) ---
// This function is now called by auth.js after auth state is known
async function loadInvoicesDashboard() {
    const tableBody = document.getElementById('invoices-table-body');
    if (!tableBody) return; // Not on dashboard page

    const user = firebase.auth().currentUser;
    if (!user) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Please sign in to view invoices.</td></tr>';
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading invoices...</td></tr>';

    try {
        const invoices = await getInvoices();
        if (invoices.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No invoices found. Create one!</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        invoices.forEach(invoice => {
            const row = tableBody.insertRow();
            const totalAmount = invoice.totalAmount || 0;
            // Ensure dates are handled safely if they might be Firestore Timestamps or strings
            const invoiceDateObj = invoice.invoiceDate?.toDate ? invoice.invoiceDate.toDate() : (invoice.invoiceDate ? new Date(invoice.invoiceDate + 'T00:00:00') : null);
            const dueDateObj = invoice.dueDate?.toDate ? invoice.dueDate.toDate() : (invoice.dueDate ? new Date(invoice.dueDate + 'T00:00:00') : null);

            row.innerHTML = `
                <td>${invoice.invoiceNumber || 'N/A'}</td>
                <td>${invoice.clientName || 'N/A'}</td>
                <td>${invoiceDateObj ? invoiceDateObj.toLocaleDateString() : 'N/A'}</td>
                <td>${dueDateObj ? dueDateObj.toLocaleDateString() : 'N/A'}</td>
                <td>₹${totalAmount.toFixed(2)}</td>
                <td><span class="status-${(invoice.status || 'draft').toLowerCase()}">${invoice.status || 'Draft'}</span></td>
                <td class="actions-cell">
                    <a href="view-invoice.html?id=${invoice.id}" class="btn btn-icon btn-secondary" title="View"><i class="fas fa-eye"></i></a>
                    <a href="create-invoice.html?edit=${invoice.id}" class="btn btn-icon btn-secondary" title="Edit"><i class="fas fa-edit"></i></a>
                    <button class="btn btn-icon btn-danger" title="Delete" onclick="handleDeleteInvoice('${invoice.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading invoices. Ensure you are signed in.</td></tr>';
        console.error("Dashboard Error:", error);
    }
}

async function handleDeleteInvoice(invoiceId) {
    if (!firebase.auth().currentUser) {
        alert("Please sign in to delete invoices.");
        return;
    }
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            await deleteInvoice(invoiceId);
            alert('Invoice deleted successfully!');
            loadInvoicesDashboard(); // Refresh
        } catch (error) {
            alert('Error deleting invoice: ' + error.message);
            console.error("Delete Error:", error);
        }
    }
}

// --- Invoice Form Logic (create-invoice.html) ---
// This function is now called by auth.js after auth state is known
async function initializeInvoiceForm() {
    invoiceForm = document.getElementById('invoice-form');
    itemLinesContainer = document.getElementById('invoice-item-lines');
    const addItemBtn = document.getElementById('add-item-btn');
    const servicePackageDropdown = document.getElementById('service-package');
    const applyIntraStateGstCheckbox = document.getElementById('apply-intra-state-gst');
    const gstInputsContainer = document.getElementById('gst-inputs-container');
    const cgstRateInput = document.getElementById('cgst-rate');
    const sgstRateInput = document.getElementById('sgst-rate');
    const cgstAmountDisplay = document.getElementById('cgst-amount-display');
    const sgstAmountDisplay = document.getElementById('sgst-amount-display');
    const saveBtn = document.getElementById('save-invoice-btn');


    if (!invoiceForm || !itemLinesContainer) {
        // console.log("Not on create/edit invoice page, or essential form elements missing.");
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user && currentInvoiceId) { // Trying to edit but not logged in
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Please Sign In to Edit Invoice';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Edit';
        }
        return; // Stop further form initialization
    } else if (!user && !currentInvoiceId) { // Trying to create new but not logged in
         const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Please Sign In to Create Invoice';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Save';
        }
        return;
    }
    // If user is logged in, enable the save button text
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> ' + (currentInvoiceId ? 'Update Invoice' : 'Save Invoice');
    }


    if (servicePackageDropdown) servicePackageDropdown.addEventListener('change', handleServicePackageChange);
    if (addItemBtn) addItemBtn.addEventListener('click', () => addItemLine());
    if (invoiceForm) invoiceForm.addEventListener('submit', handleInvoiceFormSubmit);

    if (applyIntraStateGstCheckbox) {
        applyIntraStateGstCheckbox.addEventListener('change', () => {
            const showGstFields = applyIntraStateGstCheckbox.checked;
            if (gstInputsContainer) gstInputsContainer.style.display = showGstFields ? 'block' : 'none';
            if (cgstAmountDisplay) cgstAmountDisplay.style.display = showGstFields ? 'block' : 'none';
            if (sgstAmountDisplay) sgstAmountDisplay.style.display = showGstFields ? 'block' : 'none';
            calculateTotals();
        });
    }
    if (cgstRateInput) cgstRateInput.addEventListener('input', calculateTotals);
    if (sgstRateInput) sgstRateInput.addEventListener('input', calculateTotals);

    if (itemLinesContainer) {
        itemLinesContainer.addEventListener('input', (event) => {
            const target = event.target;
            if (target.classList.contains('item-qty') || target.classList.contains('item-price') || target.classList.contains('item-description')) {
                const row = target.closest('tr');
                if (row) {
                    calculateLineAmount(row);
                    calculateTotals();
                }
            }
        });
    }

    if (currentInvoiceId) {
        await loadInvoiceForEditing(currentInvoiceId);
    } else {
        await populateNewInvoiceDetails();
    }
}


async function populateNewInvoiceDetails() {
    if (!invoiceForm) return; // Make sure we are on the correct page
    invoiceForm.reset(); // Reset form for new invoice
    if(document.getElementById('invoice-id')) document.getElementById('invoice-id').value = ''; // Clear hidden ID
    currentInvoiceId = null;


    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = 'Create New Invoice';
    const saveBtn = document.getElementById('save-invoice-btn');
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Invoice';


    const invoiceNumberField = document.getElementById('invoice-number');
    const invoiceDateField = document.getElementById('invoice-date');
    const dueDateField = document.getElementById('due-date');
    const notesTextarea = document.getElementById('notes');
    const qrUpiIdText = document.getElementById('qr-upi-id-text');

    if (invoiceNumberField) {
        try {
            invoiceNumberField.value = await getNextInvoiceNumber();
        } catch (e) {
            console.error("Failed to get next invoice number for new invoice:", e);
            const year = new Date().getFullYear();
            invoiceNumberField.value = `INV-${year}-0001`; // Fallback
        }
    }
    if (invoiceDateField) invoiceDateField.value = new Date().toISOString().split('T')[0];
    if (dueDateField) {
        const today = new Date();
        const defaultDueDate = new Date(today.setDate(today.getDate() + 15));
        dueDateField.value = defaultDueDate.toISOString().split('T')[0];
    }
    if (notesTextarea) notesTextarea.value = DEFAULT_BANK_DETAILS;
    if (qrUpiIdText) {
        const match = DEFAULT_BANK_DETAILS.match(/UPI ID: ([\w@.-]+)/);
        qrUpiIdText.textContent = match && match[1] ? `(UPI ID: ${match[1]})` : `(UPI ID: YOUR_UPI_ID_HERE)`;
    }

    itemLinesContainer.innerHTML = '';
    addItemLine(); // Add one blank line
    calculateTotals();
}

function handleServicePackageChange(event) {
    const selectedPackageKey = event.target.value;
    itemLinesContainer.innerHTML = '';
    const itemsToLoad = SERVICE_PACKAGES[selectedPackageKey] || [];
    if (selectedPackageKey && itemsToLoad.length > 0) {
        itemsToLoad.forEach(item => addItemLine({ ...item }));
    } else {
        addItemLine();
    }
    calculateTotals();
}

function addItemLine(item = null) {
    if (!itemLinesContainer) return;
    const row = itemLinesContainer.insertRow();
    const description = item && item.description !== undefined ? item.description : '';
    const quantity = item && item.quantity !== undefined ? item.quantity : 1;
    const unitPrice = item && item.unitPrice !== undefined ? parseFloat(item.unitPrice).toFixed(2) : '0.00';

    row.innerHTML = `
        <td><input type="text" class="item-description" placeholder="Service/Expense description" value="${description}" required></td>
        <td><input type="number" class="item-qty" value="${quantity}" min="0" step="any" required style="width: 70px;"></td>
        <td><input type="number" class="item-price" value="${unitPrice}" min="0" step="0.01" required></td>
        <td><span class="line-amount">₹0.00</span></td>
        <td><button type="button" class="btn btn-icon btn-danger remove-item-btn" title="Remove Item"><i class="fas fa-minus-circle"></i></button></td>
    `;
    const removeBtn = row.querySelector('.remove-item-btn');
    if (removeBtn) removeBtn.addEventListener('click', () => { row.remove(); calculateTotals(); });
    calculateLineAmount(row);
}

function calculateLineAmount(row) {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    row.querySelector('.line-amount').textContent = `₹${(qty * price).toFixed(2)}`;
}

function calculateTotals() {
    if (!itemLinesContainer) return;
    let subtotal = 0;
    itemLinesContainer.querySelectorAll('tr').forEach(row => {
        subtotal += parseFloat(row.querySelector('.line-amount').textContent.replace('₹', '')) || 0;
    });
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;

    let cgstAmount = 0, sgstAmount = 0;
    const applyGstCheckbox = document.getElementById('apply-intra-state-gst');
    if (applyGstCheckbox && applyGstCheckbox.checked) {
        const cgstRate = parseFloat(document.getElementById('cgst-rate').value) || 0;
        const sgstRate = parseFloat(document.getElementById('sgst-rate').value) || 0;
        cgstAmount = subtotal * (cgstRate / 100);
        sgstAmount = subtotal * (sgstRate / 100);
    }
    document.getElementById('cgst-amount').textContent = `₹${cgstAmount.toFixed(2)}`;
    document.getElementById('sgst-amount').textContent = `₹${sgstAmount.toFixed(2)}`;
    document.getElementById('total-amount').textContent = `₹${(subtotal + cgstAmount + sgstAmount).toFixed(2)}`;
}

async function loadInvoiceForEditing(invoiceId) {
    const pageTitle = document.getElementById('page-title');
    const saveBtn = document.getElementById('save-invoice-btn');
    if (pageTitle) pageTitle.textContent = 'Edit Invoice';
    if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Invoice';

    try {
        const invoice = await getInvoiceById(invoiceId);
        if (invoice) {
            document.getElementById('invoice-id').value = invoice.id;
            document.getElementById('client-name').value = invoice.clientName || '';
            document.getElementById('client-email').value = invoice.clientEmail || '';
            document.getElementById('client-phone').value = invoice.clientPhone || '';
            document.getElementById('client-address').value = invoice.clientAddress || '';
            document.getElementById('loan-type').value = invoice.loanType || '';
            document.getElementById('loan-application-no').value = invoice.loanApplicationNo || '';
            document.getElementById('loan-account-no').value = invoice.loanAccountNo || '';
            document.getElementById('loan-disbursement-amount').value = invoice.loanDisbursementAmount || '';
            document.getElementById('invoice-number').value = invoice.invoiceNumber || '';
            document.getElementById('invoice-date').value = invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '';
            document.getElementById('due-date').value = invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '';
            document.getElementById('invoice-status').value = invoice.status || 'Draft';
            
            if (invoice.items && Array.isArray(invoice.items)) {
                itemLinesContainer.innerHTML = '';
                invoice.items.forEach(item => addItemLine(item));
            }
            
            if (invoice.notes) document.getElementById('notes').value = invoice.notes;
            
            if (invoice.applyIntraStateGst !== undefined) {
                document.getElementById('apply-intra-state-gst').checked = invoice.applyIntraStateGst;
                if (invoice.applyIntraStateGst) {
                    document.getElementById('gst-inputs-container').style.display = 'block';
                }
            }
            
            if (invoice.cgstRate !== undefined) document.getElementById('cgst-rate').value = invoice.cgstRate;
            if (invoice.sgstRate !== undefined) document.getElementById('sgst-rate').value = invoice.sgstRate;
            
            calculateTotals();
        } else {
            if (pageTitle) pageTitle.textContent = 'Invoice Not Found or No Permission';
            alert('Invoice not found for editing, or you do not have permission.');
        }
    } catch (error) {
        if (pageTitle) pageTitle.textContent = 'Error Loading Invoice';
        alert('Error loading invoice for editing: ' + error.message);
        console.error("Edit Load Error:", error);
    }
}

async function handleInvoiceFormSubmit(event) {
    event.preventDefault();
    if (!firebase.auth().currentUser) {
        alert("Please sign in to save the invoice.");
        openAuthModal('signin');
        return;
    }

    const invoiceIdField = document.getElementById('invoice-id');
    const idForSave = invoiceIdField ? invoiceIdField.value : null;

    const invoiceData = {
        clientName: document.getElementById('client-name').value,
        clientEmail: document.getElementById('client-email').value,
        clientPhone: document.getElementById('client-phone').value,
        clientAddress: document.getElementById('client-address').value,
        loanType: document.getElementById('loan-type').value,
        loanApplicationNo: document.getElementById('loan-application-no').value,
        loanAccountNo: document.getElementById('loan-account-no').value,
        loanDisbursementAmount: parseFloat(document.getElementById('loan-disbursement-amount').value) || 0,
        invoiceNumber: document.getElementById('invoice-number').value,
        invoiceDate: new Date(document.getElementById('invoice-date').value),
        dueDate: new Date(document.getElementById('due-date').value),
        status: document.getElementById('invoice-status').value,
        items: Array.from(itemLinesContainer.querySelectorAll('tr')).map(row => ({
            description: row.querySelector('.item-description').value.trim(),
            quantity: parseFloat(row.querySelector('.item-qty').value),
            unitPrice: parseFloat(row.querySelector('.item-price').value),
            amount: parseFloat(row.querySelector('.line-amount').textContent.replace('₹', ''))
        })),
        notes: document.getElementById('notes').value,
        applyIntraStateGst: document.getElementById('apply-intra-state-gst').checked,
        cgstRate: parseFloat(document.getElementById('cgst-rate').value) || 0,
        sgstRate: parseFloat(document.getElementById('sgst-rate').value) || 0,
        cgstAmount: parseFloat(document.getElementById('cgst-amount').textContent.replace('₹', '')) || 0,
        sgstAmount: parseFloat(document.getElementById('sgst-amount').textContent.replace('₹', '')) || 0,
        totalAmount: parseFloat(document.getElementById('total-amount').textContent.replace('₹', ''))
    };

    try {
        const submitButton = document.getElementById('save-invoice-btn');
        if (submitButton) { 
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        await saveInvoice(invoiceData, idForSave);
        alert(`Invoice ${idForSave ? 'updated' : 'saved'} successfully!`);
        window.location.href = 'index.html';
    } catch (error) {
        alert(`Error saving invoice: ${error.message}`);
        console.error("Form Submit Error:", error);
        const submitButton = document.getElementById('save-invoice-btn');
        if (submitButton) { 
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save"></i> ${idForSave ? 'Update' : 'Save'} Invoice`;
        }
    }
}