import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PassengerDemoModal({
  open,
  onClose,
  url,
}: {
  open: boolean;
  onClose: () => void;
  url: string | null;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !url) {
      setQr(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, { margin: 1, width: 220 }).then((dataUrl) => {
      if (!cancelled) setQr(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card passenger-demo-modal"
        role="dialog"
        aria-labelledby="passenger-demo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="passenger-demo-title">Passenger Demo</h2>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <p>Scan on each phone. Participants receive a unique boarding pass. Reload keeps the same pass.</p>
        {qr ? (
          <img src={qr} alt="QR code to join passenger demo" className="passenger-demo-qr" />
        ) : (
          <p className="empty">Preparing QR…</p>
        )}
        {url ? (
          <p className="passenger-demo-url">
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}