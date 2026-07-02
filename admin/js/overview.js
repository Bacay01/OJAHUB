// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — OVERVIEW PAGE
// admin/js/overview.js
//
// Wires admin/index.html to live data from data-service.js and
// renders charts via admin-charts.js.
// ═══════════════════════════════════════════════════════════

import {
  getOverviewStats,
  getVisitorTrend,
  getRecentActivity,
  getTopVendors,
  getCategoryPerformance,
  formatRelativeTime,
} from "./data-service.js";

import { renderTrendChart, renderBarChart } from "./admin-charts.js";

// ─────────────────────────────────────────────────────────
// STAT CARD CONFIG — maps data-service keys to display info
// ─────────────────────────────────────────────────────────
const STAT_CARD_CONFIG = [
  {
    key: "totalVendors",
    label: "Total Vendors",
    icon: "fa-solid fa-store",
    color: "orange",
  },
  {
    key: "totalProducts",
    label: "Total Products",
    icon: "fa-solid fa-box",
    color: "blue",
  },
  {
    key: "marketplaceVisitors",
    label: "Marketplace Visitors",
    icon: "fa-solid fa-users",
    color: "purple",
  },
  {
    key: "whatsappClicks",
    label: "WhatsApp Clicks",
    icon: "fa-brands fa-whatsapp",
    color: "green",
  },
  {
    key: "activeVendors",
    label: "Active Vendors",
    icon: "fa-solid fa-bolt",
    color: "teal",
  },
  {
    key: "newVendorsMonth",
    label: "New Vendors (Month)",
    icon: "fa-solid fa-user-plus",
    color: "orange",
  },
];

function buildStatCard(config, statData) {
  const { value, changePct, trend } = statData;

  let changeHtml = "";
  if (changePct !== null && changePct !== undefined) {
    const isUp = trend === "up";
    changeHtml = `
      <div class="admin-stat-card-change ${isUp ? "up" : "down"}">
        <i class="fa-solid fa-arrow-${isUp ? "up" : "down"}"></i>
        ${Math.abs(changePct)}%
        <span class="admin-stat-card-change-label">vs last month</span>
      </div>
    `;
  }

  return `
    <div class="admin-stat-card">
      <div class="admin-stat-card-top">
        <span class="admin-stat-card-label">${config.label}</span>
        <div class="admin-stat-card-icon ${config.color}">
          <i class="${config.icon}"></i>
        </div>
      </div>
      <div class="admin-stat-card-value">${value.toLocaleString()}</div>
      ${changeHtml}
    </div>
  `;
}

async function renderStatCards() {
  const grid = document.getElementById("statCardsGrid");
  if (!grid) return;

  try {
    const stats = await getOverviewStats();
    grid.innerHTML = STAT_CARD_CONFIG.map((config) =>
      buildStatCard(config, stats[config.key]),
    ).join("");
  } catch (err) {
    console.error("Failed to load overview stats:", err);
    grid.innerHTML = `
      <div class="admin-empty" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Could not load stats. Please refresh.</p>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────
// VISITOR TREND CHART
// ─────────────────────────────────────────────────────────
async function renderVisitorTrend() {
  const emptyState = document.getElementById("visitorTrendEmpty");
  const canvas = document.getElementById("visitorTrendChart");

  try {
    const trend = await getVisitorTrend();
    const totalActivity = trend.reduce(
      (sum, d) => sum + d.visitors + d.whatsappClicks,
      0,
    );

    if (totalActivity === 0) {
      canvas.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    renderTrendChart(
      "visitorTrendChart",
      trend.map((d) => d.day),
      [
        {
          label: "Visitors",
          data: trend.map((d) => d.visitors),
          color: "blue",
        },
        {
          label: "WhatsApp Clicks",
          data: trend.map((d) => d.whatsappClicks),
          color: "green",
        },
      ],
    );
  } catch (err) {
    console.error("Failed to load visitor trend:", err);
    canvas.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.querySelector("p").textContent =
      "Could not load chart. Please refresh.";
  }
}

// ─────────────────────────────────────────────────────────
// RECENT ACTIVITY FEED
// ─────────────────────────────────────────────────────────
function buildFeedItem(event) {
  return `
    <div class="admin-feed-item">
      <div class="admin-feed-icon" style="background: var(--oja-${event.color}-lt); color: var(--oja-${event.color});">
        <i class="${event.icon}"></i>
      </div>
      <div class="admin-feed-content">
        <div class="admin-feed-text">${event.html}</div>
        <div class="admin-feed-time">${formatRelativeTime(event.timestamp)}</div>
      </div>
    </div>
  `;
}

async function renderActivityFeed() {
  const feed = document.getElementById("activityFeed");
  const emptyState = document.getElementById("activityEmpty");
  if (!feed) return;

  try {
    const events = await getRecentActivity(8);

    if (events.length === 0) {
      feed.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    feed.innerHTML = events.map(buildFeedItem).join("");
  } catch (err) {
    console.error("Failed to load activity feed:", err);
    feed.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.querySelector("p").textContent =
      "Could not load activity. Please refresh.";
  }
}

// ─────────────────────────────────────────────────────────
// TOP VENDORS TABLE
// ─────────────────────────────────────────────────────────
function buildVendorRow(vendor) {
  return `
    <tr>
      <td>
        <div class="admin-table-name">${vendor.name}</div>
        <div class="admin-table-sub">${vendor.category}${vendor.city ? " · " + vendor.city : ""}</div>
      </td>
      <td>${vendor.views.toLocaleString()}</td>
      <td>${vendor.whatsappClicks.toLocaleString()}</td>
    </tr>
  `;
}

async function renderTopVendors() {
  const tbody = document.getElementById("topVendorsBody");
  const emptyState = document.getElementById("topVendorsEmpty");
  if (!tbody) return;

  try {
    const vendors = await getTopVendors(6);

    if (vendors.length === 0) {
      tbody.closest(".admin-table-wrap").classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    tbody.innerHTML = vendors.map(buildVendorRow).join("");
  } catch (err) {
    console.error("Failed to load top vendors:", err);
    tbody.closest(".admin-table-wrap").classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.querySelector("p").textContent =
      "Could not load vendors. Please refresh.";
  }
}

// ─────────────────────────────────────────────────────────
// CATEGORY PERFORMANCE CHART
// ─────────────────────────────────────────────────────────
async function renderCategoryChart() {
  const canvas = document.getElementById("categoryChart");
  const emptyState = document.getElementById("categoryEmpty");

  try {
    const categories = await getCategoryPerformance();

    if (categories.length === 0) {
      canvas.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    renderBarChart(
      "categoryChart",
      categories.map((c) => c.category),
      [
        {
          label: "Views",
          data: categories.map((c) => c.views),
          color: "orange",
        },
      ],
    );
  } catch (err) {
    console.error("Failed to load category performance:", err);
    canvas.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.querySelector("p").textContent =
      "Could not load chart. Please refresh.";
  }
}

// ─────────────────────────────────────────────────────────
// INIT — run everything once the layout/sidebar has loaded
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderStatCards();
  renderVisitorTrend();
  renderActivityFeed();
  renderTopVendors();
  renderCategoryChart();
});
