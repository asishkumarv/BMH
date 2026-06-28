const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", err.message);
  }
} else {
  const localKeyPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(localKeyPath)) {
    serviceAccount = require("./serviceAccountKey.json");
  } else {
    console.error("⚠️ Firebase credentials not found. Please set FIREBASE_SERVICE_ACCOUNT in Render.");
  }
}

if (serviceAccount) {
  try {
    const { initializeApp, cert } = require('firebase-admin/app');
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("✅ Firebase Admin Initialized");
  } catch (err) {
    console.error("⚠️ Firebase Admin skipped initialization (error):", err.message);
  }
} else {
  console.log("⚠️ Firebase Admin skipped initialization (missing credentials)");
}

module.exports = admin;
