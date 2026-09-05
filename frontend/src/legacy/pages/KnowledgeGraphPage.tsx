import { useMemo } from "react";
import { motion } from "framer-motion";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

function buildNodes(requirement: string): { nodes: Node[]; edges: Edge[] } {
  const req = requirement.trim() || "Requirement Missing";
  const lower = req.toLowerCase();

  const needsAuth = lower.includes("auth") || lower.includes("role") || lower.includes("user");
  const needsReport = lower.includes("report") || lower.includes("dashboard") || lower.includes("analytics");
  const needsWorkflow = lower.includes("approval") || lower.includes("workflow") || lower.includes("process");

  const baseNodes: Node[] = [
    {
      id: "req",
      position: { x: 40, y: 180 },
      data: { label: `Requirement: ${req.slice(0, 48)}${req.length > 48 ? "..." : ""}` },
      style: { background: "#0f1a2c", color: "#e7eef9", border: "1px solid #3b4e6b", borderRadius: 10, width: 240 },
    },
    {
      id: "ui",
      position: { x: 340, y: 70 },
      data: { label: "UI Layer" },
      style: { background: "#11213a", color: "#dbeafe", border: "1px solid #3b4e6b", borderRadius: 10, width: 160 },
    },
    {
      id: "api",
      position: { x: 340, y: 180 },
      data: { label: "API Services" },
      style: { background: "#11213a", color: "#dbeafe", border: "1px solid #3b4e6b", borderRadius: 10, width: 160 },
    },
    {
      id: "data",
      position: { x: 340, y: 290 },
      data: { label: "Data Layer" },
      style: { background: "#11213a", color: "#dbeafe", border: "1px solid #3b4e6b", borderRadius: 10, width: 160 },
    },
  ];

  const addonNodes: Node[] = [];
  const addonEdges: Edge[] = [];

  if (needsAuth) {
    addonNodes.push({
      id: "auth",
      position: { x: 590, y: 70 },
      data: { label: "Auth + RBAC" },
      style: { background: "#10253b", color: "#bbf7d0", border: "1px solid #2f6a53", borderRadius: 10, width: 150 },
    });
    addonEdges.push({ id: "api-auth", source: "api", target: "auth", markerEnd: { type: MarkerType.ArrowClosed } });
  }

  if (needsReport) {
    addonNodes.push({
      id: "reporting",
      position: { x: 590, y: 180 },
      data: { label: "Reporting Engine" },
      style: { background: "#2a1e10", color: "#fde68a", border: "1px solid #6f572b", borderRadius: 10, width: 150 },
    });
    addonEdges.push({ id: "api-report", source: "api", target: "reporting", markerEnd: { type: MarkerType.ArrowClosed } });
  }

  if (needsWorkflow) {
    addonNodes.push({
      id: "workflow",
      position: { x: 590, y: 290 },
      data: { label: "Workflow Orchestrator" },
      style: { background: "#1f1939", color: "#ddd6fe", border: "1px solid #5643a9", borderRadius: 10, width: 150 },
    });
    addonEdges.push({ id: "api-workflow", source: "api", target: "workflow", markerEnd: { type: MarkerType.ArrowClosed } });
  }

  const edges: Edge[] = [
    { id: "req-ui", source: "req", target: "ui", markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "req-api", source: "req", target: "api", markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "req-data", source: "req", target: "data", markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "ui-api", source: "ui", target: "api", markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "api-data", source: "api", target: "data", markerEnd: { type: MarkerType.ArrowClosed } },
    ...addonEdges,
  ];

  return { nodes: [...baseNodes, ...addonNodes], edges };
}

export default function KnowledgeGraphPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";

  const { nodes, edges } = useMemo(() => buildNodes(requirement), [requirement]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="page-grid"
    >
      <article className="cc-card">
        <h3>Requirement Dependency Graph</h3>
        <p className="cc-card-copy">
          This graph maps your requirement to key implementation capabilities and dependency edges.
        </p>
      </article>

      <article className="cc-card graph-shell">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#24344f" gap={24} />
          <Controls />
        </ReactFlow>
      </article>
    </motion.section>
  );
}
