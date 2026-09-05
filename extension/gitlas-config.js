/**
 * Shared Gitlas runtime config.
 *
 * Loaded as a plain script (no ES module) so the popup, the injected panel and
 * the GitHub content script can all share one copy. Content scripts from the
 * same extension share an isolated-world global, so `globalThis.Gitlas` is
 * visible to content.js as long as this file is listed first in the manifest.
 */
(function attachGitlas(global) {
  "use strict";

  const STORAGE_KEYS = {
    baseUrl: "gitlas.baseUrl",
    useBundledApp: "gitlas.useBundledApp",
    requirement: "gitlas.requirement",
    autoOpenPanel: "gitlas.autoOpenPanel",
    searchHistory: "gitlas.searchHistory",
  };

  const MAX_HISTORY_ENTRIES = 5;

  const DEFAULT_BASE_URL = "http://localhost:5173";

  /** Path to the production React build when it is bundled into the extension. */
  const BUNDLED_APP_PATH = "app/index.html";

  const ROUTES = {
    discover: "/",
    search: "/search",
    repository: "/repository",
    components: "/components",
    access: "/access",
  };

  const MESSAGE_TYPE = "GITLAS_CONTEXT";

  const SOURCE_META = {
    github: { id: "github", label: "GitHub", short: "GH", color: "#8b7dff" },
    "azure-devops": { id: "azure-devops", label: "Azure DevOps", short: "ADO", color: "#3b9dff" },
    salesforce: { id: "salesforce", label: "Salesforce", short: "SF", color: "#00c9c9" },
  };

  function normaliseSource(raw) {
    const value = String(raw ?? "").toLowerCase();
    if (value.includes("azure") || value.includes("ado") || value.includes("devops")) return "azure-devops";
    if (value.includes("salesforce") || value === "sfdc" || value === "sf") return "salesforce";
    return "github";
  }

  function getSourceMeta(source) {
    return SOURCE_META[normaliseSource(source)];
  }

  /**
   * Mirrors resolveRepositoryUrl() in frontend/src/lib/platform.ts so links
   * opened from the extension land on the same destination as links in the app.
   */
  function resolveRepositoryUrl(repo) {
    if (!repo) return "";

    const url = String(repo.url ?? "").trim();
    if (/^https?:\/\//i.test(url)) return url;

    const rawName = String(repo.repositoryName ?? "").trim();
    if (!rawName) return "";

    switch (normaliseSource(repo.source)) {
      case "azure-devops":
        return `https://dev.azure.com/contoso/_git/${encodeURIComponent(rawName)}`;
      case "salesforce":
        return `https://contoso.my.salesforce.com/lightning/n/${encodeURIComponent(rawName)}`;
      default:
        return `https://github.com/${rawName}`;
    }
  }

  function isExtensionContext() {
    return typeof chrome !== "undefined" && Boolean(chrome.runtime?.getURL);
  }

  function storageAvailable() {
    return typeof chrome !== "undefined" && Boolean(chrome.storage?.sync);
  }

  async function getSettings() {
    if (!storageAvailable()) {
      return { baseUrl: DEFAULT_BASE_URL, useBundledApp: false };
    }

    const data = await chrome.storage.sync.get([STORAGE_KEYS.baseUrl, STORAGE_KEYS.useBundledApp]);
    const stored = String(data?.[STORAGE_KEYS.baseUrl] ?? "").trim();

    return {
      baseUrl: stored || DEFAULT_BASE_URL,
      useBundledApp: Boolean(data?.[STORAGE_KEYS.useBundledApp]),
    };
  }

  async function saveSettings(settings) {
    if (!storageAvailable()) return;

    await chrome.storage.sync.set({
      [STORAGE_KEYS.baseUrl]: String(settings.baseUrl ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
      [STORAGE_KEYS.useBundledApp]: Boolean(settings.useBundledApp),
    });
  }

  /** Root of the React app — either the dev/preview server or the bundled build. */
  async function getAppRoot() {
    const { baseUrl, useBundledApp } = await getSettings();

    if (useBundledApp && isExtensionContext()) {
      return chrome.runtime.getURL(BUNDLED_APP_PATH);
    }
    return baseUrl.replace(/\/+$/, "");
  }

  /** The app uses HashRouter, so every route lives behind `#`. */
  function buildUrl(appRoot, route, params) {
    const path = route && route.startsWith("/") ? route : `/${route ?? ""}`;
    const query = params ? new URLSearchParams(params).toString() : "";
    return `${appRoot}#${path}${query ? `?${query}` : ""}`;
  }

  async function buildRoute(route, params) {
    return buildUrl(await getAppRoot(), route, params);
  }

  async function openGitlas(route, params) {
    const url = await buildRoute(route, params);

    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      await chrome.tabs.create({ url });
    } else {
      global.open(url, "_blank", "noopener,noreferrer");
    }
    return url;
  }

  async function openSearch(query) {
    const trimmed = String(query ?? "").trim();
    return trimmed ? openGitlas(ROUTES.search, { q: trimmed }) : openGitlas(ROUTES.discover);
  }

  async function openRepositoryDetails(repositoryId) {
    return openGitlas(`${ROUTES.repository}/${encodeURIComponent(repositoryId)}`);
  }

  /** Opens the repository on its own platform, not inside Gitlas. */
  function openRepositorySource(repo) {
    const url = resolveRepositoryUrl(repo);
    if (!url) return "";

    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      void chrome.tabs.create({ url });
    } else {
      global.open(url, "_blank", "noopener,noreferrer");
    }
    return url;
  }

  /** Best-effort reachability probe for the dev server, used for the status dot. */
  async function isAppReachable() {
    const { useBundledApp } = await getSettings();
    if (useBundledApp) return true;

    const appRoot = await getAppRoot();
    try {
      await fetch(appRoot, { method: "GET", mode: "no-cors", cache: "no-store" });
      return true;
    } catch {
      return false;
    }
  }

  // --- Search history -------------------------------------------------------
  // Kept in chrome.storage.local: the web app's own history lives in the page's
  // localStorage, which the extension cannot read.

  function historyStorage() {
    return typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
  }

  async function getSearchHistory() {
    const store = historyStorage();
    if (!store) return [];

    try {
      const data = await store.get([STORAGE_KEYS.searchHistory]);
      const entries = data?.[STORAGE_KEYS.searchHistory];
      return Array.isArray(entries) ? entries : [];
    } catch {
      return [];
    }
  }

  async function recordSearch(query) {
    const store = historyStorage();
    const trimmed = String(query ?? "").trim();
    if (!store || !trimmed) return;

    const existing = await getSearchHistory();
    const next = [
      { query: trimmed, timestamp: Date.now() },
      ...existing.filter((e) => String(e?.query ?? "").toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_HISTORY_ENTRIES);

    await store.set({ [STORAGE_KEYS.searchHistory]: next });
  }

  async function clearSearchHistory() {
    await historyStorage()?.remove(STORAGE_KEYS.searchHistory);
  }

  global.Gitlas = {
    STORAGE_KEYS,
    DEFAULT_BASE_URL,
    BUNDLED_APP_PATH,
    MAX_HISTORY_ENTRIES,
    ROUTES,
    MESSAGE_TYPE,
    SOURCE_META,
    normaliseSource,
    getSourceMeta,
    resolveRepositoryUrl,
    getSettings,
    saveSettings,
    getAppRoot,
    buildUrl,
    buildRoute,
    openGitlas,
    openSearch,
    openRepositoryDetails,
    openRepositorySource,
    isAppReachable,
    storageAvailable,
    getSearchHistory,
    recordSearch,
    clearSearchHistory,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
