// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — AUTH GATE (SECURE VERSION)
// admin/js/admin-auth.js
//
// Import this as the FIRST script on every protected admin
// page (except login.html). It:
//   1. Listens for Firebase Auth state
//   2. If no signed-in user → redirects to login.html
//   3. If signed in → checks /admins/{uid} in Firestore
//   4. If not in admins collection → signs out + redirects
//
// This replaces the previous sessionStorage-based gate which
// could be bypassed by any user with DevTools.
//
// USAGE — at bottom of every protected admin page:
//   <script type="module" src="js/admin-auth.js"></script>
//   <script type="module" src="js/admin-layout.js"></script>
//   <script type="module" src="js/[page].js"></script>
// ═══════════════════════════════════════════════════════════

import { auth, db } from "../../js/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── Internal state ────────────────────────────────────────
let _currentAdmin = null; // { uid, email, ...adminDocData }

// ── Gate — runs immediately on every protected page load ──
export const adminReady = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // No Firebase Auth session at all → go to login
      window.location.href = "login.html";
      return;
    }

    try {
      // Verify this signed-in user is actually an admin
      const adminDoc = await getDoc(doc(db, "admin", user.uid));

      if (!adminDoc.exists()) {
        // Firebase Auth user but not an admin (e.g. a vendor)
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }

      // ✅ Confirmed admin — store info and resolve the promise
      _currentAdmin = {
        uid: user.uid,
        email: user.email,
        ...adminDoc.data(),
      };

      resolve(_currentAdmin);
    } catch (err) {
      console.error("[Admin Auth] Firestore check failed:", err);
      // On error, fail safe — redirect to login
      window.location.href = "login.html";
    }
  });
});

// ── Exported helpers ──────────────────────────────────────

/** Returns the current admin's display email */
export function getAdminEmail() {
  return _currentAdmin?.email || auth.currentUser?.email || "Admin";
}

/** Signs out and redirects to login */
export async function logout() {
  await signOut(auth);
  window.location.href = "login.html";
}

/** Returns the full admin doc data (uid, email, role, etc.) */
export function getCurrentAdmin() {
  return _currentAdmin;
}
