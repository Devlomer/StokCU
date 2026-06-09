// StokCU — Firebase Service (Realtime Database — same pattern as MinibarCI)
// Uses window.firebase compat SDK loaded via <script> tags in index.html
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase app (shared project with MinibarCI & SarapCI)
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}
export const db = window.firebase.database();

// ── Products Config: Read from RTDB ──

export async function fetchProductsFromDb() {
  try {
    const snapshot = await db.ref('stokcu/config/categories').once('value');
    const data = snapshot.val();
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Firebase fetchProducts error:', err);
  }
  return null;
}

export async function saveProductsToDb(categories) {
  await db.ref('stokcu/config/categories').set(categories);
}

// ── Admin Password ──

export async function verifyAdminPassword(enteredPassword) {
  try {
    const snapshot = await db.ref('stokcu/config/adminPassword').once('value');
    const dbPassword = snapshot.val();
    if (dbPassword) {
      return dbPassword === enteredPassword;
    }
  } catch (err) {
    console.warn('Firebase verifyAdmin error:', err);
  }
  // Fallback default
  return enteredPassword === 'lujo2026';
}

// ── Orders/Requests: Push & Listen ──

export function sendRequestToDb(request) {
  return db.ref('stokcu/requests').push(request);
}

export function listenToRequests(callback) {
  const ref = db.ref('stokcu/requests');
  const handler = ref.orderByChild('timestamp').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    // Convert object to array with IDs, newest first
    const requests = Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    callback(requests);
  }, (err) => {
    console.error('Firebase requests listener error:', err);
  });

  // Return unsubscribe function
  return () => ref.off('value', handler);
}

export function deleteRequestFromDb(requestId) {
  return db.ref('stokcu/requests/' + requestId).remove();
}
