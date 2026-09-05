/**
 * Core domain types for Gitlas — Enterprise Capability Discovery Platform.
 */

export type RepositorySource = "github" | "azure-devops" | "salesforce";

export type AccessStatus = "granted" | "request-required" | "restricted";

export interface Capability {
  id: string;
  label: string;
}

export interface CodeReference {
  path: string;
  reason?: string;
}

export interface Repository {
  id: string;
  repositoryName: string;
  source: RepositorySource;
  url: string;
  description: string;
  ownerTeam: string;
  ownerContact?: string;
  accessStatus: AccessStatus;
  technologyStack: string[];
  capabilities: string[];
  /** 0–100 semantic relevance to the active requirement. */
  matchScore: number;
  explanation: string;
  matchedFiles?: CodeReference[];
  language?: string;
  stars?: number;
  lastUpdated?: string;
}

export type ComponentCategory =
  | "Authentication"
  | "Authorization"
  | "Notifications"
  | "Data Access"
  | "Integration"
  | "Observability"
  | "Payments"
  | "File Handling";

export interface ReusableComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  /** 0–100 extraction/reuse confidence. */
  confidence: number;
  description: string;
  repositoryId: string;
  repositoryName: string;
  source: RepositorySource;
  url: string;
  language?: string;
}

export interface PlatformStat {
  label: string;
  value: string;
  hint: string;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
}

export type AsyncStatus = "idle" | "loading" | "success" | "error";
