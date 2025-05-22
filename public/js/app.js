document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/') {
        loadInvoicesDashboard();
    } else if (path.includes('create-invoice.html')) {
        initializeInvoiceForm();
        const urlParams = new URLSearchParams(window.location.search);
        const invoiceIdToEdit = urlParams.get('edit');
        if (invoiceIdToEdit) {
            loadInvoiceForEditing(invoiceIdToEdit);
        } else {
            populateNewInvoiceDetails(); // For new invoices
        }
    }
    // Add similar for view-invoice.html if you create it
});

// --- Dashboard Logic (index.html) ---
async function loadInvoicesDashboard() {
    const tableBody = document.getElementById('invoices-table-body');
    if (!tableBody) return;

    try {
        const invoices = await getInvoices();
        if (invoices.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No invoices found. Create one!</td></tr>';
            return;
        }

        tableBody.innerHTML = ''; // Clear loading/previous
        invoices.forEach(invoice => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${invoice.invoiceNumber || 'N/A'}</td>
                <td>${invoice.clientName || 'N/A'}</td>
                <td>${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}</td>
                <td>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</td>
                <td>₹${invoice.totalAmount ? invoice.totalAmount.toFixed(2) : '0.00'}</td>
                <td><span class="status-${(invoice.status || 'draft').toLowerCase()}">${invoice.status || 'Draft'}</span></td>
                <td class="actions-cell">
                    <a href="view-invoice.html?id=${invoice.id}" class="btn btn-icon btn-secondary" title="View"><i class="fas fa-eye"></i></a>
                    <a href="create-invoice.html?edit=${invoice.id}" class="btn btn-icon btn-secondary" title="Edit"><i class="fas fa-edit"></i></a>
                    <button class="btn btn-icon btn-danger" title="Delete" onclick="handleDeleteInvoice('${invoice.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Error loading invoices.</td></tr>';
        console.error("Dashboard Error:", error);
    }
}

async function handleDeleteInvoice(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            await deleteInvoice(invoiceId);
            alert('Invoice deleted successfully!');
            loadInvoicesDashboard(); // Refresh list
        } catch (error) {
            alert('Error deleting invoice. See console for details.');
            console.error("Delete Error:", error);
        }
    }
}

// --- Invoice Form Logic (create-invoice.html) ---
let itemLinesContainer;
let invoiceForm;

async function populateNewInvoiceDetails() {
    const invoiceNumberField = document.getElementById('invoice-number');
    const invoiceDateField = document.getElementById('invoice-date');
    if (invoiceNumberField) {
        invoiceNumberField.value = await getNextInvoiceNumber();
    }
    if (invoiceDateField) {
        invoiceDateField.value = new Date().toISOString().split('T')[0]; // Today's date
    }
    addItemLine(); // Add one item line by default
}


function initializeInvoiceForm() {
    invoiceForm = document.getElementById('invoice-form');
    itemLinesContainer = document.getElementById('invoice-item-lines');
    const addItemBtn = document.getElementById('add-item-btn');
    const applyGstCheckbox = document.getElementById('apply-gst');
    const gstRateInput = document.getElementById('gst-rate');

    if (addItemBtn) addItemBtn.addEventListener('click', addItemLine);
    if (invoiceForm) invoiceForm.addEventListener('submit', handleInvoiceFormSubmit);

    if (applyGstCheckbox && gstRateInput) {
        applyGstCheckbox.addEventListener('change', () => {
            gstRateInput.style.display = applyGstCheckbox.checked ? 'inline-block' : 'none';
            document.getElementById('gst-amount-display').style.display = applyGstCheckbox.checked ? 'block' : 'none';
            calculateTotals();
        });
        gstRateInput.addEventListener('input', calculateTotals);
    }
    // Event delegation for dynamic item line inputs
    if (itemLinesContainer) {
        itemLinesContainer.addEventListener('input', (event) => {
            if (event.target.classList.contains('item-qty') || event.target.classList.contains('item-price')) {
                calculateLineAmount(event.target.closest('tr'));
                calculateTotals();
            }
        });
    }
}

function addItemLine(item = null) {
    if (!itemLinesContainer) return;
    const row = itemLinesContainer.insertRow();
    row.innerHTML = `
        <td><input type="text" class="item-description" placeholder="Service/Expense description" value="${item ? item.description : ''}" required></td>
        <td><input type="number" class="item-qty" value="${item ? item.quantity : 1}" min="1" required></td>
        <td><input type="number" class="item-price" value="${item ? item.unitPrice : 0}" min="0" step="0.01" required></td>
        <td><span class="line-amount">₹0.00</span></td>
        <td><button type="button" class="btn btn-icon btn-danger remove-item-btn" title="Remove Item"><i class="fas fa-minus-circle"></i></button></td>
    `;
    row.querySelector('.remove-item-btn').addEventListener('click', () => {
        row.remove();
        calculateTotals();
    });
    if(item) calculateLineAmount(row); // calculate if pre-filling
}

function calculateLineAmount(row) {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const amount = qty * price;
    row.querySelector('.line-amount').textContent = `₹${amount.toFixed(2)}`;
}

function calculateTotals() {
    let subtotal = 0;
    itemLinesContainer.querySelectorAll('tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        subtotal += qty * price;
    });

    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;

    let gstAmount = 0;
    const applyGstCheckbox = document.getElementById('apply-gst');
    if (applyGstCheckbox.checked) {
        const gstRate = parseFloat(document.getElementById('gst-rate').value) || 0;
        gstAmount = subtotal * (gstRate / 100);
        document.getElementById('gst-amount').textContent = `₹${gstAmount.toFixed(2)}`;
    } else {
        document.getElementById('gst-amount').textContent = `₹0.00`;
    }

    const totalAmount = subtotal + gstAmount;
    document.getElementById('total-amount').textContent = `₹${totalAmount.toFixed(2)}`;
}

async function handleInvoiceFormSubmit(event) {
    event.preventDefault();
    const invoiceId = document.getElementById('invoice-id').value;

    const items = [];
    itemLinesContainer.querySelectorAll('tr').forEach(row => {
        items.push({
            description: row.querySelector('.item-description').value,
            quantity: parseFloat(row.querySelector('.item-qty').value),
            unitPrice: parseFloat(row.querySelector('.item-price').value),
            amount: (parseFloat(row.querySelector('.item-qty').value) * parseFloat(row.querySelector('.item-price').value))
        });
    });

    if (items.length === 0) {
        alert('Please add at least one item to the invoice.');
        return;
    }

    let subtotalVal = 0;
    items.forEach(item => subtotalVal += item.amount);

    let gstRateVal = 0;
    let gstAmountVal = 0;
    const applyGst = document.getElementById('apply-gst').checked;
    if (applyGst) {
        gstRateVal = parseFloat(document.getElementById('gst-rate').value) || 0;
        gstAmountVal = subtotalVal * (gstRateVal / 100);
    }

    const invoiceData = {
        clientName: document.getElementById('client-name').value,
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
        // createdAt, updatedAt will be handled by firestoreService
    };

    try {
        const savedId = await saveInvoice(invoiceData, invoiceId || null);
        alert(`Invoice ${invoiceId ? 'updated' : 'saved'} successfully!`);
        window.location.href = `index.html`; // Or view-invoice.html?id=${savedId}
    } catch (error) {
        alert(`Error saving invoice. Check console.`);
        console.error("Form Submit Error:", error);
    }
}

async function loadInvoiceForEditing(invoiceId) {
    try {
        const invoice = await getInvoiceById(invoiceId);
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

            itemLinesContainer.innerHTML = ''; // Clear existing
            if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach(item => addItemLine(item));
            } else {
                addItemLine(); // Add one blank if no items
            }

            const applyGstCheckbox = document.getElementById('apply-gst');
            const gstRateInput = document.getElementById('gst-rate');
            applyGstCheckbox.checked = invoice.gstApplied || false;
            gstRateInput.style.display = applyGstCheckbox.checked ? 'inline-block' : 'none';
            document.getElementById('gst-amount-display').style.display = applyGstCheckbox.checked ? 'block' : 'none';
            if (invoice.gstApplied) {
                gstRateInput.value = invoice.gstRate || 18;
            }

            calculateTotals();
            document.querySelector('#invoice-form button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Update Invoice';
            document.querySelector('h1').textContent = 'Edit Invoice';

        } else {
            alert('Invoice not found for editing.');
            window.location.href = 'index.html';
        }
    } catch (error) {
        alert('Error loading invoice for editing. See console.');
        console.error("Edit Load Error:", error);
    }
}