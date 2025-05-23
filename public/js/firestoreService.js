// public/js/firestoreService.js

console.log("firestoreService.js STARTING");

async function getNextInvoiceNumber() { // Or getNextBillNumber if you renamed it
    const user = firebase.auth().currentUser;
    if (!user) {
        console.warn("getNextBillNumber called without user. Using fallback.");
        const year_no_user = new Date().getFullYear();
        return `BILL-${year_no_user}-LOGIN-REQUIRED`;
    }
    const year = new Date().getFullYear();
    const prefix = `BILL-${year}-`; // Using BILL prefix
    try {
        const querySnapshot = await db.collection('invoices')
                                      .where('userId', '==', user.uid)
                                      .where('invoiceNumber', '>=', prefix + '0000')
                                      .where('invoiceNumber', '<', prefix + '9999')
                                      .orderBy('invoiceNumber', 'desc')
                                      .limit(1)
                                      .get();
        if (!querySnapshot.empty) {
            const lastBill = querySnapshot.docs[0].data();
            if (lastBill.invoiceNumber && lastBill.invoiceNumber.startsWith(prefix)) {
                const lastNumStr = lastBill.invoiceNumber.substring(prefix.length);
                if (!isNaN(parseInt(lastNumStr, 10))) {
                    const nextNum = parseInt(lastNumStr, 10) + 1;
                    return `${prefix}${String(nextNum).padStart(4, '0')}`;
                }
            }
        }
        return `${prefix}0001`;
    } catch (error) {
        console.error("Error getting next bill number:", error);
        return `BILL-${year}-ERR`;
    }
}

// *******************************************************************
// ****** ADD THE FOLLOWING MISSING FUNCTIONS STARTING FROM HERE ******
// *******************************************************************

async function saveInvoice(invoiceData, invoiceId = null) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('SaveInvoice: User not logged in!');
        throw new Error('You must be logged in to save an invoice.');
    }
    invoiceData.userId = user.uid; // Associate invoice with the logged-in user

    try {
        invoiceData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        if (invoiceId) {
            const docRef = db.collection('invoices').doc(invoiceId);
            await docRef.set(invoiceData, { merge: true });
            console.log('Invoice updated successfully: ', invoiceId);
            return invoiceId;
        } else {
            invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('invoices').add(invoiceData);
            console.log('Invoice saved successfully with ID: ', docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error saving invoice in firestoreService:', error);
        throw error;
    }
}

async function getInvoices() {
    const user = firebase.auth().currentUser;
    if (!user) {
        return [];
    }
    try {
        const snapshot = await db.collection('invoices')
                                 .where('userId', '==', user.uid)
                                 .orderBy('createdAt', 'desc')
                                 .get();
        const invoices = [];
        snapshot.forEach(doc => invoices.push({ id: doc.id, ...doc.data() }));
        return invoices;
    } catch (error) {
        console.error('Error getting invoices:', error);
        if (error.code === 'permission-denied') {
            console.warn("Permission denied fetching invoices. Ensure Firestore rules are correct for list operations by authenticated users.");
        }
        return [];
    }
}

async function getInvoiceById(invoiceId) { // Or getBillById if you rename
    const user = firebase.auth().currentUser;
    if (!user) {
        return null;
    }
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        if (doc.exists && doc.data().userId === user.uid) {
            return { id: doc.id, ...doc.data() };
        } else if (doc.exists && doc.data().userId !== user.uid) {
            console.warn('Permission denied: User does not own this invoice/bill.');
            return null;
        } else {
            console.log('No such invoice/bill found or user mismatch.');
            return null;
        }
    } catch (error) {
        console.error('Error getting invoice/bill by ID:', error);
        return null;
    }
}

async function deleteInvoice(invoiceId) { // Or deleteBill if you rename
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error("Authentication required to delete.");
    }
    try {
        const docRef = db.collection('invoices').doc(invoiceId);
        const doc = await docRef.get();
        if (doc.exists && doc.data().userId === user.uid) {
            await docRef.delete();
            console.log('Invoice/Bill deleted successfully: ', invoiceId);
        } else {
            throw new Error("Permission denied or invoice/bill not found.");
        }
    } catch (error) {
        console.error('Error deleting invoice/bill:', error);
        throw error;
    }
}

// *******************************************************************
// ****** END OF MISSING FUNCTIONS ***********************************
// *******************************************************************


console.log("firestoreService.js FINISHED");
if (typeof saveInvoice === 'function') {
    console.log("saveInvoice IS a function in firestoreService.js global scope AFTER definition.");
} else {
    console.error("saveInvoice IS UNDEFINED in firestoreService.js global scope AFTER definition.");
}