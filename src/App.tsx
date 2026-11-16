import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardScreenId } from "./lib/scrollSections";
import { AgentActivity } from "./components/AgentActivity";
import { AuditLog } from "./components/AuditLog";
import { DecisionPanel } from "./components/DecisionPanel";
import { Header } from "./components/Header";
import { RoleHome } from "./components/RoleHome";
import { RoleSwitchOverlay } from "./components/RoleSwitchOverlay";
import { Sidebar } from "./components/Sidebar";
import { FloatingScenarioDock, type IntakeMessage } from "./components/FloatingScenarioDock";
import { CaseDesk } from "./components/CaseDesk";
import { DEMO_STEP_DELAY_MS } from "./lib/constants";
import { emptySharedCase, recordDestination, ROLE_LABEL, type DemoRole } from "./lib/shared-case";
import type { DeskMode, GateRevision } from "./lib/flight-board";
import { useLiveDesk } from "./lib/useLiveDesk";
import { ensurePuterSession, intakeProblemWithPuter, narrateWithPuter } from "./lib/puter";
import { getDashboardModel } from "./orchestration/dashboard";
import {
  approvePlan,
  canRun,
  createInitialSnapshot,
  rejectPlan,
  recordIntakeMessage,
  resetDemo,
  runAgents,
  selectScenario,
  setOutageEnabled,
} from "./orchestration/orchestrator";
import { scenario } from "./scenarios/mci-ground-stop";

function matchesDemoScenario(text: string): boolean {
  return /ground\s*stop|mci|a31|kansas\s*city/i.test(text);
}

export function App() {
  const [snapshot, setSnapshot] = useState(createInitialSnapshot);
  const [deskMode, setDeskMode] = useState<DeskMode>("normal");
  const [gate, setGate] = useState<GateRevision | null>(null);
  const [approver, setApprover] = useState("Demo Dispatcher");
  const runId = useRef(0);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeScreen, setActiveScreen] = useState<DashboardScreenId>("dashboard");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [role, setRole] = useState<DemoRole>("dispatch");
  const [sharedCase, setSharedCase] = useState(emptySharedCase);
  const [navPulseId, setNavPulseId] = useState<string | null>(null);
  const [scenarioDockOpen, setScenarioDockOpen] = useState(false);
  const [intakeMessages, setIntakeMessages] = useState<IntakeMessage[]>([]);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const intakeId = useRef(0);
  const prevPhaseRef = useRef(snapshot.phase);
  const pulseNav = useCallback((id: string) => {
    setNavPulseId(id);
    window.setTimeout(() => setNavPulseId((current) => (current === id ? null : current)), 420);
  }, []);
  const model = getDashboardModel(snapshot);
  const live = useLiveDesk();

  const navigate = useCallback((id: DashboardScreenId) => {
    if (id === "operations") setCaseId(null);
    setActiveScreen(id);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openCase = useCallback((id: string) => {
    setCaseId(id);
    setActiveScreen("operations");
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openProfile = useCallback(() => {
    pulseNav("decision");
    navigate("decision");
  }, [navigate, pulseNav]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    const next = snapshot.phase;
    prevPhaseRef.current = next;
    if (prev === next) return;
    if (next === "awaiting_decision") navigate("decision");
    else if (next === "running") navigate("agents");
    else if (next === "decided") navigate("dashboard");
  }, [snapshot.phase, navigate]);

  function renderScreen() {
    switch (activeScreen) {
      case "dashboard":
        return (
          <RoleHome
            role={role}
            mode={deskMode}
            gate={gate}
            clock={live.timeLabel}
            onOpenCase={openCase}
            onConfirmGate={() =>
              setGate((current) => (current ? { ...current, status: "confirmed" } : current))
            }
          />
        );
      case "operations":
        return (
          <CaseDesk
            model={model}
            caseId={caseId}
            role={role}
            mode={deskMode}
            gate={gate}
            sharedCase={sharedCase}
            onOpenFlight={openCase}
            onConfirmGate={() => setGate((current) => (current ? { ...current, status: "confirmed" } : current))}
            onRecordDestination={(code) => setSharedCase((current) => recordDestination(current, code))}
          />
        );
      case "agents":
        return <AgentActivity snapshot={snapshot} />;
      case "decision":
        return (
          <DecisionPanel
            snapshot={snapshot}
            approver={approver}
            onApprover={setApprover}
            onApprove={() => setSnapshot(approvePlan(snapshot, approver))}
            onReject={() => setSnapshot(rejectPlan(snapshot, approver))}
          />
        );
      case "audit":
        return <AuditLog events={snapshot.audit} />;
      default:
        return null;
    }
  }

  const controlsLocked =
    snapshot.phase === "running" ||
    snapshot.phase === "decided" ||
    snapshot.phase === "awaiting_decision";

  async function onSendIntake(text: string) {
    const userId = `intake-${(intakeId.current += 1)}`;
    setIntakeMessages((messages) => [...messages, { id: userId, role: "user", text }]);
    setIntakeBusy(true);
    try {
      await ensurePuterSession();
      const reply = await intakeProblemWithPuter(text, {
        phase: snapshot.phase,
        scenarioSelected: snapshot.scenarioId === scenario.id,
      });
      setIntakeMessages((messages) => [
        ...messages,
        { id: `intake-${(intakeId.current += 1)}`, role: "assistant", text: reply },
      ]);
      setSnapshot((current) => {
        let next = recordIntakeMessage(current, text, reply);
        if (matchesDemoScenario(text) && currentCanSelectScenario(next)) {
          next = selectScenario(next, scenario.id);
          setScenarioDockOpen(true);
        }
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Puter intake failed.";
      setIntakeMessages((messages) => [
        ...messages,
        { id: `intake-${(intakeId.current += 1)}`, role: "assistant", text: message },
      ]);
    } finally {
      setIntakeBusy(false);
    }
  }

  function currentCanSelectScenario(current: ReturnType<typeof createInitialSnapshot>) {
    return current.phase !== "running" && current.scenarioId === null;
  }

  function onResetDemo() {
    runId.current += 1;
    setSnapshot(resetDemo());
    setDeskMode("normal");
    setGate(null);
    setIntakeMessages([]);
    setCaseId(null);
    setRole("dispatch");
    setSharedCase(emptySharedCase());
    navigate("dashboard");
  }

  async function onRun() {
    if (!canRun(snapshot)) return;
    const id = runId.current + 1;
    runId.current = id;
    let sessionError = "";
    try {
      await ensurePuterSession();
    } catch (error) {
      sessionError = error instanceof Error ? error.message : "Puter sign-in was not completed.";
    }
    if (runId.current !== id) return;
    const finalSnapshot = await runAgents(snapshot, {
      stepDelayMs: DEMO_STEP_DELAY_MS,
      narrate: sessionError ? async () => Promise.reject(new Error(sessionError)) : narrateWithPuter,
      onUpdate: (next) => {
        if (runId.current === id) setSnapshot(next);
      },
    });
    if (runId.current === id) setSnapshot(finalSnapshot);
  }

  return (
    <div
      className={
        [
          "app-shell",
          model.status === "Grounded" ? "is-grounded" : "",
          sidebarCollapsed ? "sidebar-collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <RoleSwitchOverlay role={role} />
      <Sidebar
        status={deskMode === "ground-stop" ? "Grounded" : "Normal"}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        role={role}
        onRole={setRole}
        activeId={activeScreen}
        pulseId={navPulseId}
        onPulse={pulseNav}
        onNavigate={navigate}
      />
      <div className="app-main" ref={mainScrollRef}>
        <div className="dashboard-chrome">
          <Header
            model={model}
            approver={approver}
            role={ROLE_LABEL[role]}
            clock={live.timeLabel}
            deskMode={deskMode}
            onOpenProfile={openProfile}
          />
        </div>
        <p className="banner">
          Educational simulation for a classroom demo. Not a dispatch or safety system. No live FAA,
          airport, airline, weather, or passenger data is connected.
        </p>
        <div className="dashboard-frame">
          <main className="screen-stage" aria-live="polite">
            {renderScreen()}
          </main>
        </div>
      </div>
      <FloatingScenarioDock
        open={scenarioDockOpen}
        onOpenChange={setScenarioDockOpen}
        model={model}
        outageEnabled={snapshot.outageEnabled}
        controlsLocked={controlsLocked}
        runDisabled={!canRun(snapshot)}
        running={snapshot.phase === "running"}
        onSelect={() => {
          setDeskMode("ground-stop");
          setSnapshot(selectScenario(snapshot, scenario.id));
        }}
        deskMode={deskMode}
        onDeskMode={(mode) => {
          setDeskMode(mode);
          if (mode === "late") setGate({ from: "B12", to: "B18", status: "proposed" });
          else setGate(null);
          if (mode === "ground-stop") setSnapshot(selectScenario(snapshot, scenario.id));
        }}
        onToggleOutage={(enabled) => setSnapshot(setOutageEnabled(snapshot, enabled))}
        onRun={() => void onRun()}
        onReset={onResetDemo}
        intakeMessages={intakeMessages}
        intakeBusy={intakeBusy}
        onSendIntake={(text) => void onSendIntake(text)}
      />
    </div>
  );
}
