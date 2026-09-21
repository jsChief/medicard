# Troubleshooting Firebase Auth: Signed-In State Without Navigation

When a web application using Firebase Auth shows a user as signed in (or displays a success popup) but fails to navigate to the home page—especially after email verification—it almost always stems from a disconnect between Firebase's client-side user state and your application's routing guards or async flow.

---

## Primary Causes & Solutions

### 1. Cached `emailVerified` State (Most Common)
When a user verifies their email via the link sent by Firebase, the local Firebase SDK instance running in their browser tab **does not automatically update** the `currentUser.emailVerified` boolean.

* **The Issue:** Your navigation logic or route guard checks `user.emailVerified`. Because the local user token is cached from when they signed up/in *before* verifying, `emailVerified` remains `false`, blocking the redirect.
* **The Fix:** Explicitly call `await auth.currentUser.reload()` before checking the verification status or performing the navigation.

```javascript
// Force refresh user data from Firebase Auth backend
if (auth.currentUser) {
  await auth.currentUser.reload();

  if (auth.currentUser.emailVerified) {
    // Navigate to homepage
    router.push('/dashboard');
  } else {
    // Prompt user to verify email
    showVerificationNotice();
  }
}
```

---

### 2. Unhandled Async State in `onAuthStateChanged`
If your application relies on `onAuthStateChanged` for global auth handling, race conditions can prevent routing. The listener may trigger before your global state context (e.g., React Context, Vuex/Pinia, Redux) updates, or before claims are refreshed.

* **The Issue:** The UI reflects a signed-in user, but your router guard evaluates stale claims or an uninitialized app state, silently aborting the route change.
* **The Fix:** Force a fresh token fetch using `getIdToken(true)` inside your auth listener to ensure custom claims and server-side attributes sync properly before navigating.

```javascript
import { onAuthStateChanged } from "firebase/auth";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Force token refresh to sync server-side changes (e.g., email verification)
    await user.getIdToken(true);
    await user.reload();

    if (user.emailVerified) {
      router.push('/home');
    } else {
      router.push('/verify-email');
    }
  } else {
    router.push('/login');
  }
});
```

---

### 3. Missing or Blocking Firestore / Database Reads
Many applications attempt to fetch a user profile document from Firestore or Realtime Database *before* completing the redirect to the main page.

* **The Issue:**
  1. A missing profile document causes a silent unhandled promise rejection.
  2. Restrictive Security Rules block unverified users from reading user data, throwing a `FirebaseError: Missing or insufficient permissions`.
* **The Fix:**
  * Open your browser console to verify if database permission errors occur during sign-in.
  * Ensure Security Rules permit reading basic user profile data once authenticated, or write rules that accommodate unverified states gracefully.

```javascript
// Example Security Rule allowance
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

### 4. Third-Party Cookie & Cross-Origin Pop-up Restrictions
If using `signInWithPopup` or `signInWithRedirect`:

* **The Issue:** Browsers with strict privacy settings (such as Safari with ITP or Brave) block third-party cookies or storage access, causing the authentication window to complete successfully internally while failing to pass the auth token back to the main window thread.
* **The Fix:** Configure explicit storage persistence using `IndexedDB`:

```javascript
import { setPersistence, browserLocalPersistence } from "firebase/auth";

await setPersistence(auth, browserLocalPersistence);
```

---

## Quick Diagnostic Checklist

1. **Console Inspection:** Check the browser developer tools console for unhandled promise rejections, CORS errors, or `FirebaseError: Missing or insufficient permissions`.
2. **Manual Page Refresh Test:** Does manually refreshing the page immediately log the user in and route them correctly?
   * **If YES:** The issue is guaranteed to be a missing `user.reload()` call or an unhandled async race condition in your route guard.