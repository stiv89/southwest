# Southwest Agentic Operations — MCI

Classroom project for **ID701**. It simulates one disruption at Kansas City International Airport (MCI): a Ground Stop at 12:20 PM that affects inbound flight A31.

Two agents read local tools, an orchestrator combines their findings, and a person approves or rejects the plan. The app does not dispatch aircraft, talk to air traffic control, or message passengers.

## Run it

Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints. The interface is in English.

```bash
npm test
npm run build
```

## Demo (3–5 minutes)

1. Select **Ground Stop — 12:20 PM**. The header shows Grounded and flight A31.
2. Click **Run Agents**. The first time, [Puter.js](https://docs.puter.com/AI/chat/) asks for a sign-in. No project API key is required. Flight Operations runs first and passes its options to Customer Service.
3. Open **Execution history** and the audit log. Tool rows are simulated. The scenario row is a course-brief fact.
4. Read the recommendation. Alternates are not ranked. Capacity, runway, fuel, and handling stay unknown. The customer draft is not sent.
5. **Approve simulated plan** or **Reject**. MCI stays Grounded either way.
6. **Reset Demo** restores the start. **Simulate tool outage** fails `getDiversionOptions` and does not invent a diversion.

If Puter sign-in is cancelled, the recommendation stays the one built directly from the tool results.

## What the agents may say

Passenger counts, crew duty, fuel flexibility, and the alternate codes come from the course brief in `data/mock/scenario-mci-ground-stop.json`. They are labeled as scenario facts, not live airline data.

Diversion capability and hotel inventory are unknown on purpose. The course workbooks were not in this repository. See `data/mock/ASSUMPTIONS.md`.

Puter (`gpt-5.4-nano`) only writes the narrative after the tools return. It cannot mark an option safe, and approval is still required before any simulated outcome is recorded.

## Layout

```text
src/agents/            Flight Operations, Customer Service, and the extended agent loops
src/orchestration/     Order, handoff, approval gate, reset
src/tools/             Read-only scenario and mock tools
src/components/        Screens: RoleHome, CaseDesk, agents, decision, audit
assets/brand/          Original logo and app icon
public/brand/          Logo served in the sidebar
public/icons/          Favicon and install icons
data/mock/             Labeled classroom data
data/source/           Place for local course files; not published here
```

## License

MIT. This is an educational simulation, not an operational system.
