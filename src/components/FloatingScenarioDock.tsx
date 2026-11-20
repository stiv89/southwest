import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DeskMode } from "../lib/flight-board";
import { scenario } from "../lib/mock-data";
import type { DashboardModel } from "../orchestration/dashboard";
import { IntelligenceOrb } from "./IntelligenceOrb";
import { ScenarioDockPills } from "./ScenarioPanel";
import { IconClose, IconReset, IconSend } from "./sidebar-icons";

export const OPS_AI_TITLE = "Ops Intelligence";

export interface IntakeMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const INTAKE_PREDICTIONS = [
  "MCI ground stop — flight A31 airborne from DEN",
  "What should dispatch verify during a ground stop?",
  "How does human approval work after the agents run?",
  "Airport closed; what should dispatch review?",
  `${scenario.passengers} passengers — what are the diversion options?`,
  "Explain the classroom demo vs. live Southwest operations",
  "A31 airborne from DEN with MCI closed",
  "What do customer service agents draft in this simulation?",
];

function matchPredictions(draft: string): string[] {
  const query = draft.trim().toLowerCase();
  if (!query) return INTAKE_PREDICTIONS.slice(0, 3);
  const words = query.split(/\s+/).filter((word) => word.length > 2);
  const scored = INTAKE_PREDICTIONS.map((line) => {
    const lower = line.toLowerCase();
    let score = 0;
    if (lower.startsWith(query)) score += 4;
    if (lower.includes(query)) score += 3;
    for (const word of words) {
      if (lower.includes(word)) score += 1;
    }
    return { line, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return INTAKE_PREDICTIONS.slice(0, 3);
  return scored.slice(0, 3).map((item) => item.line);
}

function lineMatchesDraft(line: string, draft: string): boolean {
  const query = draft.trim().toLowerCase();
  if (!query) return true;
  const lower = line.toLowerCase();
  if (lower.includes(query)) return true;
  return query
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .some((word) => lower.includes(word));
}

export function FloatingScenarioDock({
  open,
  onOpenChange,
  model,
  running,
  deskMode,
  onDeskMode,
  onReset,
  intakeMessages,
  intakeBusy,
  onSendIntake,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: DashboardModel;
  running: boolean;
  deskMode: DeskMode;
  onDeskMode: (mode: DeskMode) => void;
  onReset: () => void;
  intakeMessages: IntakeMessage[];
  intakeBusy: boolean;
  onSendIntake: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [optimisticUserText, setOptimisticUserText] = useState<string | null>(null);
  const formId = useId();
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function sendPrompt(text: string) {
    const value = text.trim();
    if (!value || intakeBusy) return;
    setOptimisticUserText(value);
    setDraft("");
    onSendIntake(value);
    inputRef.current?.focus();
  }

  function submitChat(text?: string) {
    sendPrompt(text ?? draft);
  }

  useEffect(() => {
    if (intakeMessages.some((message) => message.role === "user")) {
      setOptimisticUserText(null);
    }
  }, [intakeMessages]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: intakeMessages.length < 3 ? "auto" : "smooth" });
  }, [intakeMessages, intakeBusy]);

  const aiActive = running || intakeBusy;
  const canSend = draft.trim().length > 0 && !intakeBusy;
  const inConversation = intakeMessages.length > 0 || intakeBusy || optimisticUserText !== null;
  const showIdle = !inConversation;

  const threadMessages: IntakeMessage[] = useMemo(() => {
    if (!optimisticUserText) return intakeMessages;
    const alreadyShown = intakeMessages.some(
      (message) => message.role === "user" && message.text === optimisticUserText,
    );
    if (alreadyShown) return intakeMessages;
    return [
      ...intakeMessages,
      { id: "optimistic-user", role: "user", text: optimisticUserText },
    ];
  }, [intakeMessages, optimisticUserText]);
  const predictions = useMemo(() => matchPredictions(draft), [draft]);
  const [pointerInScroll, setPointerInScroll] = useState(false);
  const [scrollingChat, setScrollingChat] = useState(false);
  const scrollEndRef = useRef<number | null>(null);

  function onChatScroll() {
    setScrollingChat(true);
    if (scrollEndRef.current !== null) window.clearTimeout(scrollEndRef.current);
    scrollEndRef.current = window.setTimeout(() => setScrollingChat(false), 700);
  }

  const showChatScrollbar = pointerInScroll || scrollingChat;
  const drafting = draft.trim().length > 0 || inputFocused;
  const [showPanel, setShowPanel] = useState(open);
  const [genieExiting, setGenieExiting] = useState(false);
  const panelWasOpenRef = useRef(open);

  useEffect(() => {
    if (open) {
      panelWasOpenRef.current = true;
      setGenieExiting(false);
      setShowPanel(true);
      return;
    }
    if (!panelWasOpenRef.current) return;
    panelWasOpenRef.current = false;
    setGenieExiting(true);
    const timer = window.setTimeout(() => {
      setShowPanel(false);
      setGenieExiting(false);
    }, 460);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div className={`scenario-dock${open || showPanel ? " is-open" : ""}`} data-testid="scenario-dock">
      {showPanel ? (
        <div
          className={`scenario-dock-panel${genieExiting ? " is-genie-out" : " is-genie-in"}`}
          role="dialog"
          aria-label={`${OPS_AI_TITLE} chat and demo setup`}
          aria-hidden={genieExiting}
        >
          <header className="scenario-dock-header">
            <div>
              <h2 className="scenario-dock-title">{OPS_AI_TITLE}</h2>
              <p className="scenario-dock-subtitle">Questions, disruptions, or pick <strong>Ground stop</strong>.</p>
            </div>
            <div className="scenario-dock-header-actions">
              <button
                type="button"
                className="scenario-dock-icon-btn"
                data-testid="reset"
                aria-label="Reset demo"
                title="Reset demo"
                onClick={onReset}
              >
                <IconReset className="scenario-dock-icon" />
              </button>
              <button
                type="button"
                className="scenario-dock-icon-btn"
                aria-label={`Close ${OPS_AI_TITLE}`}
                title="Close"
                onClick={() => onOpenChange(false)}
              >
                <IconClose className="scenario-dock-icon" />
              </button>
            </div>
          </header>

          <section className="scenario-dock-setup-wrap" aria-labelledby="setup-heading">
            <h3 id="setup-heading" className="visually-hidden">
              Scenario demo
            </h3>
            <ScenarioDockPills deskMode={deskMode} onDeskMode={onDeskMode} />
            {running ? <IntelligenceOrb size="sm" label="Agents working" className="scenario-dock-ai-status" /> : null}
          </section>

          <div className="scenario-dock-divider" role="separator" />

          <section className="intake-chat intake-chat--gpt" aria-labelledby="intake-heading">
            <h3 id="intake-heading" className="visually-hidden">
              {OPS_AI_TITLE} chat
            </h3>

            <div
              className={`intake-gpt-scroll${showIdle ? " intake-gpt-scroll--idle" : ""}${drafting ? " is-drafting" : ""}${showChatScrollbar ? " intake-gpt-scroll--engaged" : ""}`}
              ref={threadRef}
              aria-live="polite"
              onMouseEnter={() => setPointerInScroll(true)}
              onMouseLeave={() => setPointerInScroll(false)}
              onScroll={onChatScroll}
            >
              {showIdle ? (
                <div className="intake-gpt-idle">
                  <div className="intake-gpt-hero intake-gpt-hero--compact">
                    <IntelligenceOrb size="lg" className="intake-gpt-hero-orb" />
                    <p className="intake-gpt-hero-title">Ask ops questions or describe what&apos;s happening.</p>
                    <p className="intake-gpt-hero-note">Tap a case to send it · classroom simulation only</p>
                  </div>
                  <ul className="intake-gpt-backdrop" aria-label="Example prompts">
                    {predictions.map((line) => {
                      const match = lineMatchesDraft(line, draft);
                      return (
                        <li
                          key={line}
                          className={match ? "intake-gpt-backdrop-item is-match" : "intake-gpt-backdrop-item"}
                        >
                          <button
                            type="button"
                            className="intake-gpt-backdrop-btn"
                            data-testid="intake-suggestion"
                            disabled={intakeBusy}
                            aria-label={`Send to Ops Intelligence: ${line}`}
                            onClick={() => sendPrompt(line)}
                          >
                            <span className="intake-gpt-backdrop-text">{line}</span>
                            <span className="intake-gpt-backdrop-send" aria-hidden="true">
                              Send
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="intake-gpt-thread">
                  {threadMessages.map((message, index) => (
                    <article
                      key={message.id}
                      className={`intake-gpt-turn intake-gpt-turn--${message.role} intake-gpt-animate-in`}
                      style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
                    >
                      {message.role === "assistant" ? (
                        <div className="intake-gpt-avatar">
                          <IntelligenceOrb size="sm" paused />
                        </div>
                      ) : null}
                      <div
                        className={
                          message.role === "user"
                            ? `intake-gpt-bubble intake-gpt-bubble--user${
                                message.id === "optimistic-user" ? " intake-gpt-bubble--outgoing" : ""
                              }`
                            : "intake-gpt-copy"
                        }
                      >
                        {message.text}
                      </div>
                    </article>
                  ))}
                  {intakeBusy ? (
                    <article className="intake-gpt-turn intake-gpt-turn--assistant intake-gpt-reasoning" aria-busy="true">
                      <div className="intake-gpt-avatar">
                        <IntelligenceOrb size="sm" />
                      </div>
                      <div className="intake-gpt-reasoning-body">
                        <p className="intake-gpt-reasoning-label">
                          <span className="intake-gpt-reasoning-dot" aria-hidden="true" />
                          Thinking
                        </p>
                        <p className="intake-gpt-reasoning-hint">Reviewing your case and demo context…</p>
                      </div>
                    </article>
                  ) : null}
                </div>
              )}
            </div>

            <div className="intake-gpt-composer-wrap">
              <form
                className={`intake-gpt-bar${intakeBusy ? " intake-gpt-bar--ai" : ""}${draft.trim() ? " is-typing" : ""}${inputFocused ? " is-focused" : ""}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitChat();
                }}
              >
                <label htmlFor={formId} className="visually-hidden">
                  Message {OPS_AI_TITLE}
                </label>
                <textarea
                  id={formId}
                  ref={inputRef}
                  data-testid="intake-input"
                  rows={1}
                  className="intake-gpt-input"
                  value={draft}
                  placeholder="Message Ops Intelligence…"
                  disabled={intakeBusy}
                  onChange={(event) => setDraft(event.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => window.setTimeout(() => setInputFocused(false), 160)}
                  onKeyDown={(event) => {
                    if (
                      showIdle &&
                      event.key === "Tab" &&
                      predictions[0] &&
                      !event.shiftKey &&
                      draft.trim().length === 0
                    ) {
                      event.preventDefault();
                      setDraft(predictions[0]);
                      return;
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitChat();
                    }
                  }}
                />
                <button
                  type="submit"
                  className={`intake-gpt-send${canSend ? " is-ready" : ""}`}
                  disabled={!canSend}
                  aria-label={intakeBusy ? "Sending" : "Send message"}
                >
                  {intakeBusy ? <IntelligenceOrb size="sm" /> : <IconSend className="intake-gpt-send-icon" />}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}

      <button
        type="button"
        className={`scenario-dock-launcher${aiActive ? " is-ai-active" : ""}`}
        aria-expanded={open}
        aria-label={OPS_AI_TITLE}
        data-testid="scenario-dock-toggle"
        onClick={() => onOpenChange(!open)}
      >
        <span className="scenario-dock-launcher-icon">
          <IntelligenceOrb size="md" className="scenario-dock-launcher-orb" />
          {model.selected ? <span className="scenario-dock-launcher-dot" title="Demo loaded" /> : null}
        </span>
        <span className="scenario-dock-launcher-label">Ops</span>
      </button>
    </div>
  );
}