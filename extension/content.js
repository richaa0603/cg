console.log("Consultant Copilot content script loaded");

const ROOT_ID = "consultant-copilot-root";
const NAV_ITEM_ID = "consultant-copilot-nav-item";
const DRAWER_WIDTH = "500px";

let panelOpen = false;

function storageSyncAvailable() {
  return Boolean(
    typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.sync,
  );
}

function createDrawerContainer() {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.style.position = "fixed";
  root.style.right = "0";
  root.style.top = "0";
  root.style.height = "100vh";
  root.style.width = DRAWER_WIDTH;
  root.style.zIndex = "999999";
  root.style.transform = "translateX(100%)";
  root.style.transition = "transform 0.25s ease";
  root.style.background = "#0F172A";
  root.style.borderLeft = "1px solid #334155";
  root.style.boxShadow = "-12px 0 30px rgba(0,0,0,0.35)";

  const iframe = document.createElement("iframe");
  iframe.title = "Consultant Copilot";
  iframe.src = chrome.runtime.getURL("panel.html");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.background = "#0F172A";

  root.appendChild(iframe);
  document.body.appendChild(root);

  return root;
}

function setDrawerOpen(open) {
  const drawer = createDrawerContainer();
  panelOpen = open;
  if (open) {
    console.log("Opening Copilot drawer");
  }
  drawer.style.transform = open ? "translateX(0)" : "translateX(100%)";
}

function createNavItem() {
  if (document.getElementById(NAV_ITEM_ID)) {
    return;
  }

  const navContainer =
    document.querySelector("[aria-label='Global']") ||
    document.querySelector(".AppHeader-globalBar") ||
    document.querySelector("header .AppHeader-context-full");

  if (!navContainer) {
    return;
  }

  console.log("Injecting Consultant Copilot button");

  const button = document.createElement("button");
  button.id = NAV_ITEM_ID;
  button.type = "button";
  button.textContent = "Consultant Copilot";
  button.style.marginLeft = "12px";
  button.style.border = "1px solid #334155";
  button.style.borderRadius = "999px";
  button.style.padding = "7px 12px";
  button.style.background = "#1E293B";
  button.style.color = "#E2E8F0";
  button.style.fontSize = "12px";
  button.style.cursor = "pointer";

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDrawerOpen(!panelOpen);
  });

  navContainer.appendChild(button);
}

async function bootstrap() {
  if (!storageSyncAvailable()) {
    console.error("Chrome storage unavailable");
    return;
  }

  try {
    const data = await chrome.storage.sync.get([
      "projectRequirement",
      "copilotAutoOpen",
    ]);

    createNavItem();
    createDrawerContainer();

    if (data?.copilotAutoOpen) {
      setDrawerOpen(true);
      await chrome.storage.sync.set({ copilotAutoOpen: false });
    }
  } catch (error) {
    console.error("Failed to initialize drawer state", error);
  }
}

function startWhenDomReady() {
  console.log("GitHub page detected");
  void bootstrap();

  const observer = new MutationObserver(() => {
    createNavItem();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startWhenDomReady, { once: true });
} else {
  startWhenDomReady();
}
