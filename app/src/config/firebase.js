import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA9C25dxaptLWTaBPRy8D7xmzpv6lv4ZMw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "zgadulica.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "zgadulica",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "zgadulica.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "210221782427",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:210221782427:web:e5502e03b4af538bf0fd3e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Exporting additional Firestore functions for use in real-time matchmaking & gameplay
export { updateDoc, addDoc, onSnapshot, query, where, collection, doc, getDocs };

export async function signInWithGoogleIdToken(idToken) {
  if (!idToken) throw new Error('Missing Google credential');
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export function observeFirebaseAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUserClaims(forceRefresh = false) {
  if (!auth.currentUser) return {};
  const token = await auth.currentUser.getIdTokenResult(forceRefresh);
  return token.claims || {};
}

async function currentUserIsAdmin() {
  const claims = await getCurrentUserClaims(false);
  return claims.admin === true;
}

function currentUserOwnsEmail(email) {
  return !!auth.currentUser?.email
    && !!email
    && auth.currentUser.email.toLowerCase().trim() === email.toLowerCase().trim();
}

export async function logoutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.error('Logout error:', e);
  }
}

/**
 * Sync user profile to Firestore database
 */
export async function syncUserProfile(userProfile) {
  if (!userProfile?.email) return;
  if (!currentUserOwnsEmail(userProfile.email)) {
    console.warn('Firestore sync blocked: authenticated user does not own this profile.');
    return;
  }
  try {
    const cleanEmail = userProfile.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "users", cleanEmail), {
      email: userProfile.email,
      name: userProfile.name,
      town: userProfile.town,
      avatarId: userProfile.avatarId,
      car: userProfile.car,
      stats: userProfile.stats || {},
      challengeAttempts: userProfile.challengeAttempts || {},
      hasCompletedProfile: userProfile.hasCompletedProfile || false,
      hasCompletedOnboarding: userProfile.hasCompletedOnboarding || false,
      hideEmail: userProfile.hideEmail || false,
      isPremium: userProfile.isPremium || false,
      customAvatar: userProfile.customAvatar || null,
      dailyGamesPlayed: userProfile.dailyGamesPlayed || { date: '', count: 0 },
      onlineWins: userProfile.onlineWins || 0,
      onlineLosses: userProfile.onlineLosses || 0,
      onlineDraws: userProfile.onlineDraws || 0,
      mapStyle: userProfile.mapStyle || 'dark',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore sync note:', e.message);
  }
}

/**
 * Fetch a single user profile from Firestore
 */
export async function fetchUserProfile(email) {
  if (!email) return null;
  try {
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const docSnap = await withRetry(() => getDoc(doc(db, "users", cleanEmail)));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (e) {
    console.warn('Firestore fetchUserProfile error:', e.message);
  }
  return null;
}

/**
 * Add / Save a Daily Challenge in Firestore
 */
export async function saveDailyChallenge(challenge) {
  try {
    if (!(await currentUserIsAdmin())) return false;
    // challenge: { id, title, description, icon, rounds, timeLimit, gameMode, streets, date }
    await setDoc(doc(db, "challenges", challenge.id), challenge);
    return true;
  } catch (e) {
    console.error('Firestore saveDailyChallenge error:', e);
    return false;
  }
}

function withTimeout(promise, timeoutMs = 2000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs))
  ]);
}

async function withRetry(operation, retries = 3, delayMs = 300, timeoutMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const currentTimeout = timeoutMs + (attempt - 1) * 500;
      return await withTimeout(operation(), currentTimeout);
    } catch (error) {
      console.warn(`Firestore attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Fetch all Daily Challenges from Firestore
 */
export async function fetchDailyChallenges() {
  try {
    const querySnapshot = await withRetry(() => getDocs(collection(db, "challenges")));
    const challenges = [];
    querySnapshot.forEach((docSnap) => {
      challenges.push(docSnap.data());
    });
    return challenges;
  } catch (e) {
    console.warn('Firestore fetchDailyChallenges error/timeout after retries:', e.message);
    return null;
  }
}

/**
 * Fetch all global user profiles registered across all devices
 */
export async function fetchAllCloudProfiles() {
  try {
    const querySnapshot = await withRetry(() => getDocs(collection(db, "users")));
    const users = [];
    querySnapshot.forEach((docSnap) => {
      users.push(docSnap.data());
    });
    return users;
  } catch (e) {
    console.warn('Firestore fetchAllCloudProfiles error/timeout after retries:', e.message);
    return null;
  }
}

/**
 * Delete a user profile from Firestore
 */
export async function deleteUserProfile(email) {
  if (!email) return false;
  try {
    if (!currentUserOwnsEmail(email) && !(await currentUserIsAdmin())) return false;
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await deleteDoc(doc(db, "users", cleanEmail));
    return true;
  } catch (e) {
    console.warn('Firestore delete note:', e.message);
    return false;
  }
}

/**
 * Update a user's avatar in Firestore
 */
export async function updateUserAvatar(email, avatarId) {
  if (!email || !avatarId) return false;
  try {
    if (!currentUserOwnsEmail(email)) return false;
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "users", cleanEmail), {
      avatarId: avatarId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore updateUserAvatar error:', e.message);
    return false;
  }
}

/**
 * Update arbitrary editable profile fields from the admin panel
 */
export async function updateUserProfileByEmail(email, fields) {
  if (!email || !fields || typeof fields !== 'object') return false;
  try {
    if (!(await currentUserIsAdmin())) return false;
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "users", cleanEmail), {
      ...fields,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore updateUserProfileByEmail error:', e.message);
    return false;
  }
}

/**
 * Reset one or all challenge attempts for a user
 */
export async function resetUserChallengeAttempt(email, challengeId = null) {
  if (!email) return false;
  try {
    if (!(await currentUserIsAdmin())) return false;
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const userRef = doc(db, "users", cleanEmail);
    if (challengeId) {
      const snap = await getDoc(userRef);
      const currentAttempts = snap.exists() ? (snap.data().challengeAttempts || {}) : {};
      const nextAttempts = { ...currentAttempts };
      delete nextAttempts[challengeId];
      await setDoc(userRef, {
        challengeAttempts: nextAttempts,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      await setDoc(userRef, {
        challengeAttempts: {},
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    return true;
  } catch (e) {
    console.warn('Firestore resetUserChallengeAttempt error:', e.message);
    return false;
  }
}

/**
 * Update a user's Premium status in Firestore
 */
export async function updateUserPremiumStatus(email, isPremium) {
  if (!email) return false;
  try {
    if (!(await currentUserIsAdmin())) return false;
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, "users", cleanEmail), {
      isPremium: isPremium,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore updateUserPremiumStatus error:', e.message);
    return false;
  }
}

/**
 * Delete a Daily Challenge from Firestore
 */
export async function deleteDailyChallenge(challengeId) {
  if (!challengeId) return false;
  try {
    if (!(await currentUserIsAdmin())) return false;
    await deleteDoc(doc(db, "challenges", challengeId));
    return true;
  } catch (e) {
    console.error('Firestore deleteDailyChallenge error:', e);
    return false;
  }
}

export async function fetchAppSettings() {
  try {
    const docSnap = await withRetry(() => getDoc(doc(db, "settings", "app")));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    console.warn('Firestore fetchAppSettings error:', e.message);
    return null;
  }
}

export async function saveAppSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  try {
    if (!(await currentUserIsAdmin())) return false;
    await setDoc(doc(db, "settings", "app"), {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Firestore saveAppSettings error:', e.message);
    return false;
  }
}
