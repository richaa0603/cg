import type { AccessStatus, Repository, RepositorySource } from "../types/gitlas";

export interface SourceMeta {
  id: RepositorySource;
  label: string;
  short: string;
  /** Base color used to derive the badge foreground/background. */
  color: string;
}

export const SOURCE_META: Record<RepositorySource, SourceMeta> = {
  github: { id: "github", label: "GitHub", short: "GH", color: "#8b7dff" },
  "azure-devops": { id: "azure-devops", label: "Azure DevOps", short: "ADO", color: "#3b9dff" },
  salesforce: { id: "salesforce", label: "Salesforce", short: "SF", color: "#00c9c9" },
};

export const ALL_SOURCES: RepositorySource[] = ["github", "azure-devops", "salesforce"];

export function getSourceMeta(source: string): SourceMeta {
  return SOURCE_META[source as RepositorySource] ?? SOURCE_META.github;
}

export interface AccessMeta {
  label: string;
  tone: "ok" | "warn" | "danger";
}

export const ACCESS_META: Record<AccessStatus, AccessMeta> = {
  granted: { label: "Access granted", tone: "ok" },
  "request-required": { label: "Request required", tone: "warn" },
  restricted: { label: "Restricted", tone: "danger" },
};

export function getAccessMeta(status: string): AccessMeta {
  return ACCESS_META[status as AccessStatus] ?? ACCESS_META["request-required"];
}

/**
 * Platform-aware deep link. Each source hosts repositories under a different
 * URL shape, so a stored absolute `url` always wins and the per-source
 * fallback only kicks in when the backend omitted it.
 */
export function resolveRepositoryUrl(repo: Pick<Repository, "repositoryName" | "source" | "url">): string {
  const url = repo.url?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }

  const name = encodeURIComponent(repo.repositoryName.trim());
  switch (repo.source) {
    case "azure-devops":
      return `https://dev.azure.com/contoso/_git/${name}`;
    case "salesforce":
      return `https://contoso.my.salesforce.com/lightning/n/${name}`;
    case "github":
    default:
      return `https://github.com/${repo.repositoryName.trim()}`;
  }
}

export function openRepository(repo: Pick<Repository, "repositoryName" | "source" | "url">): void {
  window.open(resolveRepositoryUrl(repo), "_blank", "noopener,noreferrer");
}
