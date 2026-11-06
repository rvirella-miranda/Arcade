// STEP 1 — Paste your Firebase web app config here.
// Firebase console → Project settings (gear icon) → General → Your apps → Web app → "SDK setup and configuration" → Config.
// These values are safe to publish: your data is protected by the rules in firestore.rules, not by hiding this file.
// While apiKey still says PASTE_..., the site runs in DEMO mode: everything works, but data stays in this browser only.
export const firebaseConfig = {
  apiKey: "AIzaSyAvMBO4in7_41E1mVZbYZ_e9wSRl-36fgw",
  authDomain: "arcade-25218.firebaseapp.com",
  projectId: "arcade-25218",
  storageBucket: "arcade-25218.firebasestorage.app",
  messagingSenderId: "27773950124",
  appId: "1:27773950124:web:812ad2a38c651f661e6709"
};

// STEP 2 — Google accounts allowed to open the teacher dashboard.
// Keep this list the same as the list in firestore.rules (the rules are what actually protect the data).
export const TEACHER_EMAILS = [
  "r.miranda@ascensionoakpark.com"
];
