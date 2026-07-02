// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — LAYOUT
// admin/js/admin-layout.js
//
// Handles the shared shell on every protected admin page:
//   - loads sidebar.html into #adminSidebarMount
//   - highlights the active nav link based on current filename
//   - wires up mobile hamburger / drawer / overlay
//   - wires up the logout button (via admin-auth.js)
//   - fills in the topbar title + the user's email
//
// USAGE — each admin/*.html page needs this markup:
//   <div id="adminSidebarMount"></div>
//   <div class="admin-shell">
//     <div class="admin-main">
//       <header class="admin-topbar">
//         <div class="admin-topbar-left">
//           <button class="admin-hamburger" id="adminHamburger">
//             <i class="fa-solid fa-bars"></i>
//           </button>
//           <div class="admin-topbar-title">
//             <h1 data-topbar-title>Page Title</h1>
//             <p data-topbar-sub>Page subtitle</p>
//           </div>
//         </div>
//         <span class="admin-live-badge">
//           <span class="admin-live-dot"></span> Live
//         </span>
//       </header>
//       <main class="admin-content">
//         ...page content...
//       </main>
//     </div>
//   </div>
//
// Then import this AFTER admin-auth.js:
//   <script type="module" src="js/admin-auth.js"></script>
//   <script type="module" src="js/admin-layout.js"></script>
// ═══════════════════════════════════════════════════════════

import { getAdminEmail, logout } from "./admin-auth.js";

async function loadSidebar() {
  const mount = document.getElementById("adminSidebarMount");
  if (!mount) return;

  try {
    const res = await fetch("components/sidebar.html");
    if (!res.ok) throw new Error(res.status);
    mount.innerHTML = await res.text();
  } catch (err) {
    console.error("Failed to load admin sidebar:", err);
    return;
  }

  initSidebarBehavior();
}

function initSidebarBehavior() {
  const sidebar = document.getElementById("adminSidebar");
  const overlay = document.getElementById("adminSidebarOverlay");
  const closeBtn = document.getElementById("sidebarCloseBtn");
  const hamburger = document.getElementById("adminHamburger");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const userEmailEl = document.getElementById("adminUserEmail");
  const userAvatarEl = document.getElementById("adminUserAvatar");

  // ── Highlight active nav link based on current page filename
  const currentPage =
    window.location.pathname.split("/").pop().replace(".html", "") || "index";

  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    if (link.dataset.page === currentPage) {
      link.classList.add("active");
    }
  });

  // ── Fill in user info ──────────────────────────────────
  const email = getAdminEmail();
  if (userEmailEl) userEmailEl.textContent = email;
  if (userAvatarEl) userAvatarEl.textContent = email.charAt(0).toUpperCase();

  // ── Mobile drawer open/close ───────────────────────────
  function openDrawer() {
    sidebar.classList.add("open");
    overlay.classList.add("visible");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    sidebar.classList.remove("open");
    overlay.classList.remove("visible");
    document.body.style.overflow = "";
  }

  if (hamburger) hamburger.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // Close drawer when a nav link is tapped (mobile)
  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  // ── Logout ──────────────────────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const confirmed = confirm("Log out of the admin console?");
      if (confirmed) logout();
    });
  }
}

// ── Run on page load ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});
