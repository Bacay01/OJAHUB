// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — TRAFFIC PAGE
// admin/js/traffic.js
//
// Renders:
//  1. Stat strip  — total views / 7-day / 30-day / peak day
//  2. Visitor trend chart — switchable 7D / 14D / 30D / 90D
//  3. Peak activity hours — views grouped by hour-of-day
//  4. Most visited vendors — ranked list by total views
//  5. Daily breakdown table — date / day / views / WA / searches
//
// Sources: vendor_views, whatsapp_clicks, searches
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

import { renderTrendChart, destroyChart } from "./admin-charts.js";

// ── Raw data (loaded once) ────────────────────────────────
let viewDocs = []; // { vendorId, vendorName, timestamp }
let waDocs = [];
let searchDocs = [];

// ── Active period (days) ─────────────────────────────────
let activePeriod = 7;

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts);
}

function dateStr(d) {
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dayName(d) {
  return d.toLocaleDateString("en-NG", { weekday: "short" });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// Build an array of the last N days (newest last)
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

// Count docs that fall within a date range
function countInRange(docs, startDate, endDate) {
  return docs.filter((d) => {
    const t = toDate(d.timestamp);
    return t && t >= startDate && t <= endDate;
  }).length;
}

// ─────────────────────────────────────────────────────────
// STAT STRIP
// ─────────────────────────────────────────────────────────
function renderStatStrip() {
  const now = new Date();
  const day7ago = new Date(now);
  day7ago.setDate(now.getDate() - 7);
  const day30ago = new Date(now);
  day30ago.setDate(now.getDate() - 30);

  const total = viewDocs.length;
  const views7 = countInRange(viewDocs, day7ago, now);
  const views30 = countInRange(viewDocs, day30ago, now);

  // Peak day (all time)
  const dayCounts = {};
  viewDocs.forEach((d) => {
    const t = toDate(d.timestamp);
    if (!t) return;
    const key = isoDate(t);
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });
  const peakEntry = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const peakLabel = peakEntry
    ? dateStr(new Date(peakEntry[0])) + " (" + peakEntry[1] + ")"
    : "—";

  document.getElementById("statTotalViews").textContent =
    total.toLocaleString();
  document.getElementById("statViews7d").textContent = views7.toLocaleString();
  document.getElementById("statViews30d").textContent =
    views30.toLocaleString();
  document.getElementById("statPeakDay").textContent = peakLabel;

  document
    .querySelectorAll("#trafficStatStrip .admin-stat-card")
    .forEach((c) => {
      c.style.opacity = "1";
    });
}

// ─────────────────────────────────────────────────────────
// TREND CHART (re-rendered when period tab switches)
// ─────────────────────────────────────────────────────────
function renderTrend(days) {
  const emptyEl = document.getElementById("trafficTrendEmpty");
  const subEl = document.getElementById("trendChartSub");

  const daySlots = lastNDays(days);
  const viewMap = {};
  const waMap = {};

  daySlots.forEach((d) => {
    viewMap[isoDate(d)] = 0;
    waMap[isoDate(d)] = 0;
  });

  viewDocs.forEach((d) => {
    const t = toDate(d.timestamp);
    if (!t) return;
    const key = isoDate(t);
    if (key in viewMap) viewMap[key]++;
  });

  waDocs.forEach((d) => {
    const t = toDate(d.timestamp);
    if (!t) return;
    const key = isoDate(t);
    if (key in waMap) waMap[key]++;
  });

  const labels = daySlots.map((d) =>
    days <= 14
      ? d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric" })
      : d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
  );
  const viewData = daySlots.map((d) => viewMap[isoDate(d)]);
  const waData = daySlots.map((d) => waMap[isoDate(d)]);

  const totalActivity =
    viewData.reduce((s, n) => s + n, 0) + waData.reduce((s, n) => s + n, 0);

  subEl.textContent = `Vendor profile views — last ${days} days`;

  destroyChart("trafficTrendChart");

  if (totalActivity === 0) {
    document.getElementById("trafficTrendChart").classList.add("hidden");
    emptyEl.classList.remove("hidden");
    return;
  }

  document.getElementById("trafficTrendChart").classList.remove("hidden");
  emptyEl.classList.add("hidden");

  renderTrendChart("trafficTrendChart", labels, [
    { label: "Views", data: viewData, color: "blue" },
    { label: "WA Clicks", data: waData, color: "green" },
  ]);
}

// ─────────────────────────────────────────────────────────
// PEAK HOURS
// ─────────────────────────────────────────────────────────
function renderPeakHours() {
  const hourList = document.getElementById("hourList");
  const emptyEl = document.getElementById("hourListEmpty");

  const counts = new Array(24).fill(0);
  viewDocs.forEach((d) => {
    const t = toDate(d.timestamp);
    if (!t) return;
    counts[t.getHours()]++;
  });

  const max = Math.max(...counts, 1);
  const total = counts.reduce((s, n) => s + n, 0);

  if (total === 0) {
    hourList.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  // Show all 24 hours grouped into readable labels
  const HOUR_LABELS = [
    "12am",
    "1am",
    "2am",
    "3am",
    "4am",
    "5am",
    "6am",
    "7am",
    "8am",
    "9am",
    "10am",
    "11am",
    "12pm",
    "1pm",
    "2pm",
    "3pm",
    "4pm",
    "5pm",
    "6pm",
    "7pm",
    "8pm",
    "9pm",
    "10pm",
    "11pm",
  ];

  hourList.innerHTML = counts
    .map(
      (count, h) => `
    <div class="hour-row">
      <div class="hour-label">${HOUR_LABELS[h]}</div>
      <div class="hour-bar-wrap">
        <div class="hour-bar" style="width:${Math.round((count / max) * 100)}%;
          opacity:${count === 0 ? "0.2" : "1"};"></div>
      </div>
      <div class="hour-count">${count || ""}</div>
    </div>
  `,
    )
    .join("");
}

// ─────────────────────────────────────────────────────────
// TOP VENDORS BY VIEWS
// ─────────────────────────────────────────────────────────
function renderTopVendors() {
  const skeletons = document.getElementById("topVendorSkeletons");
  const listEl = document.getElementById("topVendorList");
  const emptyEl = document.getElementById("topVendorEmpty");

  skeletons.style.display = "none";

  // Group views by vendorName (use vendorId as tiebreak key)
  const counts = {};
  const names = {};
  viewDocs.forEach((d) => {
    const id = d.vendorId || d.vendorName || "unknown";
    const name = d.vendorName || "Unknown Vendor";
    counts[id] = (counts[id] || 0) + 1;
    names[id] = name;
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
    <div class="traffic-vendor-row">
      <div class="traffic-vendor-rank ${i < 3 ? "top" : ""}">${i + 1}</div>
      <div class="traffic-vendor-name">
        <div class="traffic-vendor-primary">${names[id]}</div>
        <div class="traffic-vendor-sub">${count.toLocaleString()} view${count !== 1 ? "s" : ""}</div>
      </div>
      <div class="traffic-vendor-views">${count.toLocaleString()}</div>
    </div>
  `,
    )
    .join("");
}

// ─────────────────────────────────────────────────────────
// DAILY BREAKDOWN TABLE (last 30 days)
// ─────────────────────────────────────────────────────────
function renderDailyTable() {
  const tbody = document.getElementById("dailyTableBody");
  const emptyEl = document.getElementById("dailyTableEmpty");
  const subtitleEl = document.getElementById("dailyTableSub");

  const days = lastNDays(30);
  const viewMap = {};
  const waMap = {};
  const srchMap = {};

  days.forEach((d) => {
    const k = isoDate(d);
    viewMap[k] = 0;
    waMap[k] = 0;
    srchMap[k] = 0;
  });

  viewDocs.forEach((d) => {
    const k = isoDate(toDate(d.timestamp) || new Date(0));
    if (k in viewMap) viewMap[k]++;
  });
  waDocs.forEach((d) => {
    const k = isoDate(toDate(d.timestamp) || new Date(0));
    if (k in waMap) waMap[k]++;
  });
  searchDocs.forEach((d) => {
    const k = isoDate(toDate(d.timestamp) || new Date(0));
    if (k in srchMap) srchMap[k]++;
  });

  const rows = [...days].reverse(); // newest first
  const totalRows = rows.filter((d) => {
    const k = isoDate(d);
    return viewMap[k] + waMap[k] + srchMap[k] > 0;
  }).length;

  subtitleEl.textContent = `Last 30 days`;

  if (totalRows === 0) {
    tbody.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  tbody.innerHTML = rows
    .map((d) => {
      const k = isoDate(d);
      const views = viewMap[k];
      const wa = waMap[k];
      const srch = srchMap[k];
      const isToday = isoDate(new Date()) === k;

      return `
      <tr ${isToday ? 'style="background:var(--oja-blue-lt);"' : ""}>
        <td style="font-size:13px;font-weight:${isToday ? "700" : "400"};color:var(--text-primary);">
          ${dateStr(d)}${isToday ? ' <span style="font-size:10px;color:var(--oja-blue);font-weight:800;">TODAY</span>' : ""}
        </td>
        <td style="font-size:12px;color:var(--text-muted);">${dayName(d)}</td>
        <td style="font-size:13px;font-weight:700;color:var(--text-primary);">${views || "—"}</td>
        <td style="font-size:13px;color:var(--text-secondary);">${wa || "—"}</td>
        <td style="font-size:13px;color:var(--text-secondary);">${srch || "—"}</td>
      </tr>
    `;
    })
    .join("");
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
async function loadTraffic() {
  try {
    const [viewSnap, waSnap, searchSnap] = await Promise.all([
      getDocs(collection(db, "vendor_views")),
      getDocs(collection(db, "whatsapp_clicks")),
      getDocs(collection(db, "searches")),
    ]);

    viewSnap.forEach((d) => viewDocs.push(d.data()));
    waSnap.forEach((d) => waDocs.push(d.data()));
    searchSnap.forEach((d) => searchDocs.push(d.data()));

    renderStatStrip();
    renderTrend(activePeriod);
    renderPeakHours();
    renderTopVendors();
    renderDailyTable();
  } catch (err) {
    console.error("Traffic page load error:", err);
    document.getElementById("dailyTableError").classList.remove("hidden");
    document.getElementById("dailyTableBody").innerHTML = "";
    document.getElementById("topVendorSkeletons").style.display = "none";
    document.getElementById("topVendorEmpty").classList.remove("hidden");
    document.getElementById("hourList").innerHTML = "";
    document.getElementById("hourListEmpty").classList.remove("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  wirePeriodTabs();
  loadTraffic();
});
