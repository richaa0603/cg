import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/gitlas/Sidebar";
import { Topbar } from "./components/gitlas/Topbar";
import { AccessRequestPage } from "./pages/AccessRequestPage";
import { HomePage } from "./pages/HomePage";
import { RepositoryDetailsPage } from "./pages/RepositoryDetailsPage";
import { ReusableComponentsPage } from "./pages/ReusableComponentsPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";

type GitlasMessage = {
  type?: string;
  payload?: {
    requirement?: string;
    uploadedFileName?: string;
  };
};

function AppShell() {
  return (
    <div className="g-shell">
      <Sidebar />
      <div className="g-main">
        <Topbar />
        <main className="g-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  // The browser extension host posts a requirement into the embedded panel.
  useEffect(() => {
    const onMessage = (event: MessageEvent<GitlasMessage>) => {
      if (event.data?.type !== "GITLAS_CONTEXT") return;

      const requirement = event.data.payload?.requirement?.trim() ?? "";
      const uploadedFileName = event.data.payload?.uploadedFileName?.trim() ?? "";

      localStorage.setItem("gitlas.requirement", requirement);
      localStorage.setItem("gitlas.uploadedDocumentName", uploadedFileName);
      window.dispatchEvent(new CustomEvent("gitlas-context-updated"));

      if (requirement) {
        navigate(`/search?q=${encodeURIComponent(requirement)}`);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/repository/:repositoryId" element={<RepositoryDetailsPage />} />
        <Route path="/components" element={<ReusableComponentsPage />} />
        <Route path="/access" element={<AccessRequestPage />} />
        <Route path="/access/:repositoryId" element={<AccessRequestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
