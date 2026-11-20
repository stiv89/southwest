import { useCallback, useEffect, useRef, useState } from "react";
import { AuditLog } from "./components/AuditLog";
import { DecisionPanel } from "./components/DecisionPanel";
import { AffectedPassengers } from "./components/dept/AffectedPassengers";
import { Alerts } from "./components/dept/Alerts";
import { FlightWatch } from "./components/dept/FlightWatch";
import { Weather } from "./components/dept/Weather";
import { GateMap } from "./components/dept/GateMap";
import { StationTasks } from "./components/dept/StationTasks";
import { Header } from "./components/Header";
import { Messages } from "./components/dept/Messages";
import { Rebooking } from "./components/dept/Rebooking";
import { ScenarioStrip } from "./components/ScenarioStrip";
import { PassengerDemoModal } from "./components/PassengerDemoModal";
import { RoleSwitchOverlay } from "./components/RoleSwitchOverlay";
import { Sidebar } from "./components/Sidebar";
import { SimulationActivity } from "./components/SimulationActivity";
import { DeskSettingsModal } from "./components/DeskSettingsModal";
import { FloatingScenarioDock, type IntakeMessage } from "./components/FloatingScenarioDock";
import {
  enabledExtendedAgentKeys,
  loadDeskPreferences,
  saveDeskPreferences,
  type DeskPreferences,
} from "./lib/desk-preferences";
import { DEFAULT_SCREEN, type DepartmentScreenId } from "./lib/department-nav";
import { deskPath, parseDeskPath } from "./lib/desk-url";
import { emptySharedCase, type DemoRole } from "./lib/shared-case";
import type { DeskMode, GateRevision } from "./lib/flight-board";
import { useLiveDesk } from "./lib/useLiveDesk";
import { useSimulationSession } from "./lib/simulation/client";
import type { RampSelection } from "./components/dept/RampScene";
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
} from "./orchestration/orchestrator";
import type { DemoSnapshot } from "./types/contracts";
import { scenario } from "./scenarios/mci-ground-stop";

function matchesDemoScenario(text: string): boolean {
  const paxPattern = `${scenario.passengers}\\s+passengers`;
  return new RegExp(
    `ground\\s*stop|mci|a31|kansas\\s*city|airport\\s+closed|diversion|den\\s*→?\\s*mci|${paxPattern}`,
    "i",
  ).test(text);
}

export function App() {
  const located = parseDeskPath(window.location.pathname);
  const [snapshot, setSnapshot] = useState(createInitialSnapshot);
  const [deskMode, setDeskMode] = useState<DeskMode>("normal");
  const [, setGate] = useState<GateRevision | null>(null);
  const [approver, setApprover] = useState("Demo Dispatcher");
  const runId = useRef(0);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeScreen, setActiveScreen] = useState<DepartmentScreenId>(
    located?.screen ?? DEFAULT_SCREEN.dispatch,
  );
  const [role, setRole] = useState<DemoRole>(located?.role ?? "dispatch");
  const [, setSharedCase] = useState(emptySharedCase);
  const [navPulseId, setNavPulseId] = useState<string | null>(null);
  const [scenarioDockOpen, setScenarioDockOpen] = useState(false);
  const [intakeMessages, setIntakeMessages] = useState<IntakeMessage[]>([]);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [passengerDemoOpen, setPassengerDemoOpen] = useState(false);
  const [simBusy, setSimBusy] = useState(false);
  const intakeId = useRef(0);
  const prevPhaseRef = useRef(snapshot.phase);
  const sim = useSimulationSession();
  const [watchFocus, setWatchFocus] = useState<RampSelection | null>(null);
  const [deskPrefs, setDeskPrefs] = useState<DeskPreferences>(() => loadDeskPreferences());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pulseNav = useCallback((id: string) => {
    setNavPulseId(id);
    window.setTimeout(() => setNavPulseId((current) => (current === id ? null : current)), 420);
  }, []);
  const model = getDashboardModel(snapshot);
  const live = useLiveDesk();

  const navigate = useCallback((id: DepartmentScreenId) => {
    setActiveScreen(id);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const historyReady = useRef(false);
  useEffect(() => {
    const path = deskPath(role, activeScreen);
    if (window.location.pathname !== path) {
      const update = historyReady.current ? "pushState" : "replaceState";
      window.history[update](null, "", path);
    }
    historyReady.current = true;
  }, [role, activeScreen]);

  useEffect(() => {
    function onPop() {
      const next = parseDeskPath(window.location.pathname);
      if (!next) return;
      setRole(next.role);
      setActiveScreen(next.screen);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    const next = snapshot.phase;
    prevPhaseRef.current = next;
    if (prev === next) return;
    if (next === "awaiting_decision") navigate("decision");
    else if (next === "running") navigate("activity");
    else if (next === "decided") navigate(DEFAULT_SCREEN[role]);
  }, [snapshot.phase, navigate, role]);

  function renderScreen() {
    if (!sim.state) {
      return (
        <section className="card card--panel">
          <p className="lede">{sim.loading ? "Connecting incident session…" : sim.error ?? "Simulation unavailable."}</p>
        </section>
      );
    }

    switch (activeScreen) {
      case "gate-map":
        return (
          <GateMap
            state={sim.state}
            onApproveGateChange={() => void sim.approveGateChange()}
            onRejectGateChange={() => void sim.rejectGateChange()}
          />
        );
      case "tasks":
        return (
          <StationTasks
            state={sim.state}
            onCompleteTask={(taskId) => void sim.completeStationTask(taskId)}
          />
        );
      case "flight-watch":
        return (
          <FlightWatch
            state={sim.state}
            busy={simBusy}
            initialSelection={watchFocus}
            onSimulateDelay={() => {
              setSimBusy(true);
              void sim.simulateDelay().finally(() => setSimBusy(false));
            }}
          />
        );
      case "weather":
        return (
          <Weather
            state={sim.state}
            onOpenFlightWatch={(flightId) => {
              if (flightId === "sw2847" || flightId === "sw412") {
                setWatchFocus({ kind: "flight", id: flightId });
              }
              navigate("flight-watch");
            }}
          />
        );
      case "alerts":
        return (
          <Alerts
            state={sim.state}
            role={role}
            onOpenFlightWatch={() => {
              setWatchFocus({ kind: "flight", id: "sw412" });
              navigate("flight-watch");
            }}
            onReviewGateChange={() => navigate("gate-map")}
          />
        );
      case "affected-passengers":
        return (
          <AffectedPassengers state={sim.state} onOfferNewFlight={(id) => void sim.offerNewFlight(id)} />
        );
      case "rebooking":
        return <Rebooking state={sim.state} onOfferNewFlight={(id) => void sim.offerNewFlight(id)} />;
      case "messages":
        return <Messages state={sim.state} />;
      case "activity":
        return <SimulationActivity events={sim.state.activity} snapshot={snapshot} />;
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

  async function runAgentsFrom(start: DemoSnapshot) {
    if (!canRun(start)) return;
    const id = runId.current + 1;
    runId.current = id;
    let sessionError = "";
    try {
      await ensurePuterSession();
    } catch (error) {
      sessionError = error instanceof Error ? error.message : "Puter sign-in was not completed.";
    }
    if (runId.current !== id) return;
    const finalSnapshot = await runAgents(start, {
      stepDelayMs: deskPrefs.stepDelayMs,
      enabledExtendedAgents: enabledExtendedAgentKeys(deskPrefs),
      narrate: sessionError ? async () => Promise.reject(new Error(sessionError)) : narrateWithPuter,
      onUpdate: (next) => {
        if (runId.current === id) setSnapshot(next);
      },
    });
    if (runId.current === id) setSnapshot(finalSnapshot);
  }

  function onDeskModeChange(mode: DeskMode) {
    setDeskMode(mode);
    if (mode === "late") setGate({ from: "B12", to: "B18", status: "proposed" });
    else setGate(null);

    if (mode !== "ground-stop") return;

    setSnapshot((current) => {
      const next = selectScenario(current, scenario.id);
      if (canRun(next)) void runAgentsFrom(next);
      return next;
    });
  }

  async function onSendIntake(text: string) {
    const userId = `intake-${(intakeId.current += 1)}`;
    const autoLoadDemo = matchesDemoScenario(text) && currentCanSelectScenario(snapshot);
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
      let runAfter: DemoSnapshot | null = null;
      setSnapshot((current) => {
        let next = recordIntakeMessage(current, text, reply);
        if (autoLoadDemo && currentCanSelectScenario(next)) {
          next = selectScenario(next, scenario.id);
          if (canRun(next)) runAfter = next;
        }
        return next;
      });
      if (autoLoadDemo) {
        setDeskMode("ground-stop");
        setScenarioDockOpen(true);
        if (runAfter) void runAgentsFrom(runAfter);
      }
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
    setRole("dispatch");
    setSharedCase(emptySharedCase());
    navigate(DEFAULT_SCREEN.dispatch);
  }

  const incidentActive = sim.state?.incidentActive ?? true;

  return (
    <div
      className={
        [
          "app-shell",
          model.status === "Grounded" ? "is-grounded" : "",
          sidebarCollapsed ? "sidebar-collapsed" : "",
          incidentActive ? "is-incident-active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <RoleSwitchOverlay role={role} />
      <Sidebar
        status={deskMode === "ground-stop" ? "Grounded" : incidentActive ? "Grounded" : "Normal"}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        role={role}
        onRole={setRole}
        activeId={activeScreen}
        pulseId={navPulseId}
        onPulse={pulseNav}
        onNavigate={navigate}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="app-main" ref={mainScrollRef}>
        <div className="dashboard-chrome">
          <Header
            role={role}
            clock={live.timeLabel}
            deskMode={deskMode}
            simulation={sim.state}
            onOpenPassengerDemo={() => setPassengerDemoOpen(true)}
          />
          <ScenarioStrip model={model} simulation={sim.state} />
        </div>
        <div className="dashboard-frame">
          <main className="screen-stage" aria-live="polite">
            {renderScreen()}
          </main>
        </div>
        <p className="desk-footnote">
          Classroom simulation. Not a dispatch or safety system. No live FAA, airport, airline, weather, or passenger data.
        </p>
      </div>
      <FloatingScenarioDock
        open={scenarioDockOpen}
        onOpenChange={setScenarioDockOpen}
        model={model}
        running={snapshot.phase === "running"}
        deskMode={deskMode}
        onDeskMode={onDeskModeChange}
        onReset={onResetDemo}
        intakeMessages={intakeMessages}
        intakeBusy={intakeBusy}
        onSendIntake={(text) => void onSendIntake(text)}
      />
      <PassengerDemoModal
        open={passengerDemoOpen}
        onClose={() => setPassengerDemoOpen(false)}
        url={sim.passengerUrl}
      />
      <DeskSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={deskPrefs}
        onPreferences={(next) => setDeskPrefs(saveDeskPreferences(next))}
        approver={approver}
        onApprover={setApprover}
        snapshot={snapshot}
        onSnapshot={setSnapshot}
        agentsRunning={snapshot.phase === "running"}
        onNavigate={navigate}
        onResetDemo={onResetDemo}
      />
    </div>
  );
}