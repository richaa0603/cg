import { MOCK_COMPONENTS, MOCK_REPOSITORIES } from "../data/mockData";
import type { Repository, ReusableComponent, RepositorySource } from "../types/gitlas";

const API_BASE = (import.meta.env.VITE_AI_API_BASE as string | undefined) ?? "http://localhost:8000";
const SEARCH_API_URL =
  (import.meta.env.VITE_SEARCH_API_URL as string | undefined) ?? `${API_BASE.replace(/\/$/, "")}/search`;
const ACCESS_REQUEST_API_URL = import.meta.env.VITE_ACCESS_REQUEST_API_URL as string | undefined;

/** Backends may emit a variety of spellings for the same platform. */
function normaliseSource(raw: unknown): RepositorySource {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("azure") || value.includes("ado") || value.includes("devops")) return "azure-devops";
  if (value.includes("salesforce") || value === "sfdc" || value === "sf") return "salesforce";
  return "github";
}

function clampScore(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  // Accept either 0–1 similarity or 0–100 percentages.
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function normaliseRepository(raw: Record<string, unknown>, index: number): Repository {
  const repositoryName = String(raw.repositoryName ?? raw.repository ?? raw.name ?? `repository-${index + 1}`);
  const source = normaliseSource(raw.source);
  const matchedFiles = Array.isArray(raw.matchedFiles)
    ? (raw.matchedFiles as unknown[]).map((f) =>
        typeof f === "string" ? { path: f } : { path: String((f as { path?: string })?.path ?? "") },
      )
    : [];

  return {
    id: String(raw.id ?? `${source}:${repositoryName}`),
    repositoryName,
    source,
    url: String(raw.url ?? ""),
    description: String(raw.description ?? ""),
    ownerTeam: String(raw.ownerTeam ?? raw.owner ?? "Unassigned"),
    ownerContact: raw.ownerContact ? String(raw.ownerContact) : undefined,
    accessStatus:
      raw.accessStatus === "granted" || raw.accessStatus === "restricted"
        ? raw.accessStatus
        : "request-required",
    technologyStack: Array.isArray(raw.technologyStack) ? (raw.technologyStack as string[]) : [],
    capabilities: Array.isArray(raw.capabilities)
      ? (raw.capabilities as string[])
      : Array.isArray(raw.matchedCapabilities)
        ? (raw.matchedCapabilities as string[])
        : [],
    matchScore: clampScore(raw.matchScore ?? raw.score),
    explanation: String(raw.explanation ?? ""),
    matchedFiles: matchedFiles.filter((f) => f.path),
    language: raw.language ? String(raw.language) : undefined,
    stars: Number.isFinite(Number(raw.stars)) ? Number(raw.stars) : undefined,
    lastUpdated: raw.lastUpdated ? String(raw.lastUpdated) : undefined,
  };
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "using", "your",
  "our", "a", "an", "of", "to", "in", "on", "by", "is", "are", "be", "need",
  "needs", "want", "system", "solution", "app", "application", "build",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Deterministic keyword scorer used when the search backend is unavailable. */
function scoreMockRepositories(query: string): Repository[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return [...MOCK_REPOSITORIES].sort((a, b) => b.matchScore - a.matchScore);
  }

  return MOCK_REPOSITORIES.map((repo) => {
    const haystack = [
      repo.repositoryName,
      repo.description,
      repo.ownerTeam,
      ...repo.capabilities,
      ...repo.technologyStack,
    ]
      .join(" ")
      .toLowerCase();

    const hits = tokens.filter((t) => haystack.includes(t)).length;
    const coverage = hits / tokens.length;
    // Blend the curated baseline score with query coverage so ordering stays
    // sensible for both broad and highly specific requirements.
    const blended = Math.round(repo.matchScore * 0.45 + coverage * 100 * 0.55);
    return { ...repo, matchScore: Math.max(12, Math.min(99, blended)) };
  })
    .filter((repo) => repo.matchScore >= 25)
    .sort((a, b) => b.matchScore - a.matchScore);
}

function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort);
  });
}

export interface SearchOptions {
  sources?: RepositorySource[];
  signal?: AbortSignal;
}

export async function searchRepositories(query: string, options: SearchOptions = {}): Promise<Repository[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const startTime = Date.now();
  const MIN_RESPONSE_TIME_MS = 800;

  let results: Repository[];
  try {
    const res = await fetch(SEARCH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed, requirement: trimmed }),
      signal: options.signal,
    });
    if (!res.ok) throw new Error(`Search API error ${res.status}`);

    const data = (await res.json()) as
      | Record<string, unknown>[]
      | { results?: Record<string, unknown>[]; projects?: Record<string, unknown>[] };
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.projects)
          ? data.projects
          : [];
    results = list.map(normaliseRepository);
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    // Demo resilience: never leave the UI empty because the index is offline.
    results = scoreMockRepositories(trimmed);
  }

  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME_MS) {
    await delayWithSignal(MIN_RESPONSE_TIME_MS - elapsed, options.signal);
  }

  if (options.sources && options.sources.length > 0) {
    const allowed = new Set(options.sources);
    results = results.filter((r) => allowed.has(r.source));
  }
  return results;
}

export async function getRepositoryById(id: string, signal?: AbortSignal): Promise<Repository | null> {
  const decoded = decodeURIComponent(id);
  const match =
    MOCK_REPOSITORIES.find((r) => r.id === decoded) ??
    MOCK_REPOSITORIES.find((r) => r.repositoryName === decoded) ??
    null;
  await delayWithSignal(250, signal);
  return match;
}

export async function getReusableComponents(query = "", options: { signal?: AbortSignal } = {}): Promise<ReusableComponent[]> {
  const startTime = Date.now();
  const MIN_DELAY_MS = 500;
  const tokens = tokenize(query);
  let list: ReusableComponent[];
  if (tokens.length === 0) {
    list = [...MOCK_COMPONENTS].sort((a, b) => b.confidence - a.confidence);
  } else {
    list = MOCK_COMPONENTS.map((c) => {
      const haystack = `${c.name} ${c.category} ${c.description} ${c.repositoryName}`.toLowerCase();
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      return { component: c, hits };
    })
      .sort((a, b) => b.hits - a.hits || b.component.confidence - a.component.confidence)
      .map((x) => x.component);
  }

  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_DELAY_MS) {
    await delayWithSignal(MIN_DELAY_MS - elapsed, options.signal);
  }
  return list;
}

export async function getComponentsForRepository(repositoryId: string): Promise<ReusableComponent[]> {
  return MOCK_COMPONENTS.filter((c) => c.repositoryId === repositoryId);
}

export interface AccessRequestPayload {
  repositoryId: string;
  repositoryName: string;
  ownerTeam: string;
  justification: string;
}

export async function submitAccessRequest(payload: AccessRequestPayload): Promise<{ ticketId: string }> {
  if (ACCESS_REQUEST_API_URL) {
    const response = await fetch(ACCESS_REQUEST_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Access request API error ${response.status}`);

    const data = (await response.json()) as { ticketId?: string; id?: string };
    const ticketId = data.ticketId ?? data.id;
    if (!ticketId) throw new Error("Access request API did not return a ticket ID");
    return { ticketId };
  }

  await new Promise((resolve) => setTimeout(resolve, 900));
  const suffix = Math.floor(1000 + Math.random() * 9000);
  void payload;
  return { ticketId: `GTLS-${suffix}` };
}
