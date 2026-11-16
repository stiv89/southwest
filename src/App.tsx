import { useRef, useState } from "react";
import { AgentActivity } from "./components/AgentActivity";
import { AuditLog } from "./components/AuditLog";
import { DecisionPanel } from "./components/DecisionPanel";
import { Header } from "./components/Header";
import { OperationalOverview } from "./components/OperationalOverview";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { DEMO_STEP_DELAY_MS } from "./lib/constants";
import { ensurePuterSession, narrateWithPuter } from "./lib/puter";
import { getDashboardModel } from "./orchestration/dashboard";
import {
  approvePlan,
  canRun,
  createInitialSnapshot,
  rejectPlan,
  resetDemo,
  runAgents,
  selectScenario,
  setOutageEnabled,
} from "./orchestration/orchestrator";
import { scenario } from "./scenarios/mci-ground-stop";

export function App() {
  const [snapshot, setSnapshot] = useState(createInitialSnapshot);
  const [approver, setApprover] = useState("Demo Dispatcher");
  const runId = useRef(0);
  const model = getDashboardModel(snapshot);

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
    <div className={model.status === "Grounded" ? "app is-grounded" : "app"}>
      <Header
        model={model}
        onReset={() => {
          runId.current += 1;
          setSnapshot(resetDemo());
        }}
      />
      <p className="banner">
        Educational simulation for a classroom demo. Not a dispatch or safety system. No live FAA,
        airport, airline, weather, or passenger data is connected.
      </p>
      <main className="layout">
        <div className="column">
          <ScenarioPanel
            model={model}
            outageEnabled={snapshot.outageEnabled}
            controlsLocked={
              snapshot.phase === "running" ||
              snapshot.phase === "decided" ||
              snapshot.phase === "awaiting_decision"
            }
            runDisabled={!canRun(snapshot)}
            running={snapshot.phase === "running"}
            onSelect={() => setSnapshot(selectScenario(snapshot, scenario.id))}
            onToggleOutage={(enabled) => setSnapshot(setOutageEnabled(snapshot, enabled))}
            onRun={() => void onRun()}
          />
          <OperationalOverview model={model} />
        </div>
        <div className="column">
          <AgentActivity snapshot={snapshot} />
          <DecisionPanel
            snapshot={snapshot}
            approver={approver}
            onApprover={setApprover}
            onApprove={() => setSnapshot(approvePlan(snapshot, approver))}
            onReject={() => setSnapshot(rejectPlan(snapshot, approver))}
          />
        </div>
        <AuditLog events={snapshot.audit} />
      </main>
    </div>
  );
}
