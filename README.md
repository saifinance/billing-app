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

## Testing Responsive Design

The web application has been updated with responsive styles to improve usability on various screen sizes, including mobile devices. To test the responsiveness:

1.  **Browser Developer Tools:**
    *   Open your web browser's developer tools (usually by right-clicking on the page and selecting "Inspect" or "Inspect Element", or by pressing F12).
    *   Look for a "Toggle device toolbar" icon or a similar option that allows you to simulate different screen sizes (e.g., various phone models, tablets, or custom dimensions).
    *   Select different devices or manually resize the viewport to observe how the layout adapts.

2.  **Resizing the Browser Window:**
    *   On a desktop computer, simply resize your browser window by dragging its edges. This will show how the layout changes as the available width decreases or increases.

3.  **Physical Devices (Recommended):**
    *   If possible, test the application on actual mobile phones and tablets to get the most accurate feel for the user experience on those devices.

**Key areas to check:**

*   **Navigation:** Ensure the navigation menu (hamburger menu on smaller screens) is functional and easy to use.
*   **Tables:** Check that tables (e.g., on the dashboard, invoice creation items) are scrollable horizontally or stack appropriately without breaking the page layout.
*   **Forms:** Verify that form elements are well-aligned, readable, and easy to interact with on smaller screens.
*   **Readability:** Ensure text is legible and that there are no overlapping elements.
*   **Buttons and Links:** Confirm that buttons and links are easily clickable (good touch target size) on touch devices.