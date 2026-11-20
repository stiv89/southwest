import { useEffect, useMemo, useState } from "react";
import {
  acceptPassengerOffer,
  joinPassengerSession,
  passengerStorageKey,
} from "../lib/simulation/client";
import type { DemoPassenger } from "../lib/simulation/types";
import "../passenger.css";

function params() {
  const query = new URLSearchParams(window.location.search);
  return { sessionId: query.get("session") ?? "" };
}

function usePassengerSession(sessionId: string) {
  const [passenger, setPassenger] = useState<DemoPassenger | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session. Scan the QR from the operations dashboard.");
      return;
    }
    const stored = localStorage.getItem(passengerStorageKey(sessionId));
    void joinPassengerSession(sessionId, stored)
      .then((result) => {
        localStorage.setItem(passengerStorageKey(sessionId), result.token);
        setToken(result.token);
        setPassenger(result.passenger);
        setReady(true);
      })
      .catch((joinError) => {
        setError(joinError instanceof Error ? joinError.message : "Could not join session.");
      });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !ready) return;
    const source = new EventSource(`/api/simulation/events?sessionId=${encodeURIComponent(sessionId)}`);
    source.onmessage = () => {
      try {
        const currentToken = localStorage.getItem(passengerStorageKey(sessionId));
        if (!currentToken) return;
        void fetch(`/api/simulation/passenger?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(currentToken)}`)
          .then((res) => res.json())
          .then((body: { passenger: DemoPassenger }) => setPassenger(body.passenger))
          .catch(() => undefined);
      } catch {
        /* ignore */
      }
    };
    return () => source.close();
  }, [sessionId, ready]);

  return { passenger, token, error, setPassenger };
}

function TerminalDirections({ fromGate, toGate }: { fromGate: string; toGate: string }) {
  return (
    <div className="wallet-directions" aria-label={`Walking route from ${fromGate} to ${toGate}`}>
      <svg viewBox="0 0 320 120" className="wallet-directions-svg">
        <path d="M20 60 H120" stroke="currentColor" strokeWidth="4" />
        <circle cx="20" cy="60" r="8" fill="currentColor" />
        <text x="16" y="90" fontSize="12">
          {fromGate}
        </text>
        <path d="M120 60 Q 200 20 300 60" stroke="var(--sw-blue)" strokeWidth="4" fill="none" />
        <circle cx="300" cy="60" r="8" fill="var(--sw-blue)" />
        <text x="286" y="90" fontSize="12">
          {toGate}
        </text>
      </svg>
    </div>
  );
}

export function PassengerApp() {
  const { sessionId } = params();
  const { passenger, token, error, setPassenger } = usePassengerSession(sessionId);
  const [showDirections, setShowDirections] = useState(false);
  const [busy, setBusy] = useState(false);

  const banner = passenger?.alerts[0] ?? null;
  const prevGate = useMemo(() => (passenger?.gate === "C19" ? "C14" : null), [passenger?.gate]);

  async function onAcceptOffer() {
    if (!token || !sessionId) return;
    setBusy(true);
    try {
      const result = await acceptPassengerOffer(sessionId, token);
      setPassenger(result.passenger);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="passenger-shell">
        <p className="alert">{error}</p>
      </main>
    );
  }

  if (!passenger) {
    return (
      <main className="passenger-shell">
        <p className="lede">Loading boarding pass…</p>
      </main>
    );
  }

  return (
    <main className="passenger-shell">
      <header className="passenger-top">
        <img src="/brand/southwest-logo.jpg" alt="Southwest" className="passenger-logo" />
        <span className="passenger-demo-tag">Classroom demo</span>
      </header>

      {banner ? (
        <div className="wallet-banner" role="status" aria-live="polite">
          {banner}
        </div>
      ) : null}

      <article className="wallet-pass" data-testid="boarding-pass">
        <div className="wallet-pass-top">
          <span>{passenger.route}</span>
          <strong>{passenger.flight}</strong>
        </div>
        <p className="wallet-gate-label">Gate</p>
        <p className="wallet-gate" data-testid="wallet-gate">
          {passenger.gate}
        </p>
        <dl className="wallet-facts">
          <div>
            <dt>Passenger</dt>
            <dd>{passenger.name}</dd>
          </div>
          <div>
            <dt>Seat</dt>
            <dd>{passenger.seat}</dd>
          </div>
          <div>
            <dt>Group</dt>
            <dd>{passenger.boardingGroup}</dd>
          </div>
          <div>
            <dt>Boarding ends</dt>
            <dd>{passenger.boardingEnds}</dd>
          </div>
        </dl>
        {passenger.connection && !passenger.connection.missed ? (
          <section className="wallet-connection">
            <h2>Connection</h2>
            <p>
              {passenger.connection.flight} · departs {passenger.connection.departs}
            </p>
            <p>
              Gate {passenger.connection.gate} · ~{passenger.connection.walkMinutes} min walk
            </p>
          </section>
        ) : null}
      </article>

      {passenger.persona === "terminal" && prevGate ? (
        <button type="button" className="btn btn-primary wallet-btn" onClick={() => setShowDirections((v) => !v)}>
          Get Directions
        </button>
      ) : null}
      {showDirections && prevGate ? <TerminalDirections fromGate={prevGate} toGate={passenger.gate} /> : null}

      {passenger.offer && passenger.offerStatus === "offered" ? (
        <section className="wallet-offer">
          <h2>New flight offer</h2>
          <p>
            {passenger.offer.flight} · {passenger.offer.route}
          </p>
          <p>
            Departs {passenger.offer.departs} · Gate {passenger.offer.gate}
          </p>
          <button type="button" className="btn btn-primary wallet-btn" disabled={busy} onClick={() => void onAcceptOffer()}>
            Accept New Flight
          </button>
        </section>
      ) : null}
    </main>
  );
}