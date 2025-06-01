const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Renamed for clarity, as it's now an auth trigger
exports.assignAdminOnFirstSignup = functions.auth.user().onCreate(async (user) => {
    const { uid, email } = user;
    console.log(`New user signed up: UID=${uid}, Email=${email}`);

    const usersRef = admin.firestore().collection('users');

    try {
        // Check if any user document already exists in the 'users' collection.
        // This is a simple way to check if this is the very first user signing up.
        // More robust checks might involve looking for an existing admin specifically.
        const snapshot = await usersRef.limit(1).get();

        if (snapshot.empty) {
            console.log(`No users found in 'users' collection. Attempting to make ${email} (UID: ${uid}) an admin.`);

            // Set admin custom claim
            await admin.auth().setCustomUserClaims(uid, { admin: true });
            console.log(`Successfully set admin custom claim for ${email}`);

            // Create a user document in Firestore for the new admin
            await usersRef.doc(uid).set({
                uid: uid,
                email: email,
                admin: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Successfully created Firestore user document for admin ${email}`);

            // Optional: Log admin creation to a separate log collection
            await admin.firestore().collection('adminLog').add({
                uid,
                email,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                action: 'first_user_admin_assigned_on_signup'
            });

            return { message: `User ${email} successfully made admin.` };
        } else {
            console.log(`Users already exist in 'users' collection. User ${email} will not be made admin automatically.`);
            // Optionally, create a non-admin user document here if all users should have one
            // await usersRef.doc(uid).set({
            //     uid: uid,
            //     email: email,
            //     admin: false, // Explicitly false
            //     createdAt: admin.firestore.FieldValue.serverTimestamp()
            // });
            return { message: `User ${email} is not the first user, not made admin.` };
        }
    } catch (error) {
        console.error('Error in assignAdminOnFirstSignup function:', error);
        // To prevent the function from retrying indefinitely on errors during claim setting,
        // it's often better to log the error and not re-throw, or throw a non-retryable error.
        return { error: 'Failed to process new user for admin assignment.', details: error.message };
    }
});