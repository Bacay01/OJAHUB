// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — VENDORS PAGE
// admin/js/vendors.js
//
// Reads from "vendors" (+ "vendor_views" for activity, and
// "products" so listing-related stats stay accurate). Powers
// the stat strip, the two Chart.js charts, and the searchable/
// filterable/paginated vendor table on vendors.html.
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";
import { adminReady } from "./admin-auth.js";

const PAGE_SIZE = 10;

let allVendors = [];
let filteredVendors = [];
let currentPage = 1;
let growthChart = null;
let categoryChart = null;

// ── Wait for admin auth before loading anything ───────────
adminReady.then(() => {
  loadVendors();
  initControls();
});

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return 0;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Same dedup logic used across the rest of the admin (claimed
// vendor doc — has ownerUid — wins over the manually-added one).
function dedupeVendors(vendors) {
  const seen = new Map();
  vendors.forEach((vendor) => {
    const key = (vendor.businessName || "").trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, vendor);
    } else {
      const existing = seen.get(key);
      if (vendor.ownerUid && !existing.ownerUid) {
        seen.set(key, vendor);
      }
    }
  });
  return Array.from(seen.values());
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initialsOf(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "OJ";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────────
// LOAD DATA
// ─────────────────────────────────────────────────────────
async function loadVendors() {
  try {
    const [vendorSnap, viewSnap, productSnap] = await Promise.all([
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "vendor_views")),
      getDocs(collection(db, "products")),
    ]);

    const vendorsRaw = [];
    vendorSnap.forEach((d) => vendorsRaw.push({ id: d.id, ...d.data() }));

    const views = [];
    viewSnap.forEach((d) => views.push(d.data()));

    const products = [];
    productSnap.forEach((d) => products.push(d.data()));

    const deduped = dedupeVendors(vendorsRaw);

    // Attach a couple of derived fields each row will need
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentViewVendorIds = new Set(
      views
        .filter((v) => toMillis(v.timestamp) >= thirtyDaysAgo)
        .map((v) => v.vendorId),
    );

    allVendors = deduped.map((v) => {
      const hasProducts = products.some((p) => {
        if (p.vendorId && p.vendorId === v.id) return true;
        const pName = (p.vendorName || "").trim().toLowerCase();
        const vName = (v.businessName || "").trim().toLowerCase();
        return !!pName && pName === vName;
      });

      return {
        ...v,
        _createdMs: toMillis(v.createdAt),
        _isActive: v.isActive !== false,
        _isClaimed: !!v.ownerUid,
        _isRecentlyActive: recentViewVendorIds.has(v.id) || hasProducts,
      };
    });

    renderStats();
    renderGrowthChart();
    renderCategoryChart();
    populateCategoryFilter();
    applyFilters();
  } catch (err) {
    console.error("Failed to load vendors:", err);
    document.getElementById("vendorTableBody").innerHTML = "";
    document.getElementById("vendorTableError")?.classList.remove("hidden");
    document.getElementById("vendorTableSub").textContent = "Failed to load";
  }
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStats() {
  const active = allVendors.filter((v) => v._isActive);
  const total = active.length;
  const activeVendors = active.filter((v) => v._isRecentlyActive).length;
  const claimed = active.filter((v) => v._isClaimed).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const newThisMonth = active.filter((v) => v._createdMs >= monthStart).length;

  setStat("statTotal", total);
  setStat("statActive", activeVendors);
  setStat("statClaimed", claimed);
  setStat("statNewMonth", newThisMonth);

  document
    .querySelectorAll("#vendorStatStrip .admin-stat-card")
    .forEach((card) => (card.style.opacity = "1"));
}

function setStat(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val.toLocaleString();
}

// ─────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────
function renderGrowthChart() {
  const canvas = document.getElementById("vendorGrowthChart");
  const emptyEl = document.getElementById("vendorGrowthEmpty");
  if (!canvas) return;

  const monthLabels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      cutoff: new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime(),
    });
  }

  const active = allVendors.filter((v) => v._isActive);
  const data = monthLabels.map(
    ({ cutoff }) =>
      active.filter((v) => v._createdMs === 0 || v._createdMs < cutoff).length,
  );

  if (active.length === 0) {
    emptyEl?.classList.remove("hidden");
    return;
  }
  emptyEl?.classList.add("hidden");

  if (growthChart) growthChart.destroy();
  growthChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: monthLabels.map((m) => m.label),
      datasets: [
        {
          label: "Vendors",
          data,
          borderColor: "#ff6d00",
          backgroundColor: "rgba(255,109,0,0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderCategoryChart() {
  const canvas = document.getElementById("vendorCategoryChart");
  const emptyEl = document.getElementById("vendorCategoryEmpty");
  if (!canvas) return;

  const active = allVendors.filter((v) => v._isActive);
  const counts = {};
  active.forEach((v) => {
    const cat = (v.category || "Other").trim();
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    emptyEl?.classList.remove("hidden");
    return;
  }
  emptyEl?.classList.add("hidden");

  const palette = [
    "#ff6d00",
    "#1565c0",
    "#2e7d32",
    "#6a1b9a",
    "#ad1457",
    "#00838f",
    "#e65100",
    "#283593",
  ];

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: entries.map(([cat]) => cat),
      datasets: [
        {
          label: "Vendors",
          data: entries.map(([, count]) => count),
          backgroundColor: entries.map((_, i) => palette[i % palette.length]),
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

// ─────────────────────────────────────────────────────────
// FILTER CONTROLS
// ─────────────────────────────────────────────────────────
function populateCategoryFilter() {
  const select = document.getElementById("vendorCategoryFilter");
  if (!select) return;

  const active = allVendors.filter((v) => v._isActive);
  const categories = Array.from(
    new Set(active.map((v) => (v.category || "Other").trim())),
  ).sort();

  const current = select.value;
  select.innerHTML =
    '<option value="">All Categories</option>' +
    categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
  select.value = current;
}

function initControls() {
  document.getElementById("vendorSearch")?.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });
  document
    .getElementById("vendorCategoryFilter")
    ?.addEventListener("change", () => {
      currentPage = 1;
      applyFilters();
    });
  document
    .getElementById("vendorStatusFilter")
    ?.addEventListener("change", () => {
      currentPage = 1;
      applyFilters();
    });
}

function applyFilters() {
  const search = (document.getElementById("vendorSearch")?.value || "")
    .toLowerCase()
    .trim();
  const category = document.getElementById("vendorCategoryFilter")?.value || "";
  const status = document.getElementById("vendorStatusFilter")?.value || "";

  filteredVendors = allVendors
    .filter((v) => v._isActive || status === "inactive")
    .filter((v) => {
      const matchesSearch =
        !search ||
        (v.businessName || "").toLowerCase().includes(search) ||
        (v.city || "").toLowerCase().includes(search) ||
        (v.category || "").toLowerCase().includes(search);

      const matchesCategory = !category || (v.category || "Other") === category;

      const matchesStatus =
        !status ||
        (status === "active" && v._isActive) ||
        (status === "inactive" && !v._isActive) ||
        (status === "claimed" && v._isClaimed) ||
        (status === "unclaimed" && !v._isClaimed);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => b._createdMs - a._createdMs);

  const label = document.getElementById("vendorResultsLabel");
  if (label) {
    label.textContent = `${filteredVendors.length.toLocaleString()} result${filteredVendors.length !== 1 ? "s" : ""}`;
  }

  const sub = document.getElementById("vendorTableSub");
  if (sub) {
    sub.textContent = `${allVendors.filter((v) => v._isActive).length.toLocaleString()} total vendors`;
  }

  renderTable();
}

// ─────────────────────────────────────────────────────────
// TABLE + PAGINATION
// ─────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("vendorTableBody");
  const emptyEl = document.getElementById("vendorTableEmpty");
  const errorEl = document.getElementById("vendorTableError");
  const paginationEl = document.getElementById("vendorPagination");

  errorEl?.classList.add("hidden");

  if (filteredVendors.length === 0) {
    tbody.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    paginationEl?.classList.add("hidden");
    return;
  }
  emptyEl?.classList.add("hidden");

  const totalPages = Math.ceil(filteredVendors.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, totalPages) || 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredVendors.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageItems
    .map((v) => {
      const name = v.businessName || "No Name";
      const initials = initialsOf(name);
      const category = v.category || "Other";
      const city = v.city || "—";
      const state = v.state ? ", " + v.state : "";

      return `
      <tr>
        <td>
          <div class="vendor-name-cell">
            <span class="vendor-avatar" style="background:#fff1e6;color:#ff6d00;">${initials}</span>
            <div class="vendor-name-text">
              <span class="vendor-name-primary">${escapeHtml(name)}</span>
              <span class="vendor-name-sub">${escapeHtml(v.subCategory || "")}</span>
            </div>
          </div>
        </td>
        <td>${escapeHtml(category)}</td>
        <td>${escapeHtml(city)}${escapeHtml(state)}</td>
        <td>
          <span class="vendor-status-dot ${v._isActive ? "" : "inactive"}"></span>
          ${v._isActive ? "Active" : "Inactive"}
        </td>
        <td>
          ${
            v._isClaimed
              ? '<span class="badge-claimed"><i class="fa-solid fa-circle-check"></i> Claimed</span>'
              : '<span class="badge-unclaimed">Unclaimed</span>'
          }
        </td>
        <td>${formatDate(v._createdMs)}</td>
      </tr>
    `;
    })
    .join("");

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const el = document.getElementById("vendorPagination");
  if (!el) return;

  if (totalPages <= 1) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");

  let html = `
    <button class="page-btn" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    if (
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
    ) {
      html += `<button class="page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    } else if (p === currentPage - 2 || p === currentPage + 2) {
      html += `<span class="page-info">…</span>`;
    }
  }

  html += `
    <button class="page-btn" data-page="next" ${currentPage === totalPages ? "disabled" : ""}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  el.innerHTML = html;

  el.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "prev") currentPage -= 1;
      else if (page === "next") currentPage += 1;
      else currentPage = parseInt(page, 10);
      renderTable();
      document
        .getElementById("vendorTableBody")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}
