// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — WHATSAPP PAGE
// admin/js/whatsapp.js
//
// Renders:
//  1. Stat strip  — total clicks / 7-day / conversion rate /
//                   avg clicks per vendor
//  2. WA click trend chart — switchable 7D/14D/30D/90D
//  3. Conversion funnel    — Vendor Views → WA Clicks
//  4. Top vendors by WA clicks ranked list
//  5. Full WA clicks log table — searchable, paginated
//
// Sources: whatsapp_clicks, vendor_views, vendors (for
//          category lookup), products (for product names)
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { renderTrendChart, destroyChart } from "./admin-charts.js";

// ── Raw data ─────────────────────────────────────────────
let waDocs = []; // raw whatsapp_clicks docs
let viewDocs = []; // raw vendor_views docs
let vendorMap = {}; // vendorId → { businessName, category }
let productMap = {}; // productId → { name }

// ── Enriched rows for the log table ──────────────────────
let allRows = [];
let filteredRows = [];
let currentPage = 1;
const PAGE_SIZE = 30;

// ── Active period ─────────────────────────────────────────
let activePeriod = 7;

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function formatRelTime(ts) {
  if (!ts) return "—";
  const d = toDate(ts);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStatStrip() {
  const total = waDocs.length;
  const views = viewDocs.length;
  const now = new Date();
  const ago7 = new Date(now);
  ago7.setDate(now.getDate() - 7);

  const wa7d = waDocs.filter((d) => {
    const t = toDate(d.timestamp);
    return t && t >= ago7;
  }).length;

  const convRate = views > 0 ? ((total / views) * 100).toFixed(1) + "%" : "—";

  // Avg clicks per vendor that has at least 1 click
  const vendorCounts = {};
  waDocs.forEach((d) => {
    const id = d.vendorId || d.vendorName || "unknown";
    vendorCounts[id] = (vendorCounts[id] || 0) + 1;
  });
  const uniqueVendors = Object.keys(vendorCounts).length;
  const avg = uniqueVendors > 0 ? (total / uniqueVendors).toFixed(1) : "—";

  document.getElementById("statTotalWA").textContent = total.toLocaleString();
  document.getElementById("statWA7d").textContent = wa7d.toLocaleString();
  document.getElementById("statConvRate").textContent = convRate;
  document.getElementById("statAvgClicks").textContent = avg;

  document.querySelectorAll("#waStatStrip .admin-stat-card").forEach((c) => {
    c.style.opacity = "1";
  });
}

// ─────────────────────────────────────────────────────────
// TREND CHART
// ─────────────────────────────────────────────────────────
function renderTrend(days) {
  const emptyEl = document.getElementById("waTrendEmpty");
  const subEl = document.getElementById("waTrendSub");
  const daySlots = lastNDays(days);
  const waMap = {};

  daySlots.forEach((d) => {
    waMap[isoDate(d)] = 0;
  });

  waDocs.forEach((d) => {
    const t = toDate(d.timestamp);
    if (!t) return;
    const k = isoDate(t);
    if (k in waMap) waMap[k]++;
  });

  const labels = daySlots.map((d) =>
    days <= 14
      ? d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric" })
      : d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
  );
  const data = daySlots.map((d) => waMap[isoDate(d)]);
  const total = data.reduce((s, n) => s + n, 0);

  subEl.textContent = `WhatsApp clicks — last ${days} days`;
  destroyChart("waTrendChart");

  if (total === 0) {
    document.getElementById("waTrendChart").classList.add("hidden");
    emptyEl.classList.remove("hidden");
    return;
  }

  document.getElementById("waTrendChart").classList.remove("hidden");
  emptyEl.classList.add("hidden");

  renderTrendChart("waTrendChart", labels, [
    { label: "WA Clicks", data, color: "green" },
  ]);
}

// ─────────────────────────────────────────────────────────
// CONVERSION FUNNEL
// ─────────────────────────────────────────────────────────
function renderFunnel() {
  const wrap = document.getElementById("funnelWrap");
  const emptyEl = document.getElementById("funnelEmpty");

  const views = viewDocs.length;
  const clicks = waDocs.length;

  if (views === 0 && clicks === 0) {
    wrap.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  const stages = [
    { label: "Vendor Views", value: views, color: "#1a5cff", pct: 100 },
    {
      label: "WA Clicks",
      value: clicks,
      color: "#16a34a",
      pct: views > 0 ? ((clicks / views) * 100).toFixed(1) : 0,
    },
  ];

  const max = stages[0].value || 1;

  wrap.innerHTML = stages.map((s) => {
    const barPct = Math.round((s.value / max) * 100);
    return `
      <div class="funnel-stage">
        <div class="funnel-label">${s.label}</div>
        <div class="funnel-bar-wrap">
          <div class="funnel-bar" style="width:${barPct}%;background:${s.color};">
            <span class="funnel-bar-label">${s.value.toLocaleString()}</span>
          </div>
        </div>
        <div class="funnel-count">${s.value.toLocaleString()}</div>
        <div class="funnel-pct">${s.pct}%</div>
      </div>
    `;
  }).join(`
    <div style="display:flex;align-items:center;gap:12px;padding:4px 0;">
      <div style="width:110px;flex-shrink:0;"></div>
      <div style="flex:1;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);">
        <i class="fa-solid fa-arrow-down" style="color:var(--oja-green);"></i>
        conversion drop-off
      </div>
    </div>
  `);
}

// ─────────────────────────────────────────────────────────
// TOP VENDORS BY WA CLICKS
// ─────────────────────────────────────────────────────────
function renderTopVendors() {
  const skeletons = document.getElementById("waVendorSkeletons");
  const listEl = document.getElementById("waVendorList");
  const emptyEl = document.getElementById("waVendorEmpty");

  skeletons.style.display = "none";

  const counts = {};
  const names = {};
  const cats = {};

  waDocs.forEach((d) => {
    const id = d.vendorId || d.vendorName || "unknown";
    const name =
      vendorMap[d.vendorId]?.businessName || d.vendorName || "Unknown Vendor";
    const cat = vendorMap[d.vendorId]?.category || "";
    counts[id] = (counts[id] || 0) + 1;
    names[id] = name;
    cats[id] = cat;
  });

  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (ranked.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  listEl.innerHTML = ranked
    .map(
      ([id, count], i) => `
    <div class="wa-vendor-row">
      <div class="wa-vendor-rank ${i < 3 ? "top" : ""}">${i + 1}</div>
      <div class="wa-vendor-name">
        <div class="wa-vendor-primary">${names[id]}</div>
        ${cats[id] ? `<div class="wa-vendor-sub">${cats[id]}</div>` : ""}
      </div>
      <div class="wa-vendor-clicks">
        <i class="fa-brands fa-whatsapp"></i>
        ${count.toLocaleString()}
      </div>
    </div>
  `,
    )
    .join("");
}

// ─────────────────────────────────────────────────────────
// BUILD LOG TABLE ROW
// ─────────────────────────────────────────────────────────
function buildRow(row) {
  return `
    <tr>
      <td>
        <div style="font-weight:700;font-size:13px;color:var(--text-primary);">${row.vendorName}</div>
      </td>
      <td>
        ${
          row.category
            ? `<span class="admin-badge">${row.category}</span>`
            : `<span style="color:var(--text-muted);font-size:12px;">—</span>`
        }
      </td>
      <td style="font-size:12.5px;color:var(--text-secondary);">
        ${row.productName || "—"}
      </td>
      <td style="font-size:12px;color:var(--text-muted);white-space:nowrap;">
        ${formatRelTime(row.timestamp)}
      </td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
// RENDER TABLE PAGE
// ─────────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("waTableBody");
  const emptyEl = document.getElementById("waTableEmpty");
  const emptyMsg = document.getElementById("waTableEmptyMsg");
  const subEl = document.getElementById("waTableSub");
  const pagEl = document.getElementById("waPagination");
  const resLabel = document.getElementById("waResultsLabel");

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredRows.slice(start, start + PAGE_SIZE);

  if (filteredRows.length === 0) {
    tbody.innerHTML = "";
    emptyEl.classList.remove("hidden");
    emptyMsg.textContent = document.getElementById("waSearch").value
      ? "No clicks match your search."
      : "No WhatsApp clicks recorded yet.";
    pagEl.classList.add("hidden");
    resLabel.textContent = "";
    subEl.textContent = "0 clicks";
    return;
  }

  emptyEl.classList.add("hidden");
  tbody.innerHTML = slice.map(buildRow).join("");
  subEl.textContent = `${filteredRows.length.toLocaleString()} click${filteredRows.length !== 1 ? "s" : ""} total`;
  resLabel.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filteredRows.length)} of ${filteredRows.length.toLocaleString()}`;

  renderPagination();
}

// ─────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────
function renderPagination() {
  const pagEl = document.getElementById("waPagination");
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  if (totalPages <= 1) {
    pagEl.classList.add("hidden");
    return;
  }

  pagEl.classList.remove("hidden");

  let html = `<button class="page-btn" id="pagePrev" ${currentPage === 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button>`;

  const range = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    )
      range.push(i);
  }

  let prev = null;
  range.forEach((p) => {
    if (prev !== null && p - prev > 1)
      html += `<span class="page-info">…</span>`;
    html += `<button class="page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    prev = p;
  });

  html += `<button class="page-btn" id="pageNext" ${currentPage === totalPages ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button>`;
  pagEl.innerHTML = html;

  pagEl.querySelector("#pagePrev")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  pagEl.querySelector("#pageNext")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
  pagEl.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page, 10);
      renderTable();
    });
  });
}

// ─────────────────────────────────────────────────────────
// APPLY SEARCH FILTER
// ─────────────────────────────────────────────────────────
function applyFilter() {
  const q = (document.getElementById("waSearch").value || "")
    .toLowerCase()
    .trim();
  filteredRows = q
    ? allRows.filter(
        (r) =>
          (r.vendorName || "").toLowerCase().includes(q) ||
          (r.productName || "").toLowerCase().includes(q) ||
          (r.category || "").toLowerCase().includes(q),
      )
    : [...allRows];
  currentPage = 1;
  renderTable();
}

// ─────────────────────────────────────────────────────────
// PERIOD TAB WIRING
// ─────────────────────────────────────────────────────────
function wirePeriodTabs() {
  document.querySelectorAll(".period-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".period-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activePeriod = parseInt(btn.dataset.days, 10);
      renderTrend(activePeriod);
    });
  });
}

// ─────────────────────────────────────────────────────────
// LOAD FROM FIRESTORE
// ─────────────────────────────────────────────────────────
async function loadWhatsApp() {
  try {
    const [waSnap, viewSnap, vendorSnap, productSnap] = await Promise.all([
      getDocs(collection(db, "whatsapp_clicks")),
      getDocs(collection(db, "vendor_views")),
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "products")),
    ]);

    // Build lookup maps
    vendorSnap.forEach((d) => {
      const v = d.data();
      vendorMap[d.id] = {
        businessName: v.businessName || "",
        category: v.category || "",
      };
    });

    productSnap.forEach((d) => {
      const p = d.data();
      productMap[d.id] = { name: p.name || "" };
    });

    waSnap.forEach((d) => waDocs.push({ id: d.id, ...d.data() }));
    viewSnap.forEach((d) => viewDocs.push(d.data()));

    // Build enriched rows for log table (newest first)
    allRows = [...waDocs]
      .sort((a, b) => {
        const ta = toDate(a.timestamp) || new Date(0);
        const tb = toDate(b.timestamp) || new Date(0);
        return tb - ta;
      })
      .map((d) => ({
        vendorName:
          vendorMap[d.vendorId]?.businessName || d.vendorName || "Unknown",
        category: vendorMap[d.vendorId]?.category || "",
        productName: d.productId
          ? productMap[d.productId]?.name || d.productName || ""
          : d.productName || "",
        timestamp: d.timestamp,
      }));

    filteredRows = [...allRows];

    // Render everything
    renderStatStrip();
    renderTrend(activePeriod);
    renderFunnel();
    renderTopVendors();
    renderTable();
  } catch (err) {
    console.error("WhatsApp page load error:", err);
    document.getElementById("waTableError").classList.remove("hidden");
    document.getElementById("waTableBody").innerHTML = "";
    document.getElementById("waVendorSkeletons").style.display = "none";
    document.getElementById("waVendorEmpty").classList.remove("hidden");
    document.getElementById("funnelWrap").innerHTML = "";
    document.getElementById("funnelEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  wirePeriodTabs();
  document.getElementById("waSearch").addEventListener("input", applyFilter);
  loadWhatsApp();
});
