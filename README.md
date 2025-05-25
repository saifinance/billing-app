# billing-app

## Security Note on Firebase API Key

This project uses Firebase for its backend services. The Firebase configuration, located in `public/js/config.js`, includes an `apiKey`. It's important to understand the nature of this key:

*   **Firebase Web API Keys are Intended to be Public:** Unlike server-side API keys, Firebase Web API keys are designed to be included in client-side code. They identify your Firebase project to Firebase servers.
*   **Security is Enforced by Firebase Security Rules:** Access to your Firebase data (Firestore, Realtime Database, Storage) is controlled by Firebase Security Rules, which you must configure carefully. The API key itself does not grant direct access to your data.
*   **Restricting Your API Key:** While the key is public, you **must** restrict its usage in the Google Cloud Console. This helps prevent unauthorized use of your Firebase project by other applications. Key restrictions can include:
    *   **HTTP referrers:** Restrict the key to be used only from your application's domains.
    *   **API restrictions:** Limit the key to only be able to call the specific Firebase services your application needs.
*   **Regular Review and Rotation:**
    *   Regularly review the permissions associated with this key in the Google Cloud Console.
    *   If you suspect your key has been compromised or was previously unrestricted, you should rotate it: generate a new key in the Firebase console, update it in `public/js/config.js`, and delete the old key.

The security alert regarding an "exposed Google API Key" likely refers to the Firebase `apiKey`. By following the practices above, you can ensure your Firebase project remains secure. Always refer to the [official Firebase documentation](https://firebase.google.com/docs/projects/api-keys) for the most up-to-date security best practices.