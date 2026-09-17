import type { PlatformStat, Repository, ReusableComponent, RepositorySource } from "../types/gitlas";
import repositoryCatalog from "./repositories.json";

export const EXAMPLE_REQUIREMENTS: string[] = [
  "Employee leave management with approval workflow and email notifications",
  "Customer onboarding portal with KYC document upload and verification",
  "Internal API gateway with JWT authentication and role-based access control",
  "Real-time order tracking dashboard with WebSocket updates",
  "Invoice generation and payment reconciliation service",
];

export const PLATFORM_STATS: PlatformStat[] = [
  { label: "Repositories indexed", value: "4,218", hint: "Across 3 connected platforms" },
  { label: "Reusable components", value: "12,690", hint: "Auto-extracted and scored" },
  { label: "Owner teams mapped", value: "184", hint: "With access routing" },
  { label: "Avg. discovery time", value: "38s", hint: "Down from 3 days" },
];

interface RepositoryCatalogEntry {
  id: number;
  name: string;
  platform: string;
  score: number;
  isAccessible: boolean;
  accessLevel: string;
  url: string;
  requestAccessEmail?: string;
  keywords?: string[];
  matchingComponents?: string[];
  description?: string;
  whyThisMatches?: string;
  matchedFile?: string;
}

function toSource(platform: string): RepositorySource {
  const value = platform.toLowerCase();
  if (value.includes("azure")) return "azure-devops";
  if (value.includes("salesforce")) return "salesforce";
  return "github";
}

function toRepository(entry: RepositoryCatalogEntry): Repository {
  return {
    id: String(entry.id),
    repositoryName: entry.name,
    source: toSource(entry.platform),
    url: entry.url,
    description: entry.description ?? "",
    ownerTeam: entry.accessLevel,
    ownerContact: entry.requestAccessEmail,
    accessStatus: entry.accessLevel.toLowerCase() === "available" ? "granted" : "restricted",
    technologyStack: entry.keywords ?? [],
    capabilities: entry.matchingComponents ?? [],
    matchScore: entry.score,
    explanation: entry.whyThisMatches ?? "",
    matchedFiles: entry.matchedFile ? [{ path: entry.matchedFile }] : [],
  };
}

export const MOCK_REPOSITORIES: Repository[] = (repositoryCatalog as RepositoryCatalogEntry[]).map(toRepository);

export const MOCK_COMPONENTS: ReusableComponent[] = [
  {
    id: "cmp-jwt",
    name: "JwtService.cs",
    category: "Authentication",
    confidence: 95,
    description:
      "Issues, validates and refreshes signed JWTs with configurable lifetime, audience and key rotation. Zero repository-specific coupling.",
    repositoryId: "repo-identity",
    repositoryName: "contoso/identity-gateway",
    source: "github",
    url: "https://github.com/contoso/identity-gateway/blob/main/src/Auth/JwtService.cs",
    language: "C#",
  },
  {
    id: "cmp-rbac",
    name: "PolicyAuthorizationHandler.cs",
    category: "Authorization",
    confidence: 91,
    description:
      "Claim and role based authorization handler supporting hierarchical roles, resource ownership checks and policy composition.",
    repositoryId: "repo-identity",
    repositoryName: "contoso/identity-gateway",
    source: "github",
    url: "https://github.com/contoso/identity-gateway/blob/main/src/Auth/PolicyAuthorizationHandler.cs",
    language: "C#",
  },
  {
    id: "cmp-notify",
    name: "NotificationDispatcher.cs",
    category: "Notifications",
    confidence: 89,
    description:
      "Channel-agnostic dispatcher that fans a single notification out to email, Teams and push with per-channel retry and dead-lettering.",
    repositoryId: "repo-hr-leave",
    repositoryName: "contoso/hr-leave-service",
    source: "github",
    url: "https://github.com/contoso/hr-leave-service/blob/main/src/Notifications/NotificationDispatcher.cs",
    language: "C#",
  },
  {
    id: "cmp-template",
    name: "TemplateRenderer.ts",
    category: "Notifications",
    confidence: 84,
    description:
      "Handlebars-based template renderer with locale resolution, partial inheritance and strict placeholder validation.",
    repositoryId: "repo-notify",
    repositoryName: "contoso-enterprise/notification-hub",
    source: "azure-devops",
    url: "https://dev.azure.com/contoso-enterprise/_git/notification-hub?path=/src/templates/TemplateRenderer.ts",
    language: "TypeScript",
  },
  {
    id: "cmp-statemachine",
    name: "StateMachineDefinition.java",
    category: "Integration",
    confidence: 82,
    description:
      "Declarative workflow state machine with guards, parallel branches and compensating transitions. Drives all enterprise approval flows.",
    repositoryId: "repo-workflow-engine",
    repositoryName: "contoso-enterprise/workflow-engine",
    source: "azure-devops",
    url: "https://dev.azure.com/contoso-enterprise/_git/workflow-engine?path=/core/src/main/java/StateMachineDefinition.java",
    language: "Java",
  },
  {
    id: "cmp-audit",
    name: "AuditEventWriter.cs",
    category: "Observability",
    confidence: 78,
    description:
      "Append-only audit writer producing tamper-evident hash-chained events with pluggable sinks for blob storage and SIEM.",
    repositoryId: "repo-audit",
    repositoryName: "contoso/audit-trail-lib",
    source: "github",
    url: "https://github.com/contoso/audit-trail-lib/blob/main/src/AuditEventWriter.cs",
    language: "C#",
  },
  {
    id: "cmp-upload",
    name: "SecureUploadHandler.py",
    category: "File Handling",
    confidence: 74,
    description:
      "Streaming multipart upload handler with MIME sniffing, size limits, virus scanning hand-off and signed retrieval URLs.",
    repositoryId: "repo-docs",
    repositoryName: "contoso-enterprise/document-vault",
    source: "azure-devops",
    url: "https://dev.azure.com/contoso-enterprise/_git/document-vault?path=/app/uploads/secure_upload_handler.py",
    language: "Python",
  },
  {
    id: "cmp-repo",
    name: "GenericRepository.cs",
    category: "Data Access",
    confidence: 71,
    description:
      "EF Core generic repository with specification pattern, soft-delete filtering and unit-of-work transaction scope.",
    repositoryId: "repo-hr-leave",
    repositoryName: "contoso/hr-leave-service",
    source: "github",
    url: "https://github.com/contoso/hr-leave-service/blob/main/src/Data/GenericRepository.cs",
    language: "C#",
  },
  {
    id: "cmp-approval-inbox",
    name: "ApprovalInbox.tsx",
    category: "Integration",
    confidence: 68,
    description:
      "Accessible approval inbox component with bulk actions, optimistic updates and status timeline. Design-system compliant.",
    repositoryId: "repo-portal-ui",
    repositoryName: "contoso/employee-portal-ui",
    source: "github",
    url: "https://github.com/contoso/employee-portal-ui/blob/main/src/features/approvals/ApprovalInbox.tsx",
    language: "TypeScript",
  },
  {
    id: "cmp-sf-approval",
    name: "LeaveApprovalFlow",
    category: "Authorization",
    confidence: 64,
    description:
      "Salesforce Flow implementing a two-stage manager/HR approval with recall, delegation and Chatter notifications.",
    repositoryId: "repo-sf-hr",
    repositoryName: "Contoso_HR_ServiceCloud",
    source: "salesforce",
    url: "https://contoso.my.salesforce.com/lightning/setup/Flows/home",
    language: "Flow",
  },
];
