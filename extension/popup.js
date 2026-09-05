const { STORAGE_KEYS, ROUTES, DEFAULT_BASE_URL } = globalThis.Gitlas;

const EXAMPLES = [
  "Need JWT Authentication with RBAC",
  "Need Employee Leave Management",
  "Need Notification Service",
];

const CAPABILITIES = [
  "JWT Auth",
  "Notifications",
  "HRMS",
  "Approvals",
  "Document Processing",
  "Payments",
  "CRM",
];

const queryInput = document.getElementById("query");
const examplesRoot = document.getElementById("examples");
const capabilitiesRoot = document.getElementById("capabilities");
const recentBlock = document.getElementById("recent-block");
const recentRoot = document.getElementById("recent");
const clearRecentButton = document.getElementById("clear-recent");
const ctaButton = document.getElementById("cta");

const settingsSheet = document.getElementById("settings-sheet");
const openSettingsButton = document.getElementById("open-settings");
const closeSettingsButton = document.getElementById("close-settings");
const baseUrlInput = document.getElementById("base-url");
const useBundledInput = document.getElementById("use-bundled");
const saveSettingsButton = document.getElementById("save-settings");
const sheetStatus = document.getElementById("sheet-status");

const CLOCK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`;

/** Runs a search: remembers it, then opens the Gitlas results route. */
async function search(rawQuery) {
  const query = String(rawQuery ?? "").trim();
  if (!query) {
    queryInput.focus();
    return;
  }

  try {
    await globalThis.Gitlas.recordSearch(query);

    if (globalThis.Gitlas.storageAvailable()) {
      await chrome.storage.sync.set({ [STORAGE_KEYS.requirement]: query, updatedAt: Date.now() });
    }

    await globalThis.Gitlas.openGitlas(ROUTES.search, { q: query });
    window.close();
  } catch (error) {
    console.error("Gitlas: search failed", error);
    openSettings("Could not open Gitlas. Check the app URL.", true);
  }
}

function renderExamples() {
  EXAMPLES.forEach((example) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example";
    button.textContent = example;
    button.addEventListener("click", () => void search(example));
    item.appendChild(button);
    examplesRoot.appendChild(item);
  });
}

function renderCapabilities() {
  CAPABILITIES.forEach((capability) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = capability;
    chip.addEventListener("click", () => void search(capability));
    capabilitiesRoot.appendChild(chip);
  });
}

async function renderRecent() {
  const history = await globalThis.Gitlas.getSearchHistory();
  recentRoot.replaceChildren();
  recentBlock.hidden = history.length === 0;

  history.forEach((entry) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent__item";
    button.title = entry.query;

    const icon = document.createElement("span");
    icon.innerHTML = CLOCK_ICON;

    const text = document.createElement("span");
    text.className = "recent__text";
    text.textContent = entry.query;

    button.append(icon.firstChild, text);
    button.addEventListener("click", () => void search(entry.query));
    item.appendChild(button);
    recentRoot.appendChild(item);
  });
}

// --- Settings sheet ---------------------------------------------------------

function openSettings(message = "", isError = false) {
  sheetStatus.textContent = message;
  sheetStatus.classList.toggle("sheet__status--error", isError);
  settingsSheet.hidden = false;
  baseUrlInput.focus();
}

function closeSettings() {
  settingsSheet.hidden = true;
  sheetStatus.textContent = "";
}

async function loadSettings() {
  const { baseUrl, useBundledApp } = await globalThis.Gitlas.getSettings();
  baseUrlInput.value = baseUrl || DEFAULT_BASE_URL;
  useBundledInput.checked = useBundledApp;
}

saveSettingsButton.addEventListener("click", async () => {
  try {
    await globalThis.Gitlas.saveSettings({
      baseUrl: baseUrlInput.value.trim() || DEFAULT_BASE_URL,
      useBundledApp: useBundledInput.checked,
    });
    sheetStatus.classList.remove("sheet__status--error");
    sheetStatus.textContent = "Saved";
  } catch (error) {
    console.error("Gitlas: failed to save settings", error);
    sheetStatus.classList.add("sheet__status--error");
    sheetStatus.textContent = "Could not save settings";
  }
});

openSettingsButton.addEventListener("click", () => openSettings());
closeSettingsButton.addEventListener("click", closeSettings);

settingsSheet.addEventListener("click", (event) => {
  if (event.target === settingsSheet) closeSettings();
});

// --- Wiring -----------------------------------------------------------------

ctaButton.addEventListener("click", () => void search(queryInput.value));

queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void search(queryInput.value);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !settingsSheet.hidden) closeSettings();
});

clearRecentButton.addEventListener("click", async () => {
  await globalThis.Gitlas.clearSearchHistory();
  await renderRecent();
});

renderExamples();
renderCapabilities();
void renderRecent();
void loadSettings();
