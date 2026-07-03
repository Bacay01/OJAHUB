// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — LAYOUT
// admin/js/admin-layout.js
//
// Loads sidebar.html, highlights active nav link, wires
// mobile drawer, and fills in the user's email/avatar.
// Waits for adminReady (from admin-auth.js) before showing
// user info so it always reflects the real Firebase user.
// ═══════════════════════════════════════════════════════════

import { adminReady, logout } from "./admin-auth.js";

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
  const userAvatar = document.getElementById("adminUserAvatar");

  // ── Active nav highlight ──────────────────────────────
  const currentPage =
    window.location.pathname.split("/").pop().replace(".html", "") || "index";

  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    if (link.dataset.page === currentPage) {
      link.classList.add("active");
    }
  });

  // ── Fill user info once Firebase auth resolves ────────
  adminReady.then((admin) => {
    const email = admin?.email || "Admin";
    if (userEmailEl) userEmailEl.textContent = email;
    if (userAvatar) userAvatar.textContent = email.charAt(0).toUpperCase();
  });

  // ── Mobile drawer ─────────────────────────────────────
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

  document.querySelectorAll(".admin-nav-link").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  // ── Logout ────────────────────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmed = confirm("Log out of the admin console?");
      if (confirmed) await logout();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});
