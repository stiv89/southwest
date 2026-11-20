import { useEffect, useMemo, useState } from "react";
import { EXTENDED_AGENT_KEYS, EXTENDED_AGENT_LABELS } from "../lib/agent-slots";
import {
  DEFAULT_DESK_PREFERENCES,
  PUTER_MODEL_OPTIONS,
  clearSimulationSessionStorage,
  isDeskAdmin,
  lockDeskAdmin,
  type DeskPreferences,
  unlockDeskAdmin,
} from "../lib/desk-preferences";
import { OUTAGE_TOOL_NAME } from "../lib/constants";
import type { DepartmentScreenId } from "../lib/department-nav";
import { setOutageEnabled } from "../orchestration/orchestrator";
import type { DemoSnapshot } from "../types/contracts";
import { IconClose } from "./sidebar-icons";

type SectionId =
  | "general"
  | "agents"
  | "ground-stop"
  | "records"
  | "admin-access"
  | "admin-orchestrator"
  | "admin-session"
  | "admin-ai";

const SECTION_META: {
  id: SectionId;
  label: string;
  blurb: string;
  keywords: string;
  admin?: boolean;
}[] = [
  {
    id: "general",
    label: "General",
    blurb: "Name shown on approvals and agent playback speed.",
    keywords: "approver playback speed delay classroom",
  },
  {
    id: "agents",
    label: "Extended agents",
    blurb: "Choose which support agents run after customer service.",
    keywords: "scheduling communications compliance safety maintenance orchestrator",
  },
  {
    id: "ground-stop",
    label: "Ground stop lab",
    blurb: "Arm a simulated tool outage for the next agent run.",
    keywords: "outage diversion options ground stop demo",
  },
  {
    id: "records",
    label: "Records",
    blurb: "Open decision and audit views from the desk.",
    keywords: "activity decision audit history approval",
  },
  {
    id: "admin-access",
    label: "Admin access",
    blurb: "Unlock sensitive classroom controls for this browser tab.",
    keywords: "admin pin password instructor",
    admin: true,
  },
  {
    id: "admin-orchestrator",
    label: "Agent demo",
    blurb: "Reset the ground-stop agent sequence.",
    keywords: "reset orchestrator demo",
    admin: true,
  },
  {
    id: "admin-session",
    label: "Incident session",
    blurb: "Clear the shared gate-incident session on this machine.",
    keywords: "simulation session reload classroom",
    admin: true,
  },
  {
    id: "admin-ai",
    label: "Ops Intelligence model",
    blurb: "Puter model used for intake and agent narration.",
    keywords: "puter ai model gpt claude",
    admin: true,
  },
];

export function DeskSettingsModal({
  open,
  onClose,
  preferences,
  onPreferences,
  approver,
  onApprover,
  snapshot,
  onSnapshot,
  agentsRunning,
  onNavigate,
  onResetDemo,
}: {
  open: boolean;
  onClose: () => void;
  preferences: DeskPreferences;
  onPreferences: (next: DeskPreferences) => void;
  approver: string;
  onApprover: (name: string) => void;
  snapshot: DemoSnapshot;
  onSnapshot: (next: DemoSnapshot) => void;
  agentsRunning: boolean;
  onNavigate: (id: DepartmentScreenId) => void;
  onResetDemo: () => void;
}) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<SectionId>("general");
  const [admin, setAdmin] = useState(isDeskAdmin);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdmin(isDeskAdmin());
    setQuery("");
    setSection("general");
    setPin("");
    setPinError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const nav = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SECTION_META.filter((item) => {
      if (item.admin && !admin) return item.id === "admin-access";
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.blurb.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
      );
    });
  }, [query, admin]);

  useEffect(() => {
    if (nav.length > 0 && !nav.some((item) => item.id === section)) {
      setSection(nav[0].id);
    }
  }, [nav, section]);

  if (!open) return null;

  const canEditAgents = snapshot.phase === "idle" || snapshot.phase === "incomplete";
  const canEditOutage = canEditAgents && !agentsRunning;
  const active = SECTION_META.find((item) => item.id === section) ?? SECTION_META[0];

  function patchPreferences(patch: Partial<DeskPreferences>) {
    onPreferences({ ...preferences, ...patch });
  }

  function unlock() {
    if (unlockDeskAdmin(pin)) {
      setAdmin(true);
      setPinError(null);
      setPin("");
      setSection("admin-orchestrator");
      return;
    }
    setPinError("Incorrect admin code.");
  }

  return (
    <div className="desk-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="desk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="desk-modal-title"
        onClick={(event) => event.stopPropagation()}
        data-testid="desk-settings-modal"
      >
        <aside className="desk-modal-nav" aria-label="Settings sections">
          <div className="desk-modal-nav-head">
            <h2 id="desk-modal-title">Desk settings</h2>
            <button type="button" className="desk-modal-close" onClick={onClose} aria-label="Close settings">
              <IconClose className="desk-modal-close-icon" />
            </button>
          </div>
          <label className="desk-modal-search">
            <span className="visually-hidden">Search settings</span>
            <input
              type="search"
              placeholder="Search settings"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-testid="settings-search"
            />
          </label>
          <nav className="desk-modal-nav-list">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === section ? "is-active" : undefined}
                aria-current={item.id === section ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                {item.label}
                {item.admin ? <em>Admin</em> : null}
              </button>
            ))}
          </nav>
          <p className="desk-modal-nav-note">{admin ? "Admin unlocked for this tab." : "Sensitive changes need admin."}</p>
        </aside>

        <div className="desk-modal-main">
          <header className="desk-modal-main-head">
            <h3>{active.label}</h3>
            <p>{active.blurb}</p>
          </header>

          {section === "general" ? (
            <div className="desk-modal-section">
              <label className="desk-field">
                <span>Approver name</span>
                <input
                  type="text"
                  value={approver}
                  onChange={(event) => onApprover(event.target.value)}
                  maxLength={48}
                  data-testid="settings-approver"
                />
              </label>
              <label className="desk-field">
                <span>
                  Agent step delay · <strong>{preferences.stepDelayMs} ms</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={50}
                  value={preferences.stepDelayMs}
                  onChange={(event) => patchPreferences({ stepDelayMs: Number(event.target.value) })}
                  data-testid="settings-step-delay"
                />
              </label>
            </div>
          ) : null}

          {section === "agents" ? (
            <div className="desk-modal-section">
              {canEditAgents ? null : (
                <p className="desk-modal-warn">Wait until agents finish before changing who runs on the next sequence.</p>
              )}
              <ul className="desk-toggle-list">
                {EXTENDED_AGENT_KEYS.map((key) => (
                  <li key={key}>
                    <label className="desk-toggle">
                      <input
                        type="checkbox"
                        checked={preferences.extendedAgents[key] !== false}
                        disabled={!canEditAgents}
                        onChange={(event) =>
                          patchPreferences({
                            extendedAgents: { ...preferences.extendedAgents, [key]: event.target.checked },
                          })
                        }
                      />
                      <span>
                        <strong>{EXTENDED_AGENT_LABELS[key]}</strong>
                        <small>Runs after customer service on the ground-stop demo.</small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section === "ground-stop" ? (
            <div className="desk-modal-section">
              {canEditOutage ? null : (
                <p className="desk-modal-warn">Outage arms only apply before the next agent run starts.</p>
              )}
              <label className="desk-toggle desk-toggle--solo">
                <input
                  type="checkbox"
                  checked={snapshot.outageEnabled}
                  disabled={!canEditOutage}
                  onChange={(event) => onSnapshot(setOutageEnabled(snapshot, event.target.checked))}
                  data-testid="settings-outage"
                />
                <span>
                  <strong>Simulate tool outage</strong>
                  <small>
                    Next run fails when Flight Operations calls <code>{OUTAGE_TOOL_NAME}</code>.
                  </small>
                </span>
              </label>
            </div>
          ) : null}

          {section === "records" ? (
            <div className="desk-modal-section desk-modal-links">
              <button
                type="button"
                onClick={() => {
                  onNavigate("activity");
                  onClose();
                }}
              >
                Activity
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate("decision");
                  onClose();
                }}
              >
                Decision
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate("audit");
                  onClose();
                }}
              >
                Audit
              </button>
            </div>
          ) : null}

          {section === "admin-access" ? (
            <div className="desk-modal-section">
              {admin ? (
                <>
                  <p className="desk-modal-ok">Admin is active in this browser tab.</p>
                  <button
                    type="button"
                    className="desk-modal-danger"
                    onClick={() => {
                      lockDeskAdmin();
                      setAdmin(false);
                      setSection("admin-access");
                    }}
                  >
                    Lock admin
                  </button>
                </>
              ) : (
                <>
                  <p>Instructors use admin to reset the agent demo or clear the shared incident session.</p>
                  <label className="desk-field">
                    <span>Admin code</span>
                    <input
                      type="password"
                      value={pin}
                      onChange={(event) => {
                        setPin(event.target.value);
                        setPinError(null);
                      }}
                      autoComplete="off"
                      data-testid="settings-admin-pin"
                    />
                  </label>
                  {pinError ? <p className="desk-modal-error">{pinError}</p> : null}
                  <button type="button" className="desk-modal-primary" onClick={unlock} data-testid="settings-admin-unlock">
                    Unlock admin
                  </button>
                </>
              )}
            </div>
          ) : null}

          {section === "admin-orchestrator" && admin ? (
            <div className="desk-modal-section">
              <p>Clears the ground-stop agent sequence, audit trail, and recommendation for a fresh class run.</p>
              <button
                type="button"
                className="desk-modal-danger"
                disabled={agentsRunning}
                onClick={() => {
                  onResetDemo();
                  onClose();
                }}
                data-testid="settings-reset-demo"
              >
                Reset agent demo
              </button>
            </div>
          ) : null}

          {section === "admin-session" && admin ? (
            <div className="desk-modal-section">
              <p>
                Removes the saved gate-incident session and passenger tokens from this browser. The page reloads into a new
                classroom session.
              </p>
              <button
                type="button"
                className="desk-modal-danger"
                onClick={() => {
                  clearSimulationSessionStorage();
                  window.location.reload();
                }}
                data-testid="settings-clear-session"
              >
                Clear incident session &amp; reload
              </button>
            </div>
          ) : null}

          {section === "admin-ai" && admin ? (
            <div className="desk-modal-section">
              <label className="desk-field">
                <span>Puter model</span>
                <select
                  value={preferences.puterModel}
                  onChange={(event) => patchPreferences({ puterModel: event.target.value })}
                  data-testid="settings-puter-model"
                >
                  {PUTER_MODEL_OPTIONS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="desk-modal-secondary"
                onClick={() => patchPreferences({ puterModel: DEFAULT_DESK_PREFERENCES.puterModel })}
              >
                Restore default model
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}