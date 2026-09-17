const { STORAGE_KEYS, ROUTES, MESSAGE_TYPE } = globalThis.Gitlas;

const EXAMPLE_REQUIREMENTS = [
  "Employee leave management with approval workflow",
  "JWT authentication and RBAC",
  "Multi-channel notification service",
  "Secure document upload with virus scanning",
];

const repoContextSection = document.getElementById("repo-context");
const repoSourceNode = document.getElementById("repo-source");
const repoNameNode = document.getElementById("repo-name");
const openRepoButton = document.getElementById("open-repo");
const requirementInput = document.getElementById("requirement-input");
const discoverButton = document.getElementById("discover-btn");
const examplesRoot = document.getElementById("examples");
const closeButton = document.getElementById("close-panel");
const statusNode = document.getElementById("app-status");
const statusText = document.getElementById("app-status-text");

/** Repository the drawer is currently showing, in Gitlas `Repository` shape. */
let currentRepository = null;

async function launch(route, params) {
  const panelParams = { ...(params ?? {}), panel: "1" };
  window.location.assign(await globalThis.Gitlas.buildRoute(route, panelParams));
}

async function discover() {
  const requirement = requirementInput.value.trim();

  if (requirement && globalThis.Gitlas.storageAvailable()) {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.requirement]: requirement,
      updatedAt: Date.now(),
    });
  }

  await launch(ROUTES.discover, requirement ? { q: requirement } : undefined);
}

function renderRepository(repository) {
  currentRepository = repository ?? null;

  if (!currentRepository?.repositoryName) {
    repoContextSection.hidden = true;
    return;
  }

  const meta = globalThis.Gitlas.getSourceMeta(currentRepository.source);
  repoSourceNode.textContent = meta.label;
  repoSourceNode.className = `g-badge g-badge--${meta.id === "azure-devops" ? "azure" : meta.id}`;
  repoNameNode.textContent = currentRepository.repositoryName;
  repoContextSection.hidden = false;
}

function renderExamples() {
  EXAMPLE_REQUIREMENTS.forEach((example) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "g-chip";
    chip.textContent = example;
    chip.addEventListener("click", () => {
      requirementInput.value = example;
      void discover();
    });
    examplesRoot.appendChild(chip);
  });
}

async function refreshStatus() {
  const { baseUrl, useBundledApp } = await globalThis.Gitlas.getSettings();

  if (useBundledApp) {
    statusNode.classList.add("g-status--online");
    statusText.textContent = "Using bundled Gitlas build";
    return;
  }

  const reachable = await globalThis.Gitlas.isAppReachable();
  statusNode.classList.toggle("g-status--online", reachable);
  statusNode.classList.toggle("g-status--offline", !reachable);
  statusText.textContent = reachable ? `Connected to ${baseUrl}` : `Gitlas app not reachable at ${baseUrl}`;
}

async function restoreRequirement() {
  if (!globalThis.Gitlas.storageAvailable()) return;

  const stored = await chrome.storage.sync.get([STORAGE_KEYS.requirement]);
  requirementInput.value = String(stored?.[STORAGE_KEYS.requirement] ?? "");
}

window.addEventListener("message", (event) => {
  if (event.data?.type !== MESSAGE_TYPE) return;

  const payload = event.data.payload ?? {};
  renderRepository(payload.repository);

  if (payload.requirement && !requirementInput.value.trim()) {
    requirementInput.value = payload.requirement;
  }
});

if (globalThis.Gitlas.storageAvailable()) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.requirement)) return;
    requirementInput.value = String(changes[STORAGE_KEYS.requirement]?.newValue ?? "");
  });
}

closeButton.addEventListener("click", () => {
  window.parent.postMessage({ type: "GITLAS_CLOSE_PANEL" }, "*");
});

openRepoButton.addEventListener("click", () => {
  globalThis.Gitlas.openRepositorySource(currentRepository);
});

discoverButton.addEventListener("click", () => void discover());

requirementInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    void discover();
  }
});

renderExamples();
void restoreRequirement().then(refreshStatus);
