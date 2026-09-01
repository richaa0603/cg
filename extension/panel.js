const menuItems = [
  // Only the Similar Repos tab is shown; all other tabs are disabled.
  {
    id: "projects",
    label: "Similar Repositories",
    subtitle: "Repositories that match your requirement",
  },
  // { id: "overview",        label: "Overview",              subtitle: "Requirement summary and stack inference" },
  // { id: "components",      label: "Reusable Components",   subtitle: "Reusable module recommendations" },
  // { id: "architecture",    label: "Recommended Architecture", subtitle: "Suggested platform topology" },
  // { id: "implementation",  label: "Implementation Plan",   subtitle: "Execution phases and complexity" },
  // { id: "experts",         label: "Experts",               subtitle: "Suggested technical experts" },
  // { id: "code-assets",     label: "Code Assets",           subtitle: "Reusable implementation snippets" },
  // { id: "delivery-risks",  label: "Delivery Risks",        subtitle: "Requirement-derived risk indicators" },
];

const menuRoot = document.getElementById("cc-menu");
const contentRoot = document.getElementById("cc-content");
const titleNode = document.getElementById("cc-title");
const subtitleNode = document.getElementById("cc-subtitle");

let currentRequirement = "";

function isStorageSyncAvailable() {
  return Boolean(
    typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.sync,
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function detectTechnologies(requirement) {
  const text = requirement.toLowerCase();
  const map = [
    ["react", "React"],
    ["angular", "Angular"],
    ["vue", "Vue"],
    [".net", ".NET"],
    ["node", "Node.js"],
    ["spring", "Spring Boot"],
    ["postgres", "PostgreSQL"],
    ["mysql", "MySQL"],
    ["mongo", "MongoDB"],
    ["redis", "Redis"],
    ["azure", "Azure"],
    ["aws", "AWS"],
  ];

  const detected = map.filter((entry) => text.includes(entry[0])).map((entry) => entry[1]);
  return detected.length > 0 ? detected : ["React", ".NET", "PostgreSQL", "Azure"];
}

function inferDomain(requirement) {
  const text = requirement.toLowerCase();
  if (text.includes("hr") || text.includes("employee") || text.includes("payroll")) {
    return "HRMS Platform";
  }
  if (text.includes("insurance") || text.includes("claim") || text.includes("policy")) {
    return "Insurance Platform";
  }
  if (text.includes("bank") || text.includes("finance") || text.includes("loan")) {
    return "Financial Services Platform";
  }
  if (text.includes("health") || text.includes("patient")) {
    return "Healthcare Platform";
  }
  return "Enterprise Delivery Platform";
}

function inferSummary(requirement) {
  if (!requirement.trim()) {
    return "No requirement captured yet. Use the extension popup and click Analyze.";
  }

  const excerpt = requirement.length > 220 ? `${requirement.slice(0, 220)}...` : requirement;
  return `Consultant Copilot analyzed this requirement and generated repository intelligence, reusable modules, architecture guidance, and delivery risk signals based on: ${excerpt}`;
}

function extractSearchKeywords(requirement) {
  const fallback = ["enterprise", "react", "dotnet", "platform"];
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "using",
    "build",
    "create",
    "need",
    "that",
    "this",
    "will",
    "should",
    "project",
    "application",
    "platform",
  ]);

  const tokens = requirement
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));

  const ranked = [];
  const seen = new Set();

  for (const token of tokens) {
    if (!seen.has(token)) {
      seen.add(token);
      ranked.push(token);
    }
  }

  const picked = ranked.slice(0, 6);
  return picked.length > 0 ? picked : fallback;
}

function calcScore(seed, context, min, max) {
  const terms = context
    .toLowerCase()
    .split(/\s+/)
    .filter((value) => value.length > 2);
  const hay = seed.toLowerCase();
  const hits = terms.filter((term) => hay.includes(term)).length;
  const ratio = terms.length ? hits / terms.length : 0.5;
  return Math.round(min + (max - min) * Math.min(1, ratio));
}

function renderOverview(requirement) {
  const technologies = detectTechnologies(requirement);
  const stack = ["React", ".NET", "PostgreSQL", "Azure"];

  contentRoot.innerHTML = `
    <article class="cc-card">
      <h3>Project Requirement</h3>
      <p>${escapeHtml(requirement || "No requirement provided.")}</p>
    </article>
    <article class="cc-card">
      <h3>Project Summary</h3>
      <p>${escapeHtml(inferSummary(requirement))}</p>
    </article>
    <article class="cc-card">
      <h3>Detected Technologies</h3>
      <div class="cc-tags">${technologies.map((item) => `<span class="cc-tag-chip">${escapeHtml(item)}</span>`).join("")}</div>
    </article>
    <article class="cc-card">
      <h3>Recommended Stack</h3>
      <div class="cc-tags">${stack.map((item) => `<span class="cc-tag-chip">${escapeHtml(item)}</span>`).join("")}</div>
      <p>Domain: ${escapeHtml(inferDomain(requirement))}</p>
    </article>
  `;
}

function renderProjectSkeleton() {
  const blocks = Array.from({ length: 4 })
    .map(
      () => `
      <article class="cc-card">
        <div class="cc-skeleton cc-skeleton-title"></div>
        <div class="cc-skeleton cc-skeleton-line"></div>
        <div class="cc-skeleton cc-skeleton-line short"></div>
        <div class="cc-skeleton cc-skeleton-row"></div>
      </article>
    `,
    )
    .join("");

  contentRoot.innerHTML = `<section class="cc-grid">${blocks}</section>`;
}

async function renderProjects(requirement) {
  renderProjectSkeleton();

  const keywords = extractSearchKeywords(requirement || "enterprise react dotnet");
  const query = keywords.join(" ");
  const endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub Search API failed with status ${response.status}`);
    }

    const data = await response.json();
    const repositories = (data.items || []).slice(0, 10);

    if (!repositories.length) {
      contentRoot.innerHTML = `
        <article class="cc-card cc-empty-state">
          <h3>No Similar Projects Found</h3>
          <p>Try adding more domain-specific keywords in your requirement and analyze again.</p>
        </article>
      `;
      return;
    }

    contentRoot.innerHTML = `
      <article class="cc-card cc-query-card">
        <h3>Search Keywords</h3>
        <div class="cc-tags">${keywords.map((item) => `<span class="cc-tag-chip">${escapeHtml(item)}</span>`).join("")}</div>
      </article>
      <section class="cc-grid">
        ${repositories
          .map((repo) => {
            const source = `${repo.name} ${repo.description || ""} ${repo.language || ""} ${(repo.topics || []).join(" ")}`;
            const techMatch = calcScore(source, detectTechnologies(requirement).join(" "), 68, 96);
            const domainMatch = calcScore(source, inferDomain(requirement), 64, 94);
            const architectureMatch = calcScore(source, "frontend backend api database cloud", 62, 90);
            const matchScore = Math.round((techMatch + domainMatch + architectureMatch) / 3);

            const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 5) : [];

            return `
              <article class="cc-card cc-repo-card">
                <h3>${escapeHtml(repo.full_name)}</h3>
                <p>${escapeHtml(repo.description || "No description available")}</p>
                <div class="cc-inline"><span>Language</span><span>${escapeHtml(repo.language || "Unknown")}</span></div>
                <div class="cc-inline"><span>Stars</span><span>⭐ ${Number(repo.stargazers_count || 0).toLocaleString()}</span></div>
                <div class="cc-inline"><span>Forks</span><span>${Number(repo.forks_count || 0).toLocaleString()}</span></div>
                <div class="cc-inline"><span>Match Score</span><span class="cc-badge match">${matchScore}%</span></div>
                <div class="cc-inline"><span>Technology Match</span><span>${techMatch}%</span></div>
                <div class="cc-inline"><span>Domain Match</span><span>${domainMatch}%</span></div>
                <div class="cc-inline"><span>Architecture Match</span><span>${architectureMatch}%</span></div>
                <div class="cc-topic-wrap">
                  <span class="cc-topic-label">Topics</span>
                  <div class="cc-tags">
                    ${topics.length ? topics.map((topic) => `<span class="cc-tag-chip">${escapeHtml(topic)}</span>`).join("") : '<span class="cc-tag-chip">No topics</span>'}
                  </div>
                </div>
                <a class="cc-link" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">View Repository</a>
              </article>
            `;
          })
          .join("")}
      </section>
    `;
  } catch (error) {
    contentRoot.innerHTML = `
      <article class="cc-card cc-empty-state">
        <h3>Unable to Load Similar Projects</h3>
        <p>${escapeHtml(error instanceof Error ? error.message : "Unexpected error")}</p>
      </article>
    `;
  }
}

function componentBaseline() {
  return [
    {
      name: "Authentication",
      description: "Centralized auth service for login, token issuance, and session controls.",
      potentialReuseValue: "Very High",
      complexity: "High",
      repositoriesUsingIt: 183,
    },
    {
      name: "RBAC",
      description: "Role-based access model for admin, manager, and user permission gates.",
      potentialReuseValue: "Very High",
      complexity: "Medium",
      repositoriesUsingIt: 156,
    },
    {
      name: "Notifications",
      description: "Notification hub for email, in-app alerts, and async message dispatch.",
      potentialReuseValue: "High",
      complexity: "Medium",
      repositoriesUsingIt: 194,
    },
    {
      name: "Analytics",
      description: "Event pipeline and metrics dashboard hooks for usage and performance analytics.",
      potentialReuseValue: "High",
      complexity: "High",
      repositoriesUsingIt: 122,
    },
    {
      name: "Workflow Engine",
      description: "State-machine orchestrator for approval and multi-step business workflows.",
      potentialReuseValue: "High",
      complexity: "High",
      repositoriesUsingIt: 96,
    },
    {
      name: "File Upload",
      description: "Document ingestion with validation, virus scanning, and metadata extraction.",
      potentialReuseValue: "High",
      complexity: "Medium",
      repositoriesUsingIt: 137,
    },
    {
      name: "Search",
      description: "Cross-entity search module with indexing and filtered query support.",
      potentialReuseValue: "Medium",
      complexity: "Medium",
      repositoriesUsingIt: 108,
    },
    {
      name: "Audit Logging",
      description: "Immutable audit trail for security reviews and regulatory compliance.",
      potentialReuseValue: "Very High",
      complexity: "Medium",
      repositoriesUsingIt: 142,
    },
  ];
}

function generateReusableComponents(requirement) {
  const text = requirement.toLowerCase();
  const list = componentBaseline();

  if (text.includes("real-time") || text.includes("websocket")) {
    list.push({
      name: "Realtime Gateway",
      description: "Push-based channel for live updates and status streaming.",
      potentialReuseValue: "Medium",
      complexity: "High",
      repositoriesUsingIt: 71,
    });
  }

  if (text.includes("report") || text.includes("dashboard")) {
    list.push({
      name: "Reporting Engine",
      description: "Exportable reports and scheduled aggregation jobs for operations.",
      potentialReuseValue: "High",
      complexity: "Medium",
      repositoriesUsingIt: 103,
    });
  }

  return list;
}

function reuseBadgeClass(value) {
  if (value === "Very High") {
    return "cc-badge very-high";
  }
  if (value === "High") {
    return "cc-badge high";
  }
  return "cc-badge medium";
}

function complexityBadgeClass(value) {
  if (value === "High") {
    return "cc-badge complexity-high";
  }
  if (value === "Medium") {
    return "cc-badge complexity-medium";
  }
  return "cc-badge complexity-low";
}

function renderComponents(requirement) {
  const components = generateReusableComponents(requirement);
  contentRoot.innerHTML = `
    <section class="cc-grid">
      ${components
        .map(
          (component) => `
          <article class="cc-card">
            <h3>${escapeHtml(component.name)}</h3>
            <p>${escapeHtml(component.description)}</p>
            <div class="cc-inline"><span>Potential Reuse Value</span><span class="${reuseBadgeClass(component.potentialReuseValue)}">${escapeHtml(component.potentialReuseValue)}</span></div>
            <div class="cc-inline"><span>Complexity</span><span class="${complexityBadgeClass(component.complexity)}">${escapeHtml(component.complexity)}</span></div>
            <div class="cc-inline"><span>Repositories Using It</span><span>${Number(component.repositoriesUsingIt).toLocaleString()}</span></div>
          </article>
        `,
        )
        .join("")}
    </section>
  `;
}

function detectStack(requirement) {
  const technologies = detectTechnologies(requirement);
  const frontend = technologies.find((item) => ["React", "Angular", "Vue"].includes(item)) || "React";
  const backend = technologies.find((item) => [".NET", "Node.js", "Spring Boot"].includes(item)) || ".NET";
  const database = technologies.find((item) => ["PostgreSQL", "MySQL", "MongoDB"].includes(item)) || "PostgreSQL";
  const cloud = technologies.find((item) => ["Azure", "AWS"].includes(item)) || "Azure";

  return { frontend, backend, database, cloud };
}

function renderArchitecture(requirement) {
  const stack = detectStack(requirement);

  const reasons = [
    `${stack.frontend} supports rapid UI delivery and maintainable component architecture.`,
    `${stack.backend} provides stable API services and business domain orchestration.`,
    `${stack.database} offers reliable transactional data storage with scalable indexing.`,
    `${stack.cloud} enables managed hosting, observability, and secure operations at scale.`,
  ];

  const scalabilityNotes = [
    "Use stateless API services with horizontal scaling behind a load balancer.",
    "Introduce caching for read-heavy endpoints and search indexes for discovery workflows.",
    "Adopt async event processing for notifications and long-running document tasks.",
  ];

  const deploymentStrategy = [
    "Containerize frontend and backend independently for isolated deployment cycles.",
    "Use blue/green rollout for backend APIs with health-check gates.",
    "Enable infrastructure-as-code with environment promotion (dev -> test -> prod).",
  ];

  contentRoot.innerHTML = `
    <article class="cc-card">
      <h3>Architecture Flow</h3>
      <div class="cc-flow">
        <div class="cc-node">Frontend: ${escapeHtml(stack.frontend)}</div>
        <div class="cc-arrow">↓</div>
        <div class="cc-node">Backend: ${escapeHtml(stack.backend)}</div>
        <div class="cc-arrow">↓</div>
        <div class="cc-node">Database: ${escapeHtml(stack.database)}</div>
        <div class="cc-arrow">↓</div>
        <div class="cc-node">Cloud: ${escapeHtml(stack.cloud)}</div>
      </div>
    </article>

    <article class="cc-card">
      <h3>Reasons For Recommendation</h3>
      <ul class="cc-list">${reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>

    <article class="cc-card">
      <h3>Scalability Notes</h3>
      <ul class="cc-list">${scalabilityNotes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>

    <article class="cc-card">
      <h3>Deployment Strategy</h3>
      <ul class="cc-list">${deploymentStrategy.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  `;
}

function generateImplementationPlan(requirement) {
  const text = requirement.toLowerCase();
  const phases = [
    { phase: "Phase 1", title: "Requirements", complexity: "Medium" },
    { phase: "Phase 2", title: "Architecture", complexity: "Medium" },
    { phase: "Phase 3", title: "Backend", complexity: "High" },
    { phase: "Phase 4", title: "Frontend", complexity: "High" },
    { phase: "Phase 5", title: "Testing", complexity: "Medium" },
    { phase: "Phase 6", title: "Deployment", complexity: "Medium" },
  ];

  if (text.includes("migration") || text.includes("legacy")) {
    phases.splice(2, 0, {
      phase: "Phase 3",
      title: "Migration Adapters",
      complexity: "High",
    });
  }

  return phases;
}

function renderImplementation(requirement) {
  const phases = generateImplementationPlan(requirement);
  contentRoot.innerHTML = `
    <article class="cc-card">
      <h3>Delivery Timeline</h3>
      <div class="cc-timeline">
        ${phases
          .map(
            (phase) => `
            <div class="cc-phase">
              <div>${escapeHtml(phase.phase)} - ${escapeHtml(phase.title)}</div>
              <div class="cc-inline"><span>Estimated Complexity</span><span>${escapeHtml(phase.complexity)}</span></div>
            </div>
          `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderExperts() {
  const experts = [
    {
      name: "React Expert",
      score: "96",
      repositories: "143",
      tags: ["React", "TypeScript", "Design System"],
    },
    {
      name: ".NET Expert",
      score: "94",
      repositories: "167",
      tags: [".NET", "APIs", "Domain Modeling"],
    },
    {
      name: "Azure Expert",
      score: "92",
      repositories: "121",
      tags: ["Azure", "DevOps", "Security"],
    },
  ];

  contentRoot.innerHTML = experts
    .map(
      (expert) => `
      <article class="cc-card">
        <h3>${escapeHtml(expert.name)}</h3>
        <div class="cc-inline"><span>Contribution Score</span><span>${escapeHtml(expert.score)}</span></div>
        <div class="cc-inline"><span>Repositories Contributed</span><span>${escapeHtml(expert.repositories)}</span></div>
        <div class="cc-tags">${expert.tags.map((tag) => `<span class="cc-tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>
      </article>
    `,
    )
    .join("");
}

function renderCodeAssets() {
  const assets = [
    ["JWT Middleware", "Middleware", "C#", "95%", "https://github.com/search?q=jwt+middleware+dotnet&type=repositories"],
    ["File Upload API", "REST API", "TypeScript", "89%", "https://github.com/search?q=file+upload+api+typescript&type=repositories"],
    ["Approval Workflow", "Workflow Engine", "TypeScript", "86%", "https://github.com/search?q=approval+workflow+engine&type=repositories"],
    ["Notification Service", "Messaging", "C#", "92%", "https://github.com/search?q=notification+service+dotnet&type=repositories"],
  ];

  contentRoot.innerHTML = assets
    .map(
      (asset) => `
      <article class="cc-card">
        <h3>${escapeHtml(asset[0])}</h3>
        <div class="cc-inline"><span>Code Type</span><span>${escapeHtml(asset[1])}</span></div>
        <div class="cc-inline"><span>Language</span><span>${escapeHtml(asset[2])}</span></div>
        <div class="cc-inline"><span>Reuse Score</span><span>${escapeHtml(asset[3])}</span></div>
        <a class="cc-link" href="${escapeHtml(asset[4])}" target="_blank" rel="noreferrer">GitHub Link</a>
      </article>
    `,
    )
    .join("");
}

function generateRisks(requirement) {
  const text = requirement.toLowerCase();
  const risks = [];

  if (!text.includes("auth") && !text.includes("authentication")) {
    risks.push("Missing Authentication");
  }
  if (!text.includes("audit")) {
    risks.push("Missing Audit Logging");
  }
  if (!text.includes("scale") && !text.includes("performance")) {
    risks.push("Scalability Risks");
  }
  if (!text.includes("notification")) {
    risks.push("Notification Risks");
  }
  if (!text.includes("security") && !text.includes("encryption")) {
    risks.push("Security Risks");
  }

  return risks.length ? risks : ["No critical delivery risks detected from current requirement."];
}

function renderDeliveryRisks(requirement) {
  const risks = generateRisks(requirement);
  contentRoot.innerHTML = risks
    .map(
      (risk) => `
      <article class="cc-card">
        <h3>${escapeHtml(risk)}</h3>
        <p>Mitigation: add explicit stories and acceptance criteria for this capability before implementation.</p>
      </article>
    `,
    )
    .join("");
}

const renderers = {
  overview: renderOverview,
  projects: renderProjects,
  components: renderComponents,
  architecture: renderArchitecture,
  implementation: renderImplementation,
  experts: renderExperts,
  "code-assets": renderCodeAssets,
  "delivery-risks": renderDeliveryRisks,
};

function renderPage(pageId) {
  const metadata = menuItems.find((item) => item.id === pageId);
  if (!metadata) {
    return;
  }

  titleNode.textContent = metadata.label;
  subtitleNode.textContent = metadata.subtitle;

  const renderer = renderers[pageId];
  if (!renderer) {
    return;
  }

  const maybePromise = renderer(currentRequirement);
  if (maybePromise && typeof maybePromise.then === "function") {
    maybePromise.catch((error) => {
      contentRoot.innerHTML = `<article class="cc-card cc-empty-state"><h3>Unable to Render</h3><p>${escapeHtml(error instanceof Error ? error.message : "Failed to render page")}</p></article>`;
    });
  }
}

function setupMenu() {
  menuRoot.innerHTML = menuItems
    .map((item, index) => `<button data-page="${item.id}" class="${index === 0 ? "active" : ""}">${item.label}</button>`)
    .join("");

  menuRoot.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      menuRoot.querySelectorAll("button").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      const page = button.getAttribute("data-page");
      if (page) {
        renderPage(page);
      }
    });
  });
}

async function loadRequirement() {
  if (!isStorageSyncAvailable()) {
    console.error("Chrome storage API unavailable");
    currentRequirement = "";
    return;
  }

  try {
    const data = await chrome.storage.sync.get(["projectRequirement"]);
    currentRequirement = String(data?.projectRequirement ?? "");
  } catch (error) {
    console.error("Unable to read project requirement", error);
    currentRequirement = "";
  }
}

async function bootstrapPanel() {
  setupMenu();
  await loadRequirement();
  renderPage("projects");
}

bootstrapPanel();

if (isStorageSyncAvailable()) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(changes, "projectRequirement")) {
      return;
    }

    currentRequirement = String(changes.projectRequirement?.newValue ?? "");
    renderPage("projects");
  });
}
