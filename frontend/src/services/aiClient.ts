/**
 * AI client abstraction layer.
 * VITE_AI_MODE=local → TypeScript domain logic + static JSON artifacts in /public/ai/
 * VITE_AI_MODE=api   → POST calls to VITE_AI_API_BASE backend
 */

const AI_MODE = (import.meta.env.VITE_AI_MODE as "local" | "api") ?? "local";
const API_BASE = (import.meta.env.VITE_AI_API_BASE as string) ?? "/api";
const AI_DATA_PATH = "/ai";

// ─── Exported types ────────────────────────────────────────────────────────

export interface SimilarProject {
  repository: string;
  score: number;
  language: string;
  stars: number;
  url?: string;
}

export interface Architecture {
  frontend: string;
  backend: string;
  database: string;
  cloud: string;
}

export interface Expert {
  name: string;
  score: number;
}

export interface AIContext {
  projects: SimilarProject[];
  components: string[];
  architecture: Architecture;
  experts: Expert[];
  risks: string[];
}

// ─── Domain logic — mirrors Python modules (no server needed in local mode) ─

const DOMAIN_STACKS: Record<string, Architecture> = {
  attendance:  { frontend: "React", backend: ".NET",        database: "PostgreSQL", cloud: "Azure" },
  insurance:   { frontend: "React", backend: ".NET",        database: "PostgreSQL", cloud: "Azure" },
  claims:      { frontend: "React", backend: ".NET",        database: "PostgreSQL", cloud: "Azure" },
  payroll:     { frontend: "React", backend: ".NET",        database: "PostgreSQL", cloud: "Azure" },
  hr:          { frontend: "React", backend: ".NET",        database: "PostgreSQL", cloud: "Azure" },
  consulting:  { frontend: "React", backend: ".NET",        database: "PostgreSQL", cloud: "Azure" },
  project:     { frontend: "React", backend: "Spring Boot", database: "PostgreSQL", cloud: "AWS" },
  banking:     { frontend: "Angular", backend: ".NET",      database: "SQL Server", cloud: "Azure" },
  "real-time": { frontend: "React", backend: "Node.js",     database: "Redis",      cloud: "AWS" },
  ml:          { frontend: "React", backend: "FastAPI",     database: "PostgreSQL", cloud: "AWS" },
};

const DOMAIN_COMPONENTS: Record<string, string[]> = {
  attendance: ["Authentication", "RBAC", "Attendance Service", "Notification Service", "Audit Logging", "Reporting Engine", "Scheduler"],
  insurance:  ["Authentication", "RBAC", "Workflow Engine", "Audit Logging", "File Storage", "Notification Service", "Reporting Engine"],
  claims:     ["Authentication", "RBAC", "Workflow Engine", "Audit Logging", "File Storage", "Notification Service", "Reporting Engine"],
  payroll:    ["Authentication", "RBAC", "Scheduler", "Reporting Engine", "Audit Logging", "Notification Service"],
  hr:         ["Authentication", "RBAC", "Attendance Service", "User Management", "Reporting Engine", "Notification Service", "Audit Logging"],
  consulting: ["Authentication", "RBAC", "Reporting Engine", "Workflow Engine", "Notification Service", "User Management"],
  project:    ["Authentication", "RBAC", "Workflow Engine", "Reporting Engine", "Notification Service", "Scheduler", "File Storage"],
  management: ["Authentication", "RBAC", "User Management", "Reporting Engine", "Workflow Engine", "Audit Logging"],
};

const DOMAIN_RISKS: Record<string, string[]> = {
  attendance: ["Missing RBAC", "Missing Audit Logging", "No Notification Strategy", "No Retry / Scheduler Strategy"],
  insurance:  ["Missing RBAC", "Missing Audit Logging", "No Workflow / Approval Strategy", "No File Storage Strategy"],
  claims:     ["Missing RBAC", "No Workflow / Approval Strategy", "Missing Audit Logging", "No Notification Strategy"],
  payroll:    ["Missing RBAC", "Missing Audit Logging", "No Retry / Scheduler Strategy", "Missing Reporting Layer"],
  hr:         ["Missing RBAC", "Missing Audit Logging", "No Notification Strategy", "Missing Reporting Layer"],
  project:    ["Missing RBAC", "No Workflow / Approval Strategy", "No Notification Strategy", "No File Storage Strategy"],
  consulting: ["Missing RBAC", "Missing Audit Logging", "Missing Reporting Layer", "No API Gateway / Rate Limiting"],
};

const KEYWORD_RISKS: Array<[string, string]> = [
  ["real-time",  "No WebSocket / Real-Time Strategy"],
  ["legacy",     "Legacy System Integration Risk"],
  ["compliance", "Missing Compliance Controls"],
  ["pii",        "PII Data Governance Not Defined"],
  ["payment",    "Payment Security (PCI-DSS) Not Addressed"],
  ["mobile",     "Mobile API Contract Not Defined"],
];

const FALLBACK_ARCH: Architecture = { frontend: "React", backend: ".NET", database: "PostgreSQL", cloud: "Azure" };
const FALLBACK_RISKS = ["No Retry / Scheduler Strategy", "No API Gateway / Rate Limiting", "Missing Error Handling Strategy"];

// ─── Local mode implementations ───────────────────────────────────────────

async function tryFetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function keywordScore(text: string, requirement: string): number {
  const terms = requirement.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
  const hay = text.toLowerCase();
  const hits = terms.filter((t) => hay.includes(t)).length;
  return terms.length > 0 ? Math.round((hits / terms.length) * 100) : 50;
}

async function localSimilarProjects(requirement: string): Promise<SimilarProject[]> {
  type MetaRecord = { repository?: string; name?: string; language: string; stars: number; url?: string; html_url?: string };
  const meta = await tryFetchJSON<MetaRecord[]>(`${AI_DATA_PATH}/repository_metadata.json`);

  if (meta && meta.length > 0) {
    return meta
      .map((r) => ({
        repository: r.repository ?? r.name ?? "",
        score: keywordScore((r.repository ?? r.name ?? "") + " " + r.language, requirement),
        language: r.language,
        stars: r.stars,
        url: r.url ?? r.html_url ?? "",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  // Fallback: live GitHub search
  const query = requirement.split(/\s+/).filter((t) => t.length > 3).slice(0, 4).join(" ");
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { items: Array<{ full_name: string; language: string | null; stargazers_count: number; html_url: string; description: string | null }> };
  return data.items.map((item) => ({
    repository: item.full_name,
    score: keywordScore(item.full_name + " " + (item.description ?? ""), requirement),
    language: item.language ?? "Unknown",
    stars: item.stargazers_count,
    url: item.html_url,
  }));
}

function localComponents(requirement: string): string[] {
  const req = requirement.toLowerCase();
  const result: string[] = [];

  for (const [domain, comps] of Object.entries(DOMAIN_COMPONENTS)) {
    if (req.includes(domain)) {
      for (const c of comps) if (!result.includes(c)) result.push(c);
      break;
    }
  }

  if (!result.includes("Authentication")) result.unshift("Authentication");
  return result.slice(0, 10);
}

function localArchitecture(requirement: string): Architecture {
  const req = requirement.toLowerCase();
  for (const [domain, stack] of Object.entries(DOMAIN_STACKS)) {
    if (req.includes(domain)) return stack;
  }
  return { ...FALLBACK_ARCH };
}

async function localExperts(_requirement: string): Promise<Expert[]> {
  type ExpertRecord = { name: string; score: number; login?: string };
  const data = await tryFetchJSON<{ experts: ExpertRecord[] }>(`${AI_DATA_PATH}/experts.json`);
  if (data?.experts?.length) {
    return data.experts.slice(0, 10).map((e) => ({ name: e.name, score: e.score }));
  }
  // Graceful empty — experts.json requires --build step with GitHub token
  return [];
}

function localRisks(requirement: string): string[] {
  const req = requirement.toLowerCase();
  const risks: string[] = [];

  for (const [domain, dr] of Object.entries(DOMAIN_RISKS)) {
    if (req.includes(domain)) {
      for (const r of dr) if (!risks.includes(r)) risks.push(r);
      break;
    }
  }

  for (const [kw, risk] of KEYWORD_RISKS) {
    if (req.includes(kw) && !risks.includes(risk)) risks.push(risk);
  }

  for (const fb of FALLBACK_RISKS) {
    if (risks.length >= 3) break;
    if (!risks.includes(fb)) risks.push(fb);
  }

  return risks;
}

// ─── API mode ─────────────────────────────────────────────────────────────

async function apiCall<T>(endpoint: string, requirement: string): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });
  if (!res.ok) throw new Error(`API error ${res.status} from ${endpoint}`);
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getSimilarProjects(requirement: string): Promise<SimilarProject[]> {
  if (AI_MODE === "api") return apiCall<SimilarProject[]>("copilot/search", requirement);
  return localSimilarProjects(requirement);
}

export async function getReusableComponents(requirement: string): Promise<string[]> {
  if (AI_MODE === "api") return apiCall<string[]>("copilot/components", requirement);
  return localComponents(requirement);
}

export async function getArchitecture(requirement: string): Promise<Architecture> {
  if (AI_MODE === "api") return apiCall<Architecture>("copilot/architecture", requirement);
  return localArchitecture(requirement);
}

export async function getExperts(requirement: string): Promise<Expert[]> {
  if (AI_MODE === "api") return apiCall<Expert[]>("copilot/experts", requirement);
  return localExperts(requirement);
}

export async function getRisks(requirement: string): Promise<string[]> {
  if (AI_MODE === "api") return apiCall<string[]>("copilot/risks", requirement);
  return localRisks(requirement);
}

export async function getAllAIContext(requirement: string): Promise<AIContext> {
  // In API mode use the single aggregator endpoint for efficiency
  if (AI_MODE === "api") {
    return apiCall<AIContext>("copilot/full-analysis", requirement);
  }
  const [projects, components, architecture, experts, risks] = await Promise.all([
    getSimilarProjects(requirement),
    getReusableComponents(requirement),
    getArchitecture(requirement),
    getExperts(requirement),
    getRisks(requirement),
  ]);
  return { projects, components, architecture, experts, risks };
}
