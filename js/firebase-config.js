// STEP 1 — Paste your Firebase web app config here.
// Firebase console → Project settings (gear icon) → General → Your apps → Web app → "SDK setup and configuration" → Config.
// These values are safe to publish: your data is protected by the rules in firestore.rules, not by hiding this file.
// While apiKey still says PASTE_..., the site runs in DEMO mode: everything works, but data stays in this browser only.
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

// STEP 2 — Google accounts allowed to open the teacher dashboard.
// Keep this list the same as the list in firestore.rules (the rules are what actually protect the data).
export const TEACHER_EMAILS = [
  "r.miranda@ascensionoakpark.com"
];
