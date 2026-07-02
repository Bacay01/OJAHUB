// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — ACTIVITY PAGE
// admin/js/activity.js
//
// Full live activity feed with type-filtering (all / vendor
// views / whatsapp clicks / searches), keyword search, and
// pagination via "Load more". Uses getRecentActivity() from
// data-service.js with a high limit to pull all available
// events, then filters/slices client-side so we only hit
// Firestore once per page load.
// ═══════════════════════════════════════════════════════════

import { getRecentActivity, formatRelativeTime } from "./data-service.js";

// ── How many items to show per "page" ──────────────────────
const PAGE_SIZE = 30;

// ── State ──────────────────────────────────────────────────
let allEvents = []; // full unfiltered list from data-service
let filteredEvents = []; // after type + keyword filter
let visibleCount = PAGE_SIZE;
let activeType = "all";
let searchQuery = "";

// ── DOM refs (set after DOMContentLoaded) ──────────────────
let feedEl, skeletons, noResults, noResultsMsg, errorEl;
let loadMoreWrap, loadMoreBtn, feedSubtitle;
let pillViews, pillWA, pillSearch;
let countAll, countViewsEl, countWAEl, countSearchEl;

// ─────────────────────────────────────────────────────────
// BUILD ONE FEED ITEM ROW
// ─────────────────────────────────────────────────────────
function buildFeedItem(event) {
  const time = formatRelativeTime(event.timestamp);

  return `
    <div class="admin-feed-item" data-type="${event.type}">
      <div class="admin-feed-icon"
           style="background: var(--oja-${event.color}-lt);
                  color: var(--oja-${event.color});">
        <i class="${event.icon}"></i>
      </div>
      <div class="admin-feed-content">
        <div class="admin-feed-text">${event.html}</div>
        <div class="admin-feed-time">${time}</div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────
// APPLY ACTIVE FILTER + KEYWORD SEARCH → filteredEvents
// ─────────────────────────────────────────────────────────
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();

  filteredEvents = allEvents.filter((event) => {
    // Type filter
    if (activeType !== "all" && event.type !== activeType) return false;

    // Keyword filter — match against the rendered html text
    if (q) {
      const text = (event.html || "").replace(/<[^>]+>/g, "").toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────
// RENDER THE CURRENTLY VISIBLE SLICE
// ─────────────────────────────────────────────────────────
function renderFeed() {
  const slice = filteredEvents.slice(0, visibleCount);

  if (filteredEvents.length === 0) {
    feedEl.innerHTML = "";
    noResults.style.display = "flex";
    noResultsMsg.textContent = searchQuery
      ? `No events match "${searchQuery}".`
      : "No events of this type yet.";
    loadMoreWrap.classList.add("hidden");
    return;
  }

  noResults.style.display = "none";
  feedEl.innerHTML = slice.map(buildFeedItem).join("");

  // Subtitle
  feedSubtitle.textContent = `Showing ${slice.length} of ${filteredEvents.length.toLocaleString()} event${filteredEvents.length !== 1 ? "s" : ""}`;

  // Load-more button
  if (visibleCount < filteredEvents.length) {
    loadMoreWrap.classList.remove("hidden");
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML =
      `<i class="fa-solid fa-chevron-down"></i> Load more events` +
      ` <span style="opacity:.6;font-weight:400;">(${filteredEvents.length - visibleCount} remaining)</span>`;
  } else {
    loadMoreWrap.classList.add("hidden");
  }
}

// ─────────────────────────────────────────────────────────
// UPDATE TYPE-FILTER BUTTONS + COUNT BADGES
// ─────────────────────────────────────────────────────────
function updateFilterBadges() {
  const total = allEvents.length;
  const views = allEvents.filter((e) => e.type === "view").length;
  const wa = allEvents.filter((e) => e.type === "whatsapp").length;
  const searches = allEvents.filter((e) => e.type === "search").length;

  countAll.textContent = total.toLocaleString();
  countViewsEl.textContent = views.toLocaleString();
  countWAEl.textContent = wa.toLocaleString();
  countSearchEl.textContent = searches.toLocaleString();

  // Summary pills
  pillViews.textContent = views.toLocaleString();
  pillWA.textContent = wa.toLocaleString();
  pillSearch.textContent = searches.toLocaleString();

  // Unfade pills
  document.querySelectorAll(".activity-summary-pill").forEach((p) => {
    p.style.opacity = "1";
  });
}

// ─────────────────────────────────────────────────────────
// WIRE TYPE-FILTER BUTTONS
// ─────────────────────────────────────────────────────────
function wireTypeFilters() {
  const btns = document.querySelectorAll(".activity-filter-btn");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active state
      btns.forEach((b) => {
        b.classList.remove("active");
        // Reset inline style overrides from HTML
        b.style.background = "";
        b.style.borderColor = "";
        b.style.color = "";
      });
      btn.classList.add("active");

      activeType = btn.dataset.type;
      visibleCount = PAGE_SIZE; // reset pagination on filter change
      applyFilters();
      renderFeed();
    });
  });
}

// ─────────────────────────────────────────────────────────
// LOAD ALL EVENTS FROM DATA-SERVICE
// ─────────────────────────────────────────────────────────
async function loadActivity() {
  try {
    // Pull a large batch — 500 events covers most real installs.
    // data-service caches the underlying collections so this is
    // just one merge + sort on top of already-fetched data if
    // other functions ran first (e.g. if overview was visited
    // before in the same tab — unlikely on a separate page load,
    // but the cache is cleared per page load anyway).
    allEvents = await getRecentActivity(500);

    // Hide skeletons, show feed
    skeletons.style.display = "none";

    if (allEvents.length === 0) {
      noResults.style.display = "flex";
      noResultsMsg.textContent = "No marketplace activity recorded yet.";
      feedSubtitle.textContent = "0 events";
      updateFilterBadges();
      return;
    }

    updateFilterBadges();
    applyFilters();
    renderFeed();
  } catch (err) {
    console.error("Activity page load error:", err);
    skeletons.style.display = "none";
    errorEl.classList.remove("hidden");
    feedSubtitle.textContent = "Failed to load";
  }
}

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  feedEl = document.getElementById("activityFeedFull");
  skeletons = document.getElementById("activitySkeletons");
  noResults = document.getElementById("activityNoResults");
  noResultsMsg = document.getElementById("activityNoResultsMsg");
  errorEl = document.getElementById("activityError");
  loadMoreWrap = document.getElementById("loadMoreWrap");
  loadMoreBtn = document.getElementById("loadMoreBtn");
  feedSubtitle = document.getElementById("feedSubtitle");
  pillViews = document.getElementById("pillViews");
  pillWA = document.getElementById("pillWA");
  pillSearch = document.getElementById("pillSearch");
  countAll = document.getElementById("countAll");
  countViewsEl = document.getElementById("countViews");
  countWAEl = document.getElementById("countWA");
  countSearchEl = document.getElementById("countSearch");

  // Type filter buttons
  wireTypeFilters();

  // Keyword search
  const searchInput = document.getElementById("activitySearch");
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    visibleCount = PAGE_SIZE; // reset pagination on new search
    applyFilters();
    renderFeed();
  });

  // Load more
  loadMoreBtn.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    renderFeed();
    // Smooth-scroll to newly revealed items
    const items = feedEl.querySelectorAll(".admin-feed-item");
    if (items[visibleCount - PAGE_SIZE]) {
      items[visibleCount - PAGE_SIZE].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  });

  // Kick off data fetch
  loadActivity();
});
