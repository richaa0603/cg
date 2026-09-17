console.log("Gitlas content script loaded");

const ROOT_ID = "gitlas-root";
const NAV_ITEM_ID = "gitlas-nav-item";
const DRAWER_WIDTH = "700px";

const { STORAGE_KEYS, MESSAGE_TYPE, ROUTES, BUNDLED_APP_PATH } = globalThis.Gitlas;

let panelOpen = false;
let panelFrame = null;

function storageSyncAvailable() {
  return globalThis.Gitlas.storageAvailable();
}

/**
 * Derives the Gitlas `Repository` shape from the GitHub URL so the drawer can
 * hand it straight to resolveRepositoryUrl().
 */
function detectRepository() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [owner, name] = segments;
  const reserved = new Set([
    "settings",
    "notifications",
    "explore",
    "marketplace",
    "pulls",
    "issues",
    "codespaces",
    "sponsors",
    "orgs",
    "topics",
    "search",
    "new",
  ]);
  if (reserved.has(owner.toLowerCase())) return null;

  const repositoryName = `${owner}/${name}`;
  return {
    repositoryName,
    source: "github",
    url: `${window.location.origin}/${repositoryName}`,
  };
}

async function readRequirement() {
  if (!storageSyncAvailable()) return "";

  try {
    const data = await chrome.storage.sync.get([STORAGE_KEYS.requirement]);
    return String(data?.[STORAGE_KEYS.requirement] ?? "");
  } catch (error) {
    console.error("Gitlas: failed to read stored requirement", error);
    return "";
  }
}

async function postContextToPanel() {
  if (!panelFrame?.contentWindow) return;

  panelFrame.contentWindow.postMessage(
    {
      type: MESSAGE_TYPE,
      payload: {
        repository: detectRepository(),
        requirement: await readRequirement(),
      },
    },
    "*",
  );
}

function createDrawerContainer() {
  const existing = document.getElementById(ROOT_ID);
  if (existing) return existing;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.position = "fixed";
  root.style.right = "0";
  root.style.top = "0";
  root.style.height = "100vh";
  root.style.width = DRAWER_WIDTH;
  root.style.maxWidth = "100vw";
  root.style.zIndex = "2147483000";
  root.style.transform = "translateX(100%)";
  root.style.transition = "transform 0.25s ease";
  root.style.background = "#070b14";
  root.style.borderLeft = "1px solid #1f2b40";
  root.style.boxShadow = "-18px 0 46px rgba(0,0,0,0.55)";

  const iframe = document.createElement("iframe");
  iframe.title = "Gitlas";
  iframe.src = chrome.runtime.getURL("panel.html");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.background = "#070b14";
  iframe.addEventListener("load", () => void postContextToPanel());

  root.appendChild(iframe);
  document.body.appendChild(root);
  panelFrame = iframe;

  return root;
}

function setDrawerOpen(open) {
  const drawer = createDrawerContainer();
  panelOpen = open;
  drawer.style.transform = open ? "translateX(0)" : "translateX(100%)";

  if (open) void postContextToPanel();
}

function openSearchInDrawer(requirement) {
  const query = String(requirement ?? "").trim();
  const drawer = createDrawerContainer();
  const iframe = drawer.querySelector("iframe");
  const appRoot = chrome.runtime.getURL(BUNDLED_APP_PATH);

  iframe.src = globalThis.Gitlas.buildUrl(appRoot, ROUTES.discover, {
    q: query,
    panel: "1",
  });
  setDrawerOpen(true);
}

function createNavItem() {
  if (document.getElementById(NAV_ITEM_ID)) return;

  const navContainer =
    document.querySelector("[aria-label='Global']") ||
    document.querySelector(".AppHeader-globalBar") ||
    document.querySelector("header .AppHeader-context-full");

  if (!navContainer) return;

  console.log("Injecting Gitlas button");

  const button = document.createElement("button");
  button.id = NAV_ITEM_ID;
  button.type = "button";
  button.textContent = "Gitlas";
  button.title = "Gitlas - Discover Before You Build";
  button.style.marginLeft = "12px";
  button.style.border = "1px solid rgba(109,94,252,0.45)";
  button.style.borderRadius = "999px";
  button.style.padding = "6px 13px";
  button.style.background = "linear-gradient(135deg, rgba(109,94,252,0.9), rgba(34,211,238,0.75))";
  button.style.color = "#fff";
  button.style.fontSize = "12px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDrawerOpen(!panelOpen);
  });

  navContainer.appendChild(button);
}

window.addEventListener("message", (event) => {
  if (event.data?.type === "GITLAS_CLOSE_PANEL") setDrawerOpen(false);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "GITLAS_OPEN_SEARCH") return;
  openSearchInDrawer(message.payload?.requirement);
});

async function bootstrap() {
  if (!storageSyncAvailable()) {
    console.error("Gitlas: chrome.storage is unavailable");
    return;
  }

  try {
    const data = await chrome.storage.sync.get([STORAGE_KEYS.autoOpenPanel]);

    createNavItem();
    createDrawerContainer();

    if (data?.[STORAGE_KEYS.autoOpenPanel]) {
      setDrawerOpen(true);
      await chrome.storage.sync.set({ [STORAGE_KEYS.autoOpenPanel]: false });
    }
  } catch (error) {
    console.error("Gitlas: failed to initialize drawer state", error);
  }
}

function startWhenDomReady() {
  void bootstrap();

  // GitHub navigates client-side, so re-inject the button and refresh context.
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    createNavItem();

    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      if (panelOpen) void postContextToPanel();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startWhenDomReady, { once: true });
} else {
  startWhenDomReady();
}
