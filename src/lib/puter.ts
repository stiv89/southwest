import { PUTER_SCRIPT_URL } from "./constants";
import { loadDeskPreferences } from "./desk-preferences";

export function getPuterModel(): string {
  return loadDeskPreferences().puterModel;
}
import type { AgentResult } from "../types/contracts";

export interface AgentNarrative {
  summary: string;
  recommendedNextStep: string;
  model: string;
}

interface PuterAuth {
  isSignedIn?: () => boolean | Promise<boolean>;
  signIn?: () => Promise<unknown>;
}

interface PuterClient {
  auth?: PuterAuth;
  ai?: {
    chat?: (
      prompt: string | Array<{ role: string; content: string }>,
      options?: { model?: string; temperature?: number; normalize?: boolean },
    ) => Promise<unknown>;
  };
}

declare global {
  interface Window {
    puter?: PuterClient;
  }
}

const UNSAFE_NARRATIVE = /safe to divert|cleared to divert|authorized to divert|capacity is sufficient/i;

function puterClient(): PuterClient | undefined {
  if (typeof window === "undefined") return undefined;
  return window.puter;
}

export function loadPuter(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Puter.js runs in the browser."));
  }
  if (puterClient()?.ai?.chat) return Promise.resolve();
  if (!document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`)) {
    const script = document.createElement("script");
    script.src = PUTER_SCRIPT_URL;
    script.async = true;
    document.head.appendChild(script);
  }
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (puterClient()?.ai?.chat) {
        window.clearInterval(timer);
        resolve();
      } else if (Date.now() - started > 15000) {
        window.clearInterval(timer);
        reject(new Error("Puter.js did not load. Check the network and refresh."));
      }
    }, 50);
  });
}

export async function ensurePuterSession(): Promise<void> {
  await loadPuter();
  const auth = puterClient()?.auth;
  if (!auth?.isSignedIn) return;
  const signedIn = auth.isSignedIn();
  const ready = typeof signedIn === "boolean" ? signedIn : await signedIn;
  if (ready) return;
  if (!auth.signIn) throw new Error("Puter.js has no sign-in method.");
  await auth.signIn();
}

function textFrom(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const message = record.message;
  if (message && typeof message === "object") {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return String((part as { text: unknown }).text);
          }
          return "";
        })
        .join("")
        .trim();
    }
  }
  if (typeof record.text === "string") return record.text.trim();
  return "";
}

export function parseNarrative(text: string): Pick<AgentNarrative, "summary" | "recommendedNextStep"> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const recommendedNextStep =
      typeof parsed.recommendedNextStep === "string" ? parsed.recommendedNextStep.trim() : "";
    if (!summary || !recommendedNextStep) return null;
    if (summary.length > 1600 || recommendedNextStep.length > 500) return null;
    if (UNSAFE_NARRATIVE.test(summary) || UNSAFE_NARRATIVE.test(recommendedNextStep)) return null;
    return { summary, recommendedNextStep };
  } catch {
    return null;
  }
}

export async function intakeProblemWithPuter(
  message: string,
  context: { phase: string; scenarioSelected: boolean },
): Promise<string> {
  await loadPuter();
  const chat = puterClient()?.ai?.chat;
  if (!chat) throw new Error("Puter.js chat is unavailable.");
  const response = await chat(
    [
      {
        role: "system",
        content:
          "You are Ops Intelligence for a Southwest classroom dispatch simulation (not real operations). Reply in plain text only — no JSON. Use at most 3 short sentences. If they ask how the demo, approval flow, or roles work, answer at a high level for class discussion only (no live policy). If the issue matches MCI, a ground stop, or flight A31 from DEN, say the Ground Stop demo is loading and agents are starting automatically. Otherwise acknowledge and ask one clarifying question or suggest MCI / A31 to run the scenario. Never claim authority to divert, dispatch, message passengers, or declare safety. Say when facts are missing.",
      },
      {
        role: "user",
        content: JSON.stringify({
          userProblem: message,
          demoPhase: context.phase,
          scenarioAlreadySelected: context.scenarioSelected,
          availableDemo: "MCI Ground Stop 12:20 PM — Flight A31 DEN→MCI",
        }),
      },
    ],
    { model: getPuterModel(), temperature: 0.35, normalize: true },
  );
  const text = textFrom(response);
  if (!text) throw new Error("Puter.js returned an empty intake response.");
  if (UNSAFE_NARRATIVE.test(text)) {
    throw new Error("Puter.js returned phrasing that is not allowed in this classroom demo.");
  }
  return text;
}

export async function narrateWithPuter(result: AgentResult): Promise<AgentNarrative | null> {
  await loadPuter();
  const chat = puterClient()?.ai?.chat;
  if (!chat) throw new Error("Puter.js chat is unavailable.");
  const response = await chat(
    [
      {
        role: "system",
        content:
          "You write a classroom airline-operations note. Use only the JSON facts supplied by tools. Never say a diversion, hold, or dispatch action is safe, feasible, or authorized. Never invent airport capacity, runway suitability, fuel, flight time, hotels, passenger names, or bookings. State that a human must approve any next step. Reply with JSON only, no markdown: {\"summary\":\"2 to 4 sentences\",\"recommendedNextStep\":\"one sentence\"}.",
      },
      {
        role: "user",
        content: JSON.stringify({
          agent: result.agent,
          flight: result.subjectId,
          situation: result.situation,
          knownFacts: result.knownFacts,
          unknowns: result.unknowns,
          options: result.options.map((option) => ({
            id: option.id,
            label: option.label,
            risks: option.risks,
          })),
          toolResults: result.toolCalls
            .filter((call) => call.ok)
            .map((call) => ({ name: call.name, summary: call.summary })),
        }),
      },
    ],
    { model: getPuterModel(), temperature: 0.2, normalize: true },
  );
  const narrative = parseNarrative(textFrom(response));
  if (!narrative) return null;
  return { ...narrative, model: getPuterModel() };
}
