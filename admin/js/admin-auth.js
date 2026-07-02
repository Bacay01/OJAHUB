// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — AUTH GATE
// admin/js/admin-auth.js
//
// Import this at the TOP of every admin/*.html page EXCEPT
// login.html. It checks for a valid session and redirects to
// login.html immediately if none is found — before any other
// page content/data loads.
//
// USAGE (in every protected admin page, as early as possible):
//   <script type="module" src="js/admin-auth.js"></script>
//   <!-- then your other admin scripts after this one -->
//
// WHEN GOING LIVE WITH FIREBASE:
//   Replace the sessionStorage check below with a real
//   onAuthStateChanged() listener from firebase.js, and check
//   against an "admins" Firestore collection or custom claim
//   instead of a hardcoded session flag. The redirect logic
//   and SESSION_KEY constant can stay the same.
// ═══════════════════════════════════════════════════════════

const SESSION_KEY = "ojahub_admin_session";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

function isSessionValid() {
  const active = sessionStorage.getItem(SESSION_KEY);
  if (active !== "active") return false;

  const loginTime = parseInt(
    sessionStorage.getItem("ojahub_admin_login_time") || "0",
    10,
  );
  if (!loginTime) return false;

  const age = Date.now() - loginTime;
  if (age > SESSION_MAX_AGE_MS) {
    // Session expired — clear it
    clearSession();
    return false;
  }

  return true;
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("ojahub_admin_email");
  sessionStorage.removeItem("ojahub_admin_login_time");
}

// ── Run the gate immediately on import ──────────────────
if (!isSessionValid()) {
  // Figure out the correct relative path back to login.html
  // based on how deep the current page is inside /admin/.
  // All admin pages currently sit flat in /admin/, so this is
  // simple — but written defensively in case of future nesting.
  window.location.href = "login.html";
}

// ── Exported helpers for other admin scripts ────────────
export function getAdminEmail() {
  return sessionStorage.getItem("ojahub_admin_email") || "Admin";
}

export function logout() {
  clearSession();
  window.location.href = "login.html";
}

export { isSessionValid, SESSION_KEY };
