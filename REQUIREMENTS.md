# Southwest Airlines — Agentic AI Operations System

## MVP Requirements for Vibe Coding with Agentic AI

**Project type:** Classroom prototype / simulated airline disruption management  
**Airport:** Kansas City International Airport (MCI)  
**Development constraint:** One development class remaining before the final presentation  
**Primary objective:** Demonstrate a working, tool-using agentic system that analyzes a disruption, coordinates operational and passenger impacts, and presents a recommendation for human approval.

> This is an educational simulation, not a real airline dispatch or safety-critical decision system. All decisions and external actions must be simulated. Never imply the app has live FAA, airport, airline, weather, or passenger data unless a real authorized integration exists.

## 1. MVP scope

The app must support **one complete end-to-end scenario** rather than many incomplete workflows.

### Must have

- [ ] A clean operations dashboard with current scenario, operational status, and key metrics.
- [ ] A scenario selector or timeline for the provided MCI disruption events.
- [ ] Two logical agent roles: **Flight Operations Agent** and **Customer Service Agent**.
- [ ] A lightweight **Orchestrator** that coordinates agent execution and consolidates findings. It may be code rather than a third LLM agent.
- [ ] A functioning agent loop: receive event → gather context → call tools → inspect results → repeat if needed → return recommendation.
- [ ] At least one tool call with visible input/result for each agent during the demo.
- [ ] Integration with at least one provided Southwest dataset, or a clearly labeled and traceable mock-data fallback if the files are not available.
- [ ] One working Ground Stop / aircraft diversion demonstration.
- [ ] Recommendation panel with rationale, constraints, uncertainty, and downstream consequences.
- [ ] Human approval / rejection for operationally consequential decisions.
- [ ] An activity log showing agent status, tool calls, verification, and final outcome.
- [ ] A reproducible demo that can be reset and rerun.

### Nice to have (only after MVP works)

- [ ] Additional weather timeline events and alternate scenarios.
- [ ] Passenger notification previews and simulated send actions.
- [ ] Hotel and ground transportation resource suggestions.
- [ ] Comparison of multiple diversion alternatives in a table.
- [ ] Scenario replay, cost estimates, and recovery metrics.
- [ ] Subtle agent-working animations and richer charts.

### Out of scope

- Real flight dispatch, automated diversion execution, ATC commands, actual passenger notifications, live airline integrations, and full-network optimization.
- Real-world safety recommendations based on unverified inputs.
- A complex authentication, billing, or administrative system.

## 2. Core demonstration scenario

**Day 2 — Wednesday, 12:20 PM: MCI Ground Stop**

Scenario facts supplied in the course brief:

| Field | Value |
|---|---|
| Airport | MCI — Kansas City International Airport |
| Operational status | Grounded / Ground Stop |
| Event | FAA converts Ground Delay Program to Ground Stop |
| Constraint | Aircraft on the ground cannot depart toward MCI during the stop |
| Aircraft | A31, airborne from DEN |
| Passengers | 158 |
| Connecting passengers | 42 |
| Wheelchair passengers | 3 |
| Crew duty time remaining | 4 hours 20 minutes |
| Fuel hold/diversion flexibility | Approximately 55 minutes |
| Potential alternate airports to evaluate | STL, OMA, DSM, ICT, TUL |

**Important:** The scenario does not provide verified airport capacity, runway suitability, actual diversion flight times, fuel requirements, or ground handling availability. Do not fabricate these as facts. Use explicit mock values for a classroom simulation, label them as such, and do not declare a diversion safe without validated operational inputs and human authority.

### Required demo flow

1. User selects **Ground Stop — 12:20 PM**.
2. Dashboard updates to show MCI disruption and aircraft A31.
3. Orchestrator asks Flight Operations Agent to evaluate A31 and possible alternatives.
4. Flight Operations Agent reads available data, calls tools, checks constraints, and returns candidate options with unknowns.
5. Orchestrator asks Customer Service Agent to assess passenger impact for those options.
6. Customer Service Agent reads passenger counts and any relevant resource data, calls tools, and prepares an assistance/communication plan.
7. Orchestrator combines findings into a single recommendation with a clear human-approval requirement.
8. User clicks **Approve simulated plan** or **Reject**.
9. App records the simulated decision, updates the scenario state, and shows the audit trail.

## 3. Agents and responsibilities

### A. Flight Operations Agent

**Goal:** Analyze operational consequences of MCI disruptions and produce feasible *candidate* responses for human review.

**Inputs:** Flight status, aircraft position, disruption event, available alternate airports, crew constraints, available operational data.

**Tools (local functions or mock APIs):**

- `getFlightStatus(flightId)`
- `getAirportStatus(airportCode)`
- `getCrewConstraints(flightId)`
- `getDiversionOptions(flightId)`
- `evaluateOperationalImpact(optionId)`

**Outputs:** Ranked or qualified alternatives, supporting data, missing information, risks, downstream impact, and recommendation requiring human approval.

**Must not:** Command aircraft, bypass FAA/ATC, assert operational feasibility without required data, or automatically authorize diversions.

### B. Customer Service Agent

**Goal:** Assess passenger disruption and propose customer assistance and communication actions.

**Inputs:** Passenger counts, connections, accessibility needs, proposed operational options, hotel/transport resource availability when provided.

**Tools:**

- `getPassengerImpact(flightId)`
- `getConnectionImpact(flightId)`
- `getAvailableAssistance(airportCode)`
- `draftCustomerUpdate(flightId, status)`

**Outputs:** Affected passenger summary, connection risks, accessibility considerations, draft notification, and assistance needs.

**Must not:** Send real messages, disclose personal passenger information, confirm hotel inventory without data, or promise unapproved rebooking.

### C. Orchestrator

**Goal:** Route the scenario to the appropriate agents, share relevant context, consolidate findings, and escalate decisions.

**Responsibilities:**

- Receive the selected scenario.
- Run agents in a sensible order (Operations first, Customer Service second for the A31 example).
- Pass operational options to the Customer Service Agent.
- Detect incomplete or conflicting results.
- Require human approval before consequential actions.
- Keep the activity log and final outcome consistent.

**Implementation note:** The Orchestrator may be a deterministic controller. The project needs to demonstrate coordination, not necessarily three separate LLM instances.

## 4. Claude Code / agent execution loop

For each agent:

1. **Receive prompt and context:** Scenario, available tools, current state, and objective.
2. **Evaluate:** Decide whether information is sufficient or a tool is needed.
3. **Invoke tools:** Request one or more permitted tool calls.
4. **Execute and observe:** Run tools and return their results to the agent.
5. **Verify:** Check missing fields, inconsistent facts, safety constraints, and whether the objective has been met.
6. **Repeat or stop:** Continue only while useful, with a fixed maximum number of turns and a timeout.
7. **Return structured result:** Recommendation, evidence, uncertainties, human approvals required, and tool activity.

### Minimum loop behavior

- At least one genuine tool invocation per agent in the demo.
- A tool result must influence the agent's response; avoid hardcoded responses disguised as reasoning.
- Tool failures must show an error or fallback, not a fabricated success.
- Display a concise **action/observation log**, not private hidden chain-of-thought.
- Include a maximum-iteration limit and a stop condition.

## 5. App screens and UI

### Main screen — Operations Control Dashboard

A single-page desktop-first dashboard is sufficient. Use a clean, light, minimal design inspired by modern airline operations software.

**Header:**
- Southwest Agentic Operations / MCI.
- Selected scenario and simulated time.
- Status indicator: Normal, Weather Alert, Delayed, Grounded, or Disruption.
- Reset Demo button.

**Scenario panel:**
- Select an event from the course timeline.
- Show scenario facts and relevant alerts.
- Primary button: **Run Agents**.

**Operational overview:**
- Airport and disruption status.
- Flight A31 and passenger metrics.
- Known constraints and data freshness/source labels.

**Agent activity:**
- Flight Operations Agent card: Idle / Running / Waiting / Complete / Error.
- Customer Service Agent card: same states.
- Current action, tool name, and summarized result.
- Expandable execution history.

**Decision panel:**
- Consolidated recommendation.
- Candidate alternatives and trade-offs.
- What is known vs. unknown.
- Passenger consequences and required assistance.
- **Approve simulated plan** / **Reject** / optionally **Request alternative**.

**Audit/history panel:**
- Timestamped scenario events, tool calls, recommendations, approvals, and outcomes.
- Clearly distinguish simulated events from source facts.

### UI principles

- White/light background, readable typography, restrained color, generous spacing.
- Use colors for operational severity only, not decorative noise.
- Responsive layout for laptop and mobile, with desktop as priority for the final demo.
- Do not prioritize animations over functionality.
- Do not show fake real-time telemetry or fabricated certainty.

## 6. Course data and integration

The Blackboard screenshot shows these available resources, but their **contents have not been inspected**:

| File | Proposed use — verify actual columns/content first |
|---|---|
| `Southwest flights - tiers.xlsx` | Flight prioritization/classification |
| `Southwest MCI Daily Operating Schedule.docx` | Scheduled MCI operations |
| `Transportation hotels.xlsx` | Hotel and transportation resource data |
| `Southwest_MCI_Disruption_Recovery_Dataset.xlsx` | Disruption and recovery examples |

### Data integration rules

1. Inspect the actual files and record their sheets, fields, types, and coverage.
2. Normalize only the fields required for the chosen demo scenario.
3. Preserve source references and mark any missing values as unknown.
4. If data is insufficient, create a small `mock-data/` dataset with documented assumptions.
5. Never treat a file name as proof of a particular schema or record.
6. Keep demo execution deterministic where possible so the final presentation is reproducible.

## 7. Suggested application structure

```text
southwest-agentic-ops/
├── README.md
├── REQUIREMENTS.md
├── data/
│   ├── source/                 # Provided course files (local only)
│   ├── normalized/             # Parsed/validated data
│   └── mock/                   # Clearly labeled simulated values
├── src/
│   ├── app/                    # Dashboard and scenario UI
│   ├── components/             # Status, agent, decision, timeline panels
│   ├── agents/
│   │   ├── flight-operations/
│   │   └── customer-service/
│   ├── orchestration/          # Shared state, coordination, approval gate
│   ├── tools/                  # Read-only data and simulation tools
│   ├── scenarios/              # MCI timeline events
│   ├── types/                  # Shared contracts
│   └── lib/                    # Parsing, validation, audit logging
└── tests/                      # Demo scenario and guardrail tests
```

Use the team's existing stack if one already exists. Avoid a framework migration this late in the course.

## 8. Shared result contract

Each agent should return a consistent, validated structure similar to:

```json
{
  "agent": "flight-operations",
  "scenarioId": "mci-ground-stop-1220",
  "status": "needs_human_review",
  "summary": "Ground Stop affects inbound flight A31.",
  "knownFacts": ["A31 is airborne from DEN", "158 passengers"],
  "unknowns": ["Verified alternate airport handling capacity"],
  "options": [
    {
      "id": "evaluate-alternates",
      "label": "Review diversion candidates",
      "risks": ["Fuel and airport capacity must be verified"]
    }
  ],
  "recommendedNextStep": "Request dispatcher review of validated diversion options",
  "requiresHumanApproval": true,
  "toolCalls": ["getFlightStatus", "getDiversionOptions"]
}
```

The sample above illustrates the output shape; it is not an operational diversion recommendation.

## 9. Safety and human-in-the-loop requirements

- **FAA/ATC and airport restrictions are external constraints**, not actions controlled by Southwest agents.
- Never automatically authorize aircraft diversion, dispatch, cancellation, crew assignments, or safety-critical decisions.
- Keep a clear distinction between *AI recommendation*, *human approval*, and *simulated execution*.
- For passenger communications, show a draft; simulate sending only after approval.
- For every recommendation, surface the data source, key assumptions, uncertainty, and major trade-offs.
- If required information is unavailable, the agent must request it or escalate rather than guess.
- Log the approver and decision in the demo state (fictional identity is sufficient).

## 10. Acceptance tests

The MVP is ready for the final presentation when all of these pass:

- [ ] App launches locally without manual fixes.
- [ ] Selecting the 12:20 Ground Stop scenario updates the dashboard correctly.
- [ ] Clicking **Run Agents** starts both agent workflows.
- [ ] Both agents execute at least one real tool call and consume its result.
- [ ] Orchestrator passes an operational finding to Customer Service.
- [ ] Recommendation includes passenger impact and explicitly identified unknowns.
- [ ] No consequential action occurs before human approval.
- [ ] Approve and Reject lead to different, logged simulated outcomes.
- [ ] Reset Demo restores the starting state.
- [ ] A missing-data or tool-failure test shows a safe, understandable fallback.
- [ ] A team member can complete the live demo in 3–5 minutes.

## 11. Plan for the remaining class

**One development class remains before final presentations.** Focus on completion, not scope expansion.

| Time | Work | Exit criterion |
|---|---|---|
| 0–10 min | Review existing agents, data files, and blockers | Confirm what actually runs |
| 10–25 min | Connect agents to tools/data and Orchestrator | Both agents return structured outputs |
| 25–40 min | Implement the A31 Ground Stop demo | End-to-end scenario reaches recommendation |
| 40–50 min | Test approval, rejection, and failure handling | Human gate and fallback work |
| 50–60 min | Rehearse and assign presentation roles | Repeatable demo and clear owners |

If the class duration differs, preserve the same order and prioritize the end-to-end flow.

## 12. Final presentation outline (3–5 minute demo)

1. **Problem (30 sec):** MCI Ground Stop creates interconnected operational and passenger consequences.
2. **Architecture (45 sec):** Orchestrator, Flight Operations Agent, Customer Service Agent, tools, and approval gate.
3. **Live demo (2–3 min):** Select scenario → run agents → inspect tools → review recommendation → approve/reject simulation.
4. **Evaluation (30 sec):** What worked, where the agents needed missing data, and why human oversight matters.
5. **Next steps (15 sec):** Additional scenarios, better data integrations, and more rigorous evaluation.

## 13. Definition of done

**The final MVP is a working educational simulation where two coordinated agents use tools and available Southwest course data to analyze the MCI Ground Stop scenario, explain operational and customer impacts, and present a traceable recommendation for human approval.**

A polished interface is secondary to a reliable, explainable, end-to-end demonstration.
