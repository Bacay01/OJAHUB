// ═══════════════════════════════════════════════════════════
// OJAHUB ADMIN — DATA SERVICE (LIVE FIREBASE)
// admin/js/data-service.js
//
// SINGLE SOURCE OF TRUTH for every dataset the dashboard shows.
// Pulls REAL data from Firestore — vendors, products,
// vendor_views, whatsapp_clicks, searches collections — the
// same collections your public marketplace already writes to
// via marketplace.js / analytics.js.
//
// REFRESH MODEL: fetch-once-per-page-load (not onSnapshot).
// Each function runs a one-time getDocs() query when a page
// loads. To manually refresh, the admin reloads the page.
// (If a specific page ever needs true live-push updates later,
// swap getDocs() for onSnapshot() inside that one function only
// — no page script changes required either way.)
// ═══════════════════════════════════════════════════════════

import { db } from "../../js/firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as fbLimit,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── Internal cache — avoid re-fetching the same collection
//    multiple times across different functions on one page load
let _cache = {};

async function fetchCollection(name) {
  if (_cache[name]) return _cache[name];
  const snapshot = await getDocs(collection(db, name));
  const docs = [];
  snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
  _cache[name] = docs;
  return docs;
}

// Call this once at the top of each page's script if you want
// a guaranteed fresh read instead of any leftover cache from a
// previous navigation within the same session.
export function clearDataCache() {
  _cache = {};
}

// ── Helpers ──────────────────────────────────────────────
function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis(); // Firestore Timestamp
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return 0;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

// Same deduplication logic used in marketplace.js / featured-vendors.js —
// claimed vendors (ownerUid) take priority over manually-added duplicates.
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

function vendorOwnsProduct(product, vendor) {
  if (product.vendorId && product.vendorId === vendor.id) return true;
  const pVendor = (product.vendorName || "").trim().toLowerCase();
  const bName = (vendor.businessName || "").trim().toLowerCase();
  return !!pVendor && !!bName && pVendor === bName;
}

// ─────────────────────────────────────────────────────────
// CITY NORMALIZATION (fixes the "Ogbomosho" / "ogbomosho" /
// " Ogbomosho " / "Ogbomoso" duplicate-row bug on the
// Locations page).
//
// Two layers, same philosophy as dedupeVendors():
//  1. Whitespace/case normalization — always safe, handles
//     " Lagos", "LAGOS", "lagos " etc. automatically.
//  2. A manual alias map — for genuine misspellings/variants
//     that aren't just whitespace/case (e.g. "Ogbomoso" vs
//     "Ogbomosho"). This is intentionally NOT fuzzy-matched
//     automatically — auto-merging similar-looking city names
//     risks silently merging two different real places. Add
//     new aliases here as you spot them in the data.
// ─────────────────────────────────────────────────────────
const CITY_ALIASES = {
  // key: normalized (trimmed, lowercased) misspelling/variant
  // value: the canonical display name to use
  ogbomoso: "Ogbomosho",
  ogbomosho: "Ogbomosho",
  ibadan: "Ibadan",
  lagos: "Lagos",
  "lagos state": "Lagos",
  abuja: "Abuja",
  "abuja fct": "Abuja",
  "port harcourt": "Port Harcourt",
  "port-harcourt": "Port Harcourt",
  ph: "Port Harcourt",
  unknown: "Unknown",
  "": "Unknown",
};

function normalizeCityKey(raw) {
  return (raw || "").trim().toLowerCase().replace(/\s+/g, " "); // collapse repeated internal spaces
}

function toTitleCase(str) {
  return str
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Returns the canonical display name for a raw city string.
// Vendors without a city (or blank/whitespace-only) fall under "Unknown".
function canonicalCity(rawCity) {
  const key = normalizeCityKey(rawCity);
  if (!key) return "Unknown";
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];
  return toTitleCase(key);
}

// ─────────────────────────────────────────────────────────
// 1. OVERVIEW STATS
// ─────────────────────────────────────────────────────────
export async function getOverviewStats() {
  const [vendorsRaw, products, vendorViews, whatsappClicks] = await Promise.all(
    [
      fetchCollection("vendors"),
      fetchCollection("products"),
      fetchCollection("vendor_views"),
      fetchCollection("whatsapp_clicks"),
    ],
  );

  const vendors = dedupeVendors(vendorsRaw).filter((v) => v.isActive !== false);

  const now = Date.now();
  const thisMonthStart = new Date(now);
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const newVendorsThisMonth = vendors.filter((v) => {
    const created = toMillis(v.createdAt);
    return created >= thisMonthStart.getTime();
  }).length;

  const newVendorsLastMonth = vendors.filter((v) => {
    const created = toMillis(v.createdAt);
    return (
      created >= lastMonthStart.getTime() && created < thisMonthStart.getTime()
    );
  }).length;

  // "Active" vendors = vendors who have at least one product OR
  // any vendor_view logged against them in the last 30 days
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const activeVendorIds = new Set(
    vendorViews
      .filter((v) => toMillis(v.timestamp) >= thirtyDaysAgo)
      .map((v) => v.vendorId),
  );
  const activeVendors = vendors.filter(
    (v) =>
      activeVendorIds.has(v.id) ||
      products.some((p) => vendorOwnsProduct(p, v)),
  ).length;

  return {
    totalVendors: { value: vendors.length, changePct: null, trend: "up" },
    totalProducts: { value: products.length, changePct: null, trend: "up" },
    marketplaceVisitors: {
      value: vendorViews.length,
      changePct: null,
      trend: "up",
    },
    whatsappClicks: {
      value: whatsappClicks.length,
      changePct: null,
      trend: "up",
    },
    activeVendors: { value: activeVendors, changePct: null, trend: "up" },
    newVendorsMonth: {
      value: newVendorsThisMonth,
      changePct: pctChange(newVendorsThisMonth, newVendorsLastMonth),
      trend: newVendorsThisMonth >= newVendorsLastMonth ? "up" : "down",
    },
  };
}

// ─────────────────────────────────────────────────────────
// 2. VISITOR + WHATSAPP TREND (last 7 days)
// ─────────────────────────────────────────────────────────
export async function getVisitorTrend() {
  const [vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [];
  const today = startOfDay(Date.now());

  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const visitors = vendorViews.filter((v) => {
      const t = toMillis(v.timestamp);
      return t >= dayStart && t < dayEnd;
    }).length;

    const clicks = whatsappClicks.filter((w) => {
      const t = toMillis(w.timestamp);
      return t >= dayStart && t < dayEnd;
    }).length;

    days.push({
      day: dayLabels[new Date(dayStart).getDay()],
      visitors,
      whatsappClicks: clicks,
    });
  }

  return days;
}

// ─────────────────────────────────────────────────────────
// 3. RECENT ACTIVITY FEED
//    Merges vendor_views, whatsapp_clicks, and searches —
//    sorted newest first. Fetch-once per page load.
// ─────────────────────────────────────────────────────────
export async function getRecentActivity(maxItems = 15) {
  const [vendorViews, whatsappClicks, searches] = await Promise.all([
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
    fetchCollection("searches"),
  ]);

  const events = [];

  vendorViews.forEach((v) => {
    events.push({
      id: "vv_" + v.id,
      type: "vendor_view",
      icon: "fa-solid fa-store",
      color: "orange",
      html: `Vendor profile viewed: <strong>${v.vendorName || "Unknown vendor"}</strong>`,
      timestamp: toMillis(v.timestamp),
    });
  });

  whatsappClicks.forEach((w) => {
    const label = w.productName
      ? `Buyer contacted <strong>${w.vendorName || "a vendor"}</strong> about <strong>${w.productName}</strong>`
      : `Buyer contacted <strong>${w.vendorName || "a vendor"}</strong> on WhatsApp`;
    events.push({
      id: "wa_" + w.id,
      type: "whatsapp_click",
      icon: "fa-brands fa-whatsapp",
      color: "green",
      html: label,
      timestamp: toMillis(w.timestamp),
    });
  });

  searches.forEach((s) => {
    events.push({
      id: "sr_" + s.id,
      type: "search",
      icon: "fa-solid fa-magnifying-glass",
      color: "purple",
      html: `Someone searched "<strong>${s.keyword || s.term || ""}</strong>"`,
      timestamp: toMillis(s.timestamp),
    });
  });

  events.sort((a, b) => b.timestamp - a.timestamp);
  return events.slice(0, maxItems);
}

// Format a timestamp (ms) as a relative "x minutes ago" string.
export function formatRelativeTime(timestampMs) {
  if (!timestampMs) return "—";
  const diffMs = Date.now() - timestampMs;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)
    return diffMin + (diffMin === 1 ? " minute ago" : " minutes ago");
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + (diffHr === 1 ? " hour ago" : " hours ago");
  const diffDay = Math.floor(diffHr / 24);
  return diffDay + (diffDay === 1 ? " day ago" : " days ago");
}

// ─────────────────────────────────────────────────────────
// 4. TOP VENDORS (by views + whatsapp clicks)
// ─────────────────────────────────────────────────────────
export async function getTopVendors(maxItems = 6) {
  const [vendorsRaw, vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendors"),
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const vendors = dedupeVendors(vendorsRaw).filter((v) => v.isActive !== false);

  const ranked = vendors.map((v) => {
    const views = vendorViews.filter((vv) => vv.vendorId === v.id).length;
    const clicks = whatsappClicks.filter((w) => w.vendorId === v.id).length;
    return {
      id: v.id,
      name: v.businessName || "No Name",
      category: v.category || "Others",
      city: v.city || "",
      views,
      whatsappClicks: clicks,
    };
  });

  ranked.sort(
    (a, b) => b.views + b.whatsappClicks - (a.views + a.whatsappClicks),
  );
  return ranked.slice(0, maxItems);
}

// ─────────────────────────────────────────────────────────
// 5. VENDOR GROWTH (last 6 months, by createdAt)
// ─────────────────────────────────────────────────────────
export async function getVendorGrowth() {
  const vendorsRaw = await fetchCollection("vendors");
  const vendors = dedupeVendors(vendorsRaw);

  const monthLabels = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  // Cumulative vendor count up to and including each month
  return monthLabels.map(({ label, year, month }) => {
    const cutoff = new Date(year, month + 1, 1).getTime(); // end of that month
    const count = vendors.filter((v) => {
      const created = toMillis(v.createdAt);
      // Vendors without createdAt (old manually-added ones) count
      // as "already existing" from the start of the range
      return created === 0 || created < cutoff;
    }).length;
    return { month: label, vendors: count };
  });
}

// ─────────────────────────────────────────────────────────
// 6. TOP PRODUCTS (by views + whatsapp clicks)
//    NOTE: requires a product_views collection for per-product
//    view counts. Until that's added, this uses whatsapp_clicks
//    only (which already carries productId/productName).
// ─────────────────────────────────────────────────────────
export async function getTopProducts(maxItems = 6) {
  const [products, whatsappClicks] = await Promise.all([
    fetchCollection("products"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const ranked = products.map((p) => {
    const clicks = whatsappClicks.filter(
      (w) =>
        w.productId === p.id || (w.productName && w.productName === p.name),
    ).length;
    return {
      id: p.id,
      name: p.name || "Untitled Product",
      vendor: p.vendorName || "Unknown",
      price: p.price || 0,
      views: null, // not tracked yet — see note above
      whatsappClicks: clicks,
    };
  });

  ranked.sort((a, b) => b.whatsappClicks - a.whatsappClicks);
  return ranked.slice(0, maxItems);
}

// ─────────────────────────────────────────────────────────
// 7. SEARCH TERMS — grouped + counted from searches collection
// ─────────────────────────────────────────────────────────
export async function getTopSearchTerms(maxItems = 10) {
  const searches = await fetchCollection("searches");

  const counts = {};
  searches.forEach((s) => {
    const term = (s.keyword || s.term || "").trim().toLowerCase();
    if (!term) return;
    counts[term] = (counts[term] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

// No-result searches require a `resultCount` field to be saved
// alongside each search event. Not yet present in trackSearch() —
// returns empty until that field is added to the tracking code.
export async function getNoResultSearchTerms(maxItems = 10) {
  const searches = await fetchCollection("searches");

  const withResultCount = searches.filter(
    (s) => typeof s.resultCount === "number",
  );
  if (withResultCount.length === 0) return [];

  const counts = {};
  withResultCount
    .filter((s) => s.resultCount === 0)
    .forEach((s) => {
      const term = (s.keyword || s.term || "").trim().toLowerCase();
      if (!term) return;
      counts[term] = (counts[term] || 0) + 1;
    });

  return Object.entries(counts)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

// ─────────────────────────────────────────────────────────
// 8. CATEGORY PERFORMANCE
// ─────────────────────────────────────────────────────────
export async function getCategoryPerformance() {
  const [vendorsRaw, vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendors"),
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const vendors = dedupeVendors(vendorsRaw);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  const byCategory = {};

  function bump(vendorId, field) {
    const vendor = vendorById.get(vendorId);
    const category = (vendor && vendor.category) || "Others";
    if (!byCategory[category])
      byCategory[category] = { views: 0, whatsappClicks: 0 };
    byCategory[category][field] += 1;
  }

  vendorViews.forEach((v) => bump(v.vendorId, "views"));
  whatsappClicks.forEach((w) => bump(w.vendorId, "whatsappClicks"));

  return Object.entries(byCategory)
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.views - a.views);
}

// ─────────────────────────────────────────────────────────
// 9. LOCATION STATS
//
// FIXED: city names are now canonicalized before grouping
// (see canonicalCity() above), so "Lagos", " lagos ", "LAGOS"
// all collapse into a single "Lagos" row instead of showing as
// separate duplicate rows. Genuine misspelling variants (e.g.
// "Ogbomoso" vs "Ogbomosho") are merged via the CITY_ALIASES
// map — add new entries there as you spot them in real data.
// ─────────────────────────────────────────────────────────
export async function getLocationStats() {
  const [vendorsRaw, vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendors"),
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const vendors = dedupeVendors(vendorsRaw).filter((v) => v.isActive !== false);

  // Map vendor id → canonical city, so views/clicks (which only
  // carry vendorId) can be attributed to the correct normalized city.
  const vendorCityById = new Map(
    vendors.map((v) => [v.id, canonicalCity(v.city)]),
  );

  const byCity = {};

  function ensure(city) {
    if (!byCity[city])
      byCity[city] = { vendors: 0, views: 0, whatsappClicks: 0 };
    return byCity[city];
  }

  vendors.forEach((v) => {
    ensure(canonicalCity(v.city)).vendors += 1;
  });

  vendorViews.forEach((v) => {
    const city = vendorCityById.get(v.vendorId) || "Unknown";
    ensure(city).views += 1;
  });

  whatsappClicks.forEach((w) => {
    const city = vendorCityById.get(w.vendorId) || "Unknown";
    ensure(city).whatsappClicks += 1;
  });

  return Object.entries(byCity)
    .map(([city, stats]) => ({ city, ...stats }))
    .sort((a, b) => b.vendors - a.vendors);
}

// ─────────────────────────────────────────────────────────
// 10. CONVERSION FUNNEL
//     Product-view stage requires a product_views collection
//     (same pattern as vendor_views). Until that exists, this
//     funnel has 3 real stages instead of 4.
// ─────────────────────────────────────────────────────────
export async function getConversionFunnel() {
  const [vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  return [
    { stage: "Vendor Profile Views", value: vendorViews.length },
    { stage: "WhatsApp Clicks", value: whatsappClicks.length },
  ];
}

// ─────────────────────────────────────────────────────────
// 11. WHATSAPP-SPECIFIC ANALYTICS
// ─────────────────────────────────────────────────────────
export async function getWhatsappStats() {
  const [whatsappClicks, vendorsRaw, vendorViews] = await Promise.all([
    fetchCollection("whatsapp_clicks"),
    fetchCollection("vendors"),
    fetchCollection("vendor_views"),
  ]);

  const vendors = dedupeVendors(vendorsRaw).filter((v) => v.isActive !== false);

  const clicksByVendor = {};
  whatsappClicks.forEach((w) => {
    clicksByVendor[w.vendorId] = (clicksByVendor[w.vendorId] || 0) + 1;
  });
  const topVendorClicks = Math.max(0, ...Object.values(clicksByVendor));

  const avgClicksPerVendor = vendors.length
    ? Number((whatsappClicks.length / vendors.length).toFixed(1))
    : 0;

  const conversionRate = vendorViews.length
    ? Number(((whatsappClicks.length / vendorViews.length) * 100).toFixed(1))
    : 0;

  return {
    totalClicks: { value: whatsappClicks.length, changePct: null, trend: "up" },
    avgClicksPerVendor: {
      value: avgClicksPerVendor,
      changePct: null,
      trend: "up",
    },
    topVendorClicks: { value: topVendorClicks, changePct: null, trend: "up" },
    conversionRate: { value: conversionRate, changePct: null, trend: "up" },
  };
}

export async function getWhatsappTrend() {
  const whatsappClicks = await fetchCollection("whatsapp_clicks");

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [];
  const today = startOfDay(Date.now());

  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const clicks = whatsappClicks.filter((w) => {
      const t = toMillis(w.timestamp);
      return t >= dayStart && t < dayEnd;
    }).length;

    days.push({ day: dayLabels[new Date(dayStart).getDay()], clicks });
  }

  return days;
}

// ─────────────────────────────────────────────────────────
// 12. REPORT DATASETS — date-range-aware, powers reports.html
//
// Every other function in this file uses a FIXED window (all-
// time, or a hardcoded last-7-days trend). Reports needs an
// ARBITRARY admin-chosen window, so these are separate functions
// rather than retrofitting date params onto the ones above —
// that would risk subtly changing what Overview/Categories/
// Locations show, which must stay exactly as-is.
//
// Date range contract: (startMs, endMs) — either can be null
// meaning "unbounded on that side". Pass (null, null) for
// "All Time".
//
// IMPORTANT DESIGN NOTE — vendor/product counts vs. event counts:
// Vendor and product counts (e.g. "Vendors" column on the
// Categories/Locations reports) are always CURRENT SNAPSHOT
// counts, not "vendors created in this date range" — a vendor
// doesn't stop being a vendor because they joined outside the
// selected window. Only EVENTS (vendor_views, whatsapp_clicks,
// searches) are filtered by the date range, since those are the
// things that actually happened at a point in time. The Vendors
// and Products reports are the exception — there, createdAt IS
// the relevant date and rows ARE filtered by it, since "vendors
// report for last 30 days" naturally means "vendors who joined
// in the last 30 days".
// ─────────────────────────────────────────────────────────

// Returns true if a Firestore timestamp falls within [startMs, endMs].
// Either bound may be null (unbounded). If BOTH are null ("All Time"),
// everything passes — including docs with no timestamp at all.
// If a range IS applied, docs with no timestamp are excluded, since
// we have no basis to say they fall inside a specific window.
function inRange(ts, startMs, endMs) {
  if (startMs == null && endMs == null) return true;
  const t = toMillis(ts);
  if (!t) return false;
  if (startMs != null && t < startMs) return false;
  if (endMs != null && t > endMs) return false;
  return true;
}

function formatDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 12a. VENDORS — filtered by createdAt (vendors who joined in-range)
export async function getVendorsReportData(startMs, endMs) {
  const vendorsRaw = await fetchCollection("vendors");
  const vendors = dedupeVendors(vendorsRaw);

  return vendors
    .filter((v) => inRange(v.createdAt, startMs, endMs))
    .map((v) => {
      const createdMs = toMillis(v.createdAt);
      return {
        businessName: v.businessName || "No Name",
        category: v.category || "Other",
        subCategory: v.subCategory || "—",
        city: canonicalCity(v.city),
        state: v.state || "—",
        whatsapp: v.whatsapp || v.phone || "—",
        status: v.isActive === false ? "Inactive" : "Active",
        claimed: v.ownerUid ? "Yes" : "No",
        createdAtLabel: createdMs ? formatDate(createdMs) : "—",
        createdAtMs: createdMs,
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

// 12b. PRODUCTS — filtered by createdAt (products listed in-range)
export async function getProductsReportData(startMs, endMs) {
  const products = await fetchCollection("products");

  return products
    .filter((p) => inRange(p.createdAt, startMs, endMs))
    .map((p) => {
      const createdMs = toMillis(p.createdAt);
      return {
        name: p.name || "Untitled Product",
        vendor: p.vendorName || "Unknown",
        category: p.category || "Other",
        price: p.price ? Number(p.price) : 0,
        status: p.status || "published",
        createdAtLabel: createdMs ? formatDate(createdMs) : "—",
        createdAtMs: createdMs,
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

// 12c. CATEGORIES — vendor counts are a current snapshot;
// views/clicks are filtered to the selected date range.
export async function getCategoriesReportData(startMs, endMs) {
  const [vendorsRaw, vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendors"),
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const vendors = dedupeVendors(vendorsRaw).filter((v) => v.isActive !== false);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  const vendorCounts = {};
  vendors.forEach((v) => {
    const cat = (v.category || "Other").trim();
    vendorCounts[cat] = (vendorCounts[cat] || 0) + 1;
  });

  const viewCounts = {};
  vendorViews
    .filter((v) => inRange(v.timestamp, startMs, endMs))
    .forEach((v) => {
      const vendor = vendorById.get(v.vendorId);
      const cat = vendor && (vendor.category || "Other").trim();
      if (!cat) return;
      viewCounts[cat] = (viewCounts[cat] || 0) + 1;
    });

  const clickCounts = {};
  whatsappClicks
    .filter((w) => inRange(w.timestamp, startMs, endMs))
    .forEach((w) => {
      const vendor = vendorById.get(w.vendorId);
      const cat = vendor && (vendor.category || "Other").trim();
      if (!cat) return;
      clickCounts[cat] = (clickCounts[cat] || 0) + 1;
    });

  const allCats = new Set([
    ...Object.keys(vendorCounts),
    ...Object.keys(viewCounts),
    ...Object.keys(clickCounts),
  ]);

  return Array.from(allCats)
    .map((category) => {
      const v = vendorCounts[category] || 0;
      const views = viewCounts[category] || 0;
      const clicks = clickCounts[category] || 0;
      return {
        category,
        vendors: v,
        views,
        whatsappClicks: clicks,
        conversion: views ? Number(((clicks / views) * 100).toFixed(1)) : null,
      };
    })
    .sort((a, b) => b.views - a.views);
}

// 12d. LOCATIONS — same pattern as Categories, using the
// canonicalCity() dedup so this stays consistent with the
// Locations page's own numbers.
export async function getLocationsReportData(startMs, endMs) {
  const [vendorsRaw, vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendors"),
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const vendors = dedupeVendors(vendorsRaw).filter((v) => v.isActive !== false);
  const vendorCityById = new Map(
    vendors.map((v) => [v.id, canonicalCity(v.city)]),
  );

  const vendorCounts = {};
  vendors.forEach((v) => {
    const city = canonicalCity(v.city);
    vendorCounts[city] = (vendorCounts[city] || 0) + 1;
  });

  const viewCounts = {};
  vendorViews
    .filter((v) => inRange(v.timestamp, startMs, endMs))
    .forEach((v) => {
      const city = vendorCityById.get(v.vendorId) || "Unknown";
      viewCounts[city] = (viewCounts[city] || 0) + 1;
    });

  const clickCounts = {};
  whatsappClicks
    .filter((w) => inRange(w.timestamp, startMs, endMs))
    .forEach((w) => {
      const city = vendorCityById.get(w.vendorId) || "Unknown";
      clickCounts[city] = (clickCounts[city] || 0) + 1;
    });

  const allCities = new Set([
    ...Object.keys(vendorCounts),
    ...Object.keys(viewCounts),
    ...Object.keys(clickCounts),
  ]);

  return Array.from(allCities)
    .map((city) => {
      const v = vendorCounts[city] || 0;
      const views = viewCounts[city] || 0;
      const clicks = clickCounts[city] || 0;
      return {
        city,
        vendors: v,
        views,
        whatsappClicks: clicks,
        conversion: views ? Number(((clicks / views) * 100).toFixed(1)) : null,
      };
    })
    .sort((a, b) => b.vendors - a.vendors);
}

// 12e. SEARCH TERMS — filtered by timestamp, grouped + counted
export async function getSearchTermsReportData(startMs, endMs) {
  const searches = await fetchCollection("searches");
  const filtered = searches.filter((s) => inRange(s.timestamp, startMs, endMs));

  const grouped = {};
  filtered.forEach((s) => {
    const term = (s.keyword || s.term || "").trim().toLowerCase();
    if (!term) return;
    if (!grouped[term]) grouped[term] = { term, count: 0, lastMs: 0 };
    grouped[term].count += 1;
    const t = toMillis(s.timestamp);
    if (t > grouped[term].lastMs) grouped[term].lastMs = t;
  });

  return Object.values(grouped)
    .map((g) => ({
      term: g.term,
      count: g.count,
      lastSearchedLabel: g.lastMs ? formatDateTime(g.lastMs) : "—",
      lastMs: g.lastMs,
    }))
    .sort((a, b) => b.count - a.count);
}

// 12f. WHATSAPP — raw click log, filtered by timestamp, newest first
export async function getWhatsappReportData(startMs, endMs) {
  const whatsappClicks = await fetchCollection("whatsapp_clicks");

  return whatsappClicks
    .filter((w) => inRange(w.timestamp, startMs, endMs))
    .map((w) => {
      const t = toMillis(w.timestamp);
      return {
        vendorName: w.vendorName || "Unknown vendor",
        productName: w.productName || "—",
        clickedAtLabel: t ? formatDateTime(t) : "—",
        timestampMs: t,
      };
    })
    .sort((a, b) => b.timestampMs - a.timestampMs);
}

// 12g. TRAFFIC — daily vendor_views + whatsapp_clicks breakdown
// across an ARBITRARY range (unlike getVisitorTrend(), which is
// hardcoded to the last 7 days). If both bounds are null ("All
// Time"), the range is derived from the earliest/latest event
// timestamp found in the data. Capped at 400 days per report to
// keep the CSV/table from growing unbounded.
export async function getTrafficReportData(startMs, endMs) {
  const [vendorViews, whatsappClicks] = await Promise.all([
    fetchCollection("vendor_views"),
    fetchCollection("whatsapp_clicks"),
  ]);

  const filteredViews = vendorViews.filter((v) =>
    inRange(v.timestamp, startMs, endMs),
  );
  const filteredClicks = whatsappClicks.filter((w) =>
    inRange(w.timestamp, startMs, endMs),
  );

  let rangeStart = startMs;
  let rangeEnd = endMs;

  if (rangeStart == null || rangeEnd == null) {
    const allTimestamps = [
      ...filteredViews.map((v) => toMillis(v.timestamp)),
      ...filteredClicks.map((w) => toMillis(w.timestamp)),
    ].filter(Boolean);

    if (allTimestamps.length === 0) return [];

    if (rangeStart == null) rangeStart = Math.min(...allTimestamps);
    if (rangeEnd == null) rangeEnd = Math.max(...allTimestamps);
  }

  const days = [];
  let cursor = startOfDay(rangeStart);
  const endBoundary = rangeEnd;
  let guard = 0;

  while (cursor <= endBoundary && guard < 400) {
    const dayStart = cursor;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const visitors = filteredViews.filter((v) => {
      const t = toMillis(v.timestamp);
      return t >= dayStart && t < dayEnd;
    }).length;

    const clicks = filteredClicks.filter((w) => {
      const t = toMillis(w.timestamp);
      return t >= dayStart && t < dayEnd;
    }).length;

    days.push({
      dateLabel: formatDate(dayStart),
      dateMs: dayStart,
      visitors,
      whatsappClicks: clicks,
    });

    cursor += 24 * 60 * 60 * 1000;
    guard++;
  }

  return days;
}

// ─────────────────────────────────────────────────────────
// 13. CSV EXPORT — generic helper for any page's download button
//
// Usage:
//   downloadCSV("locations.csv",
//     ["City", "Vendors", "Views", "WA Clicks", "Conversion"],
//     rows.map(r => [r.city, r.vendors, r.views, r.whatsappClicks, r.conv])
//   );
//
// This will also be reused by admin/reports.js when that page
// is built (Step in roadmap: "CSV export of any of the above
// datasets").
// ─────────────────────────────────────────────────────────
export function downloadCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    const str = String(val ?? "");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escapeCell).join(",")];
  rows.forEach((row) => {
    lines.push(row.map(escapeCell).join(","));
  });

  const csvContent = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
