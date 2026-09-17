import { X } from "lucide-react";
import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Sidebar } from "./components/gitlas/Sidebar";
import { Topbar } from "./components/gitlas/Topbar";
import { AccessRequestPage } from "./pages/AccessRequestPage";
import { HomePage } from "./pages/HomePage";
import { RepositoryDetailsPage } from "./pages/RepositoryDetailsPage";
import { ReusableComponentsPage } from "./pages/ReusableComponentsPage";

type GitlasMessage = {
  type?: string;
  payload?: {
    requirement?: string;
    uploadedFileName?: string;
  };
};

function AppShell() {
  const location = useLocation();
  const isPanel = new URLSearchParams(location.search).get("panel") === "1";

  return (
    <div className={`g-shell${isPanel ? " g-shell--panel" : ""}`}>
      {!isPanel && <Sidebar />}
      <div className="g-main">
        {isPanel ? (
          <header className="g-plugin-bar">
            <strong>Gitlas</strong>
            <span>Discover Before You Build</span>
            <button
              type="button"
              className="g-btn g-btn--ghost g-btn--sm"
              aria-label="Close Gitlas panel"
              onClick={() => window.parent.postMessage({ type: "GITLAS_CLOSE_PANEL" }, "*")}
            >
              <X size={16} />
            </button>
          </header>
        ) : (
          <Topbar />
        )}
        <main className="g-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  // The browser extension host posts a requirement into the embedded panel.
  useEffect(() => {
    const onMessage = (event: MessageEvent<GitlasMessage>) => {
      if (event.data?.type !== "GITLAS_CONTEXT") return;

      const requirement = event.data.payload?.requirement?.trim() ?? "";
      const uploadedFileName = event.data.payload?.uploadedFileName?.trim() ?? "";

      localStorage.setItem("gitlas.requirement", requirement);
      localStorage.setItem("gitlas.uploadedDocumentName", uploadedFileName);
      if (requirement) {
        window.dispatchEvent(new CustomEvent("gitlas-context-updated", { detail: { requirement } }));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/search" element={<Navigate to="/" replace />} />
        <Route path="/repository/:repositoryId" element={<RepositoryDetailsPage />} />
        <Route path="/components" element={<ReusableComponentsPage />} />
        <Route path="/access" element={<AccessRequestPage />} />
        <Route path="/access/:repositoryId" element={<AccessRequestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
