import type { SimulationState } from "../../lib/simulation/types";

interface DeskMessage {
  id: string;
  to: string;
  title: string;
  body: string;
  status: "Sent" | "Waiting";
}

function messagesFromState(state: SimulationState): DeskMessage[] {
  const rows: DeskMessage[] = [];
  for (const passenger of state.passengers) {
    if (passenger.offer) {
      rows.push({
        id: `${passenger.id}-offer`,
        to: passenger.name,
        title: passenger.offerStatus === "accepted" ? "Rebooking confirmed" : "New flight offer",
        body:
          passenger.offerStatus === "accepted"
            ? `${passenger.name} accepted ${passenger.flight}, gate ${passenger.gate}, seat ${passenger.seat}.`
            : `Offer ${passenger.offer.flight} departing ${passenger.offer.departs} from gate ${passenger.offer.gate}.`,
        status: "Sent",
      });
    }
    const gateNotice = passenger.alerts.find((alert) => alert.startsWith("Gate changed"));
    if (gateNotice && passenger.offerStatus !== "accepted") {
      rows.push({
        id: `${passenger.id}-gate`,
        to: passenger.name,
        title: "Gate change",
        body: gateNotice,
        status: "Sent",
      });
    }
  }
  return rows;
}

export function Messages({ state }: { state: SimulationState }) {
  const messages = messagesFromState(state);

  return (
    <section className="page-screen" aria-labelledby="messages-heading">
      <header className="page-heading">
        <h2 id="messages-heading">Messages</h2>
        <p>Notices already delivered to passenger phones in this session</p>
      </header>

      {messages.length === 0 ? (
        <p className="source-line" data-testid="messages-empty">
          Nothing sent yet. Approve the gate change or offer a new flight and the phone notice appears here.
        </p>
      ) : (
        <ul className="desk-message-list" data-testid="messages-list">
          {messages.map((message) => (
            <li key={message.id}>
              <div className="desk-message-head">
                <strong>{message.title}</strong>
                <span>{message.status}</span>
              </div>
              <p className="source-line">To {message.to}</p>
              <p>{message.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
