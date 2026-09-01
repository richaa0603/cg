// import type { AIContext } from "./aiClient";

// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
// const GEMINI_ENDPOINT =
//   "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// export interface GeminiState {
//   status: "idle" | "loading" | "success" | "error" | "disabled";
//   markdown?: string;
//   error?: string;
// }

// function buildPrompt(requirement: string, ctx: AIContext): string {
//   const projectList = ctx.projects
//     .slice(0, 5)
//     .map((p, i) => `${i + 1}. ${p.repository} (${p.language}, ★${p.stars}, match ${p.score}%)`)
//     .join("\n");

//   return `You are a Senior Delivery Architect at a technology consulting firm.

// Analyze the following engineering project requirement and AI-generated context, then produce a concise executive recommendation.

// ## Requirement
// ${requirement || "No requirement provided."}

// ## Similar GitHub Projects Found
// ${projectList || "No projects found."}

// ## Recommended Reusable Components
// ${ctx.components.join(", ") || "None identified."}

// ## Recommended Architecture
// Frontend: ${ctx.architecture.frontend}
// Backend: ${ctx.architecture.backend}
// Database: ${ctx.architecture.database}
// Cloud: ${ctx.architecture.cloud}

// ## Experts Identified
// ${ctx.experts.map((e) => `${e.name} (score ${e.score})`).join(", ") || "None identified."}

// ## Delivery Risks
// ${ctx.risks.join(", ") || "None identified."}

// ---

// Respond in clean Markdown with these exact sections:

// ## 1. Project Summary
// ## 2. Recommended Development Approach
// ## 3. Recommended Architecture
// ## 4. Critical Risks
// ## 5. Suggested Delivery Strategy
// ## 6. Reusable Assets Strategy

// Be concise, precise, and engineering-focused. No marketing language.`;
// }

// export async function generateExecutiveSummary(
//   requirement: string,
//   ctx: AIContext,
// ): Promise<string> {
//   if (!GEMINI_API_KEY) {
//     throw new Error("VITE_GEMINI_API_KEY is not set. Add it to your .env file.");
//   }

//   const body = {
//     contents: [{ parts: [{ text: buildPrompt(requirement, ctx) }] }],
//     generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
//   };

//   const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`Gemini API error ${res.status}: ${text}`);
//   }

//   const data = (await res.json()) as {
//     candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
//   };

//   const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
//   if (!text) throw new Error("Gemini returned an empty response.");
//   return text;
// }

// export function isGeminiEnabled(): boolean {
//   return Boolean(GEMINI_API_KEY);
// }
