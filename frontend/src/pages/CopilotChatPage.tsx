import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function buildAssistantReply(input: string, requirement: string): string {
  const text = input.toLowerCase();

  if (text.includes("architecture")) {
    return "Recommended architecture: Web UI -> API service -> domain modules -> relational database, with optional event queue for asynchronous approvals and notifications.";
  }

  if (text.includes("component") || text.includes("module")) {
    return "High-reuse components: Auth/RBAC, Employee Profile Module, Attendance Tracker, Reporting Dashboard, Notification Center, and Workflow Orchestrator.";
  }

  if (text.includes("risk") || text.includes("blocker")) {
    return "Top delivery risks: unclear role matrix, integration scope creep, and report performance. Mitigate via contract tests, phased rollout, and performance budgets.";
  }

  if (text.includes("timeline") || text.includes("plan")) {
    return "Suggested plan: Week 1 discovery + domain model, Week 2-3 core APIs, Week 4 UI workflows, Week 5 reporting and stabilization, Week 6 hardening and go-live prep.";
  }

  return `I can help break this down against your requirement: ${requirement || "No requirement captured yet"}. Ask for architecture, components, risks, or timeline.`;
}

const starterMessages: ChatMessage[] = [
  {
    id: "a1",
    role: "assistant",
    text: "Consultant Copilot is ready. Ask for architecture, reusable components, implementation plan, or risk mitigation.",
  },
];

export default function CopilotChatPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [input, setInput] = useState("");

  const hint = useMemo(() => {
    if (!requirement.trim()) {
      return "No requirement captured yet. Use popup Analyze to seed better recommendations.";
    }
    return `Context loaded from requirement: ${requirement.slice(0, 120)}${requirement.length > 120 ? "..." : ""}`;
  }, [requirement]);

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const assistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: buildAssistantReply(trimmed, requirement),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="page-grid"
    >
      <article className="cc-card">
        <h3>Copilot Context</h3>
        <p className="cc-card-copy">{hint}</p>
      </article>

      <article className="cc-card chat-shell">
        <div className="chat-log">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "assistant" ? "chat-bubble assistant" : "chat-bubble user"}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about architecture, components, risks, or timeline"
          />
          <button type="button" onClick={onSend}>
            Send
          </button>
        </div>
      </article>
    </motion.section>
  );
}
