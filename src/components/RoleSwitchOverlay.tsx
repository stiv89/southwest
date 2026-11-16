import { useEffect, useRef, useState } from "react";
import { ROLE_LABEL, type DemoRole } from "../lib/shared-case";
import {
  IconRoleCustomerService,
  IconRoleDispatch,
  IconRoleStation,
} from "./sidebar-icons";

export const ROLE_ICONS = {
  "station-ops": IconRoleStation,
  dispatch: IconRoleDispatch,
  "customer-service": IconRoleCustomerService,
} as const;

export function RoleSwitchOverlay({ role }: { role: DemoRole }) {
  const prev = useRef(role);
  const [shown, setShown] = useState<DemoRole | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (prev.current === role) return;
    const from = prev.current;
    prev.current = role;
    setShown(role);
    setLeaving(false);
    const fade = window.setTimeout(() => setLeaving(true), 880);
    const done = window.setTimeout(() => setShown(null), 1180);
    return () => {
      prev.current = from;
      window.clearTimeout(fade);
      window.clearTimeout(done);
    };
  }, [role]);

  if (!shown) return null;
  const Icon = ROLE_ICONS[shown];

  return (
    <div className={leaving ? "role-switch-overlay is-leaving" : "role-switch-overlay"} role="status" aria-live="polite">
      <div className="role-switch-modal">
        <div className="role-switch-mark" aria-hidden="true">
          <span className="role-switch-ring" />
          <Icon className="role-switch-svg" />
        </div>
        <p>Switching desk</p>
        <strong>{ROLE_LABEL[shown]}</strong>
      </div>
    </div>
  );
}
