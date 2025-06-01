// public/js/view-invoice-app.js

// Fallback default bank details if not found in the bill's notes
// Ensure this is consistent with app.js or loaded from a shared config
const DEFAULT_BANK_DETAILS_VIEW = (typeof DEFAULT_BANK_DETAILS !== 'undefined' ? DEFAULT_BANK_DETAILS :
    `Thank you for choosing Sai Finance!
    Please make payments via Bank Transfer or UPI.
    Bank Details:
    Account Name: [YOUR SAI FINANCE ACCOUNT NAME]
    Account Number: [YOUR ACCOUNT NUMBER]
    Bank Name: [YOUR BANK NAME]
    IFSC Code: [YOUR IFSC CODE]
    UPI ID: [YOUR UPI ID HERE]
    For queries, contact Arumugam at +91 7868025380.`);
    
    
    // --- Helper Function for Date Formatting ---
    function formatDate(dateInput) {
        if (!dateInput) return 'N/A';
        try {
            // Dates from Firestore might be Timestamps (if stored as such) or YYYY-MM-DD strings
            // new Date('YYYY-MM-DD') can have timezone issues, better to specify UTC if just date
            const dateObj = dateInput.toDate ? dateInput.toDate() : new Date(dateInput + 'T00:00:00Z');
            if (isNaN(dateObj.getTime())) { // Check if date is valid after parsing
                console.warn("formatDate encountered an invalid date:", dateInput);
                return 'Invalid Date';
            }
            return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateInput, e);
            return 'Invalid Date String'; // Or handle as appropriate
        }
    }
    
    // This function is called by auth.js after auth state is known
    async function initializeViewInvoicePage() {
        const printInvoiceBtn = document.getElementById('print-invoice-btn');
        if (printInvoiceBtn) {
            printInvoiceBtn.innerHTML = '<i class="fas fa-print"></i> Print Bill'; // Update button text
            printInvoiceBtn.addEventListener('click', () => window.print());
        }
    
        const urlParams = new URLSearchParams(window.location.search);
        const billId = urlParams.get('id'); // Using 'billId' for clarity here
        const editBillLink = document.getElementById('edit-invoice-link'); // HTML ID remains 'edit-invoice-link'
        const billViewArea = document.getElementById('invoice-view-area'); // HTML ID remains 'invoice-view-area'
        const mainContent = document.querySelector('.main-content-area');
    
        if (mainContent) mainContent.style.visibility = 'visible'; // Show content area immediately
    
        const user = firebase.auth().currentUser; // Auth state is already determined by auth.js
    
        if (user) {
            if (billId) {
                await loadAndDisplayBill(billId); // Call the renamed function
                if (editBillLink) {
                    editBillLink.href = `create-invoice.html?edit=${billId}`;
                    editBillLink.innerHTML = '<i class="fas fa-edit"></i> Edit Bill';
                    editBillLink.style.display = 'inline-block';
                }
            } else {
                document.title = "Error - Sai Billing";
                if(billViewArea) billViewArea.innerHTML = '<p style="text-align:center; color:red; padding-top:30px;">No Bill ID provided in the URL.</p>';
                if(editBillLink) editBillLink.style.display = 'none';
            }
        } else {
            document.title = "Sign In Required - Sai Billing";
            if(billViewArea) billViewArea.innerHTML = '<p style="text-align:center; color:red; padding-top:30px;">Please sign in to view this Bill.</p>';
            if(editBillLink) editBillLink.style.display = 'none';
            // auth.js will likely have shown the sign-in modal already if this page was accessed directly without auth
        }
    }
    
    async function loadAndDisplayBill(billId) {
        const billViewArea = document.getElementById('invoice-view-area');
        if (!billViewArea) return;
        billViewArea.innerHTML = '<p style="text-align:center; padding: 50px;">Loading bill details...</p>';
    
        try {
            const bill = await getInvoiceById(billId);
    
            if (bill) {
                document.title = `Bill ${bill.invoiceNumber || billId} - Sai Billing`;

                const loanType = bill.loanType || 'N/A';
                const loanApplicationNumber = bill.loanApplicationNumber || 'N/A';
                const loanAccountNumber = bill.loanAccountNumber || 'N/A';
                const loanDisbursementAmount = bill.loanDisbursementAmount ? `₹${parseFloat(bill.loanDisbursementAmount).toFixed(2)}` : 'N/A';
    
                let itemsHtml = '';
                // ... (itemsHtml generation remains the same) ...
                if (bill.items && Array.isArray(bill.items)) {
                    bill.items.forEach((item, index) => {
                        itemsHtml += `
                            <tr>
                                <td>${index + 1}</td>
                                <td class="description-cell">${item.description ? item.description.replace(/\n/g, '<br>') : ''}</td>
                                <td class="number-cell">${item.quantity !== undefined ? item.quantity : 'N/A'}</td>
                                <td class="number-cell">${(item.unitPrice !== undefined ? parseFloat(item.unitPrice) : 0).toFixed(2)}</td>
                                <td class="number-cell">${(item.amount !== undefined ? parseFloat(item.amount) : 0).toFixed(2)}</td>
                            </tr>
                        `;
                    });
                }
    
    
                let upiIdForQr = "[YOUR UPI ID HERE]";
                // ... (upiIdForQr logic remains the same) ...
                const notesToParse = bill.notes || DEFAULT_BANK_DETAILS_VIEW;
                const notesMatch = notesToParse.match(/UPI ID: ([\w@.-]+)/i);
                if (notesMatch && notesMatch[1]) {
                    upiIdForQr = notesMatch[1];
                }
    
    
                const companyNameForDisplay = "Sai Finance";
                // ... (other company details remain the same) ...
                const companyAddressLine1 = "[Venkateswarapuram, Tenkasi-627854]";
                const companyContact = "Phone: +91 7868025380 | Email: saifinance622@gmail.com";
                const companyGstin = bill.yourCompanyDetails?.gstin || "[YOUR GSTIN IF APPLICABLE]";
    
    
                billViewArea.innerHTML = `
                    <div class="invoice-header">
                        <div class="company-logo-name">
                            <h1>BILL</h1>
                            <p class="company-tagline">${companyNameForDisplay}</p>
                        </div>
                        <div class="company-address-contact">
                            <p>${companyAddressLine1}</p>
                            <p>${companyContact}</p>
                            ${companyGstin && companyGstin !== "[YOUR GSTIN IF APPLICABLE]" ? `<p class="gstin">GSTIN: ${companyGstin}</p>` : ''}
                        </div>
                    </div>
    
                    <div class="invoice-meta-details">
                        <div>
                            <h3>Bill To:</h3>
                            <p><strong>${bill.clientName || 'N/A'}</strong></p>
                            <p>${bill.clientAddress ? bill.clientAddress.replace(/\n/g, '<br>') : 'N/A'}</p>
                            <p>Phone: ${bill.clientPhone || 'N/A'}</p>
                            <p>Email: ${bill.clientEmail || 'N/A'}</p>
                        </div>
                        <div>
                            <h3>Bill Details:</h3>
                            <p><strong>Bill #:</strong> ${bill.invoiceNumber || 'N/A'}</p> 
                            <p><strong>Date:</strong> ${formatDate(bill.invoiceDate)}</p>
                            <p><strong>Due Date:</strong> ${formatDate(bill.dueDate)}</p>
                            <p><strong>Status:</strong> <span class="status-${(bill.status || 'draft').toLowerCase()}">${bill.status || 'Draft'}</span></p>
                        </div>
                    </div>
    
                    <div class="invoice-section loan-details-view">
                        <h3>Loan Details:</h3>
                        <p><strong>Loan Type:</strong> ${loanType}</p>
                        <p><strong>Loan Application No.:</strong> ${loanApplicationNumber}</p>
                        <p><strong>Loan Account No.:</strong> ${loanAccountNumber}</p>
                        <p><strong>Loan Disbursement Amount:</strong> ${loanDisbursementAmount}</p>
                    </div>
                    
    
                    <table class="invoice-items-table-view">
                        <thead><tr><th>#</th><th>Description</th><th class="number-cell">Qty</th><th class="number-cell">Unit Price (₹)</th><th class="number-cell">Amount (₹)</th></tr></thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
    
                    <div class="invoice-summary-container">
                        <div class="invoice-summary-view">
                            <table>
                                <tr><td>Subtotal:</td><td>₹${(bill.subTotal !== undefined ? parseFloat(bill.subTotal) : 0).toFixed(2)}</td></tr>
                                ${bill.intraStateGstApplied ? `
                                    <tr><td>CGST (${bill.cgstRate || 0}%):</td><td>₹${(bill.cgstAmount !== undefined ? parseFloat(bill.cgstAmount) : 0).toFixed(2)}</td></tr>
                                    <tr><td>SGST (${bill.sgstRate || 0}%):</td><td>₹${(bill.sgstAmount !== undefined ? parseFloat(bill.sgstAmount) : 0).toFixed(2)}</td></tr>
                                ` : ''}
                                <tr class="total-row"><td>Total Amount:</td><td>₹${(bill.totalAmount !== undefined ? parseFloat(bill.totalAmount) : 0).toFixed(2)}</td></tr>
                            </table>
                        </div>
                    </div>
    
                    <div class="invoice-notes-qr-container">
                        <div class="invoice-notes-view">
                            <h4>Notes / Payment Instructions:</h4>
                            <p>${bill.notes || 'No specific notes provided.'}</p>
                        </div>
                        <div class="qr-code-view">
                            <h4>Scan to Pay (GPay)</h4>
                            <img src="images/gpay-qr-placeholder.png" alt="GPay QR Code Placeholder">
                            <p>(UPI ID: ${upiIdForQr})</p>
                        </div>
                    </div>
                    
                    <div class="invoice-footer-view">
                        <p>Thank you for your business!</p>
                    </div>
                `;
            } else {
                billViewArea.innerHTML = '<p style="text-align:center; color:red; padding-top:30px;">Bill not found or you do not have permission to view it.</p>';
            }
        } catch (error) {
            console.error("Error loading bill for view:", error);
            billViewArea.innerHTML = `<p style="text-align:center; color:red; padding-top:30px;">Error loading bill details: ${error.message}</p>`;
        }
    }