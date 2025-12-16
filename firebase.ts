// Fix: Use namespace import to avoid 'no exported member' error
import * as firebaseApp from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Helper to check if config is valid
const isFirebaseConfigured = () => {
  return !!process.env.FIREBASE_API_KEY;
};

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app;
let db: any;
let auth: any;

try {
  if (isFirebaseConfigured()) {
    // Fix: Access initializeApp from the namespace object
    app = firebaseApp.initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase credentials missing. Running in local-only mode.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { db, auth, isFirebaseConfigured };

// Collection References (Safe to import even if db is undefined, but check db before usage)
export const collections = {
  logs: (db: any) => collection(db, "logs"),
  contacts: (db: any) => collection(db, "contacts"),
  nodes: (db: any) => collection(db, "api_nodes"),
  protected: (db: any) => collection(db, "protected_numbers"),
  users: (db: any) => collection(db, "users"),
  sessions: (db: any) => collection(db, "active_sessions")
};