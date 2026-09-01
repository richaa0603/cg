import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.tsx";
import Sidebar from "./components/Sidebar.tsx";
//import OverviewPage from "./pages/OverviewPage.tsx";
//import ProjectsPage from "./pages/ProjectsPage.tsx";
//import ComponentsPage from "./pages/ComponentsPage.tsx";
//import ArchitecturePage from "./pages/ArchitecturePage.tsx";
//import ImplementationPlanPage from "./pages/ImplementationPlanPage.tsx";
//import CodeAssetsPage from "./pages/CodeAssetsPage.tsx";
//import DeliveryRisksPage from "./pages/DeliveryRisksPage.tsx";
//import KnowledgeGraphPage from "./pages/KnowledgeGraphPage.tsx";
//import CopilotChatPage from "./pages/CopilotChatPage.tsx";
//import ExecutiveSummaryPage from "./pages/ExecutiveSummaryPage.tsx";

type CopilotMessage = {
  type?: string;
  payload?: {
    requirement?: string;
    uploadedFileName?: string;
  };
};

function ShellLayout() {
  return (
    <div className="panel-app-shell">
      <Sidebar />
      <section className="panel-main">
        <Navbar />
        <div className="panel-content">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

function App() {
  useEffect(() => {
    const onMessage = (event: MessageEvent<CopilotMessage>) => {
      if (event.data?.type !== "CC_CONTEXT") {
        return;
      }

      const requirement = event.data.payload?.requirement?.trim() ?? "";
      const uploadedFileName = event.data.payload?.uploadedFileName?.trim() ?? "";

      localStorage.setItem("projectRequirement", requirement);
      localStorage.setItem("uploadedDocumentName", uploadedFileName);
      window.dispatchEvent(new CustomEvent("cc-context-updated"));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/executive" replace />} />
      <Route element={<ShellLayout />}>
        {/* <Route path="/executive" element={<ExecutiveSummaryPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/implementation-plan" element={<ImplementationPlanPage />} />
        <Route path="/code-assets" element={<CodeAssetsPage />} />
        <Route path="/delivery-risks" element={<DeliveryRisksPage />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="/copilot-chat" element={<CopilotChatPage />} /> */}
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export default App;
