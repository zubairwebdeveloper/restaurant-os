import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

/**
 * Browser Firebase client. Contains only PUBLIC web config (NEXT_PUBLIC_*).
 * Never import firebase-admin or private keys here.
 * Initialise lazily, from client code only, and never put these instances in Redux.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
const EMULATOR_HOST = "127.0.0.1";

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(config);
}

let authInstance;
export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    if (useEmulator) connectAuthEmulator(authInstance, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  }
  return authInstance;
}

let firestoreInstance;
export function getFirebaseFirestore() {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
    if (useEmulator) connectFirestoreEmulator(firestoreInstance, EMULATOR_HOST, 8080);
  }
  return firestoreInstance;
}

let storageInstance;
export function getFirebaseStorage() {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
    if (useEmulator) connectStorageEmulator(storageInstance, EMULATOR_HOST, 9199);
  }
  return storageInstance;
}
