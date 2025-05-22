// --- Firestore Service ---

// Generate a unique ID (if needed, Firestore auto-generates for new docs)
// function generateId() {
//     return db.collection('dummy').doc().id;
// }

// Get a new unique invoice number (example logic, enhance as needed)
async function getNextInvoiceNumber() {
    // This is a simple example. For robustness, use a dedicated counter document or query last invoice.
    const year = new Date().getFullYear();
    try {
        const querySnapshot = await db.collection('invoices')
                                      .where('invoiceNumber', '>=', `INV-${year}-0000`)
                                      .orderBy('invoiceNumber', 'desc')
                                      .limit(1)
                                      .get();
        if (!querySnapshot.empty) {
            const lastInvoice = querySnapshot.docs[0].data();
            const lastNumStr = lastInvoice.invoiceNumber.split('-').pop();
            const nextNum = parseInt(lastNumStr, 10) + 1;
            return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
        }
        return `INV-${year}-0001`;
    } catch (error) {
        console.error("Error getting next invoice number:", error);
        return `INV-${year}-0001`; // Fallback
    }
}


// Create or Update Invoice
async function saveInvoice(invoiceData, invoiceId = null) {
    try {
        invoiceData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        if (invoiceId) {
            // Update existing invoice
            await db.collection('invoices').doc(invoiceId).update(invoiceData);
            console.log('Invoice updated successfully: ', invoiceId);
            return invoiceId;
        } else {
            // Create new invoice
            invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('invoices').add(invoiceData);
            console.log('Invoice saved successfully with ID: ', docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error saving invoice: ', error);
        throw error; // Re-throw to handle in app.js
    }
}

// Get All Invoices
async function getInvoices() {
    try {
        const snapshot = await db.collection('invoices').orderBy('createdAt', 'desc').get();
        const invoices = [];
        snapshot.forEach(doc => {
            invoices.push({ id: doc.id, ...doc.data() });
        });
        return invoices;
    } catch (error) {
        console.error('Error getting invoices: ', error);
        throw error;
    }
}

// Get a Single Invoice by ID
async function getInvoiceById(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        } else {
            console.log('No such invoice found!');
            return null;
        }
    } catch (error) {
        console.error('Error getting invoice by ID: ', error);
        throw error;
    }
}

// Delete Invoice
async function deleteInvoice(invoiceId) {
    try {
        await db.collection('invoices').doc(invoiceId).delete();
        console.log('Invoice deleted successfully: ', invoiceId);
    } catch (error) {
        console.error('Error deleting invoice: ', error);
        throw error;
    }
}