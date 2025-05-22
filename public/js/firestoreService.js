// js/firestoreService.js

function getDbInstance() {
    if (firebase && firebase.apps.length > 0 && typeof firebase.firestore === 'function') {
        return firebase.firestore();
    } else {
        console.error("Firebase not initialized or Firestore module not available when trying to get DB instance.");
         // Attempt to initialize if config is available
        if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function' && typeof firebaseConfig !== 'undefined' && firebase.apps.length === 0) {
            console.warn("Attempting to initialize Firebase from firestoreService.js as it wasn't initialized before.");
            firebase.initializeApp(firebaseConfig);
            if (typeof firebase.firestore === 'function') return firebase.firestore();
        }
        alert("Database service is not available. Please try again later.");
        return null;
    }
}

async function getNextInvoiceNumber(userId) { // Pass userId if numbering is per user
    const db = getDbInstance();
    if (!db) return `INV-${new Date().getFullYear()}-0001`;

    const year = new Date().getFullYear();
    try {
        // If invoice numbers are global, remove .where('userId', '==', userId)
        // If per user, keep it and ensure new invoices have userId
        const querySnapshot = await db.collection('invoices')
                                      .where('userId', '==', userId) // For user-specific sequential numbers
                                      .orderBy('invoiceNumber', 'desc') // Requires an index if combined with other where
                                      .limit(1)
                                      .get();
        if (!querySnapshot.empty) {
            const lastInvoice = querySnapshot.docs[0].data();
            // Basic increment; consider a more robust counter for high concurrency
            const parts = lastInvoice.invoiceNumber.split('-');
            let nextNum = 1;
            if (parts.length > 1) {
                 const numPart = parseInt(parts[parts.length -1], 10);
                 if (!isNaN(numPart)) nextNum = numPart + 1;
            }
            return `INV-${year}-${String(nextNum).padStart(4, '0')}`; // Example: INV-2023-0001
        }
        return `INV-${year}-0001`;
    } catch (error) {
        console.error("Error getting next invoice number:", error);
        return `INV-${year}-0001`; // Fallback
    }
}

async function saveInvoice(invoiceData, invoiceId = null) { // invoiceData should include userId
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not available");

    if (!invoiceData.userId) {
        console.error("Attempting to save invoice without userId!");
        throw new Error("User ID is missing from invoice data.");
    }

    try {
        invoiceData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        if (invoiceId) {
            await db.collection('invoices').doc(invoiceId).update(invoiceData);
            console.log('Invoice updated successfully: ', invoiceId);
            return invoiceId;
        } else {
            invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('invoices').add(invoiceData);
            console.log('Invoice saved successfully with ID: ', docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error saving invoice: ', error);
        throw error;
    }
}

async function getInvoices(userId) { // Fetch invoices for specific user
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not available");

    try {
        const snapshot = await db.collection('invoices')
                                .where('userId', '==', userId)
                                .orderBy('createdAt', 'desc')
                                .get();
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

async function getInvoiceById(invoiceId, userId) { // Ensure user can only get their own invoice
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not available");

    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        if (doc.exists) {
            const invoiceData = doc.data();
            if (invoiceData.userId === userId) { // Security check
                return { id: doc.id, ...invoiceData };
            } else {
                console.warn("User attempted to access an unauthorized invoice.");
                return null; // Or throw an error
            }
        } else {
            console.log('No such invoice found!');
            return null;
        }
    } catch (error) {
        console.error('Error getting invoice by ID: ', error);
        throw error;
    }
}

async function deleteInvoice(invoiceId, userId) { // Ensure user can only delete their own
    const db = getDbInstance();
    if (!db) throw new Error("Firestore not available");
    // It's better to rely on Firestore rules for security, but client-side check is good too.
    // For deletion, rules are primary. This function might just call delete if rules allow.
    try {
        // Optional: Fetch doc first to check userId if rules aren't perfectly restrictive on delete.
        // const doc = await db.collection('invoices').doc(invoiceId).get();
        // if (doc.exists && doc.data().userId === userId) {
        await db.collection('invoices').doc(invoiceId).delete();
        console.log('Invoice deleted successfully: ', invoiceId);
        // } else {
        //     console.warn("Unauthorized attempt to delete invoice or invoice not found.");
        //     throw new Error("Unauthorized or invoice not found.");
        // }
    } catch (error) {
        console.error('Error deleting invoice: ', error);
        throw error;
    }
}