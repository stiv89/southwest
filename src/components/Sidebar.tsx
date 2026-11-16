import { useEffect, useRef, useState } from "react";
import type { DashboardScreenId } from "../lib/scrollSections";
import { ROLES, type DemoRole } from "../lib/shared-case";
import { ROLE_ICONS } from "./RoleSwitchOverlay";
import {
  IconAgents,
  IconAudit,
  IconDashboard,
  IconDecision,
  IconOperations,
  IconSidebarToggle,
} from "./sidebar-icons";

const LINKS = [
  { id: "dashboard", label: "Today", Icon: IconDashboard },
  { id: "operations", label: "Operations", Icon: IconOperations },
  { id: "agents", label: "Agents", Icon: IconAgents },
  { id: "decision", label: "Decision", Icon: IconDecision },
  { id: "audit", label: "Audit", Icon: IconAudit },
] as const;

function RolePicker({
  role,
  collapsed,
  onRole,
}: {
  role: DemoRole;
  collapsed: boolean;
  onRole: (role: DemoRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = ROLES.find((item) => item.id === role) ?? ROLES[0];
  const CurrentIcon = ROLE_ICONS[current.id];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`role-picker${collapsed ? " is-collapsed" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={collapsed ? "sidebar-avatar sidebar-avatar--rail sidebar-avatar--btn" : "sidebar-user sidebar-user--btn"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${current.label}. Change department.`}
        title={current.label}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={collapsed ? "role-picker-mark" : "sidebar-avatar"} aria-hidden="true">
          <CurrentIcon className="sidebar-svg" />
        </span>
        {collapsed ? null : (
          <span className="sidebar-user-copy">
            <p className="sidebar-user-name">{current.label}</p>
            <p className="sidebar-user-role">Change department</p>
          </span>
        )}
      </button>
      {open ? (
        <div className="role-menu" role="menu" aria-label="Department">
          {ROLES.map((item) => {
            const Icon = ROLE_ICONS[item.id];
            return (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={item.id === role}
              className={item.id === role ? "is-current" : undefined}
              onClick={() => {
                setOpen(false);
                if (item.id !== role) onRole(item.id);
              }}
            >
              <span aria-hidden="true">
                <Icon className="sidebar-svg" />
              </span>
              {item.label}
            </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  status,
  collapsed,
  onToggleCollapsed,
  role,
  onRole,
  activeId,
  pulseId,
  onPulse,
  onNavigate,
}: {
  status: "Normal" | "Grounded";
  collapsed: boolean;
  onToggleCollapsed: () => void;
  role: DemoRole;
  onRole: (role: DemoRole) => void;
  activeId: DashboardScreenId;
  pulseId: string | null;
  onPulse: (id: string) => void;
  onNavigate: (id: DashboardScreenId) => void;
}) {
  const panelClass = collapsed ? "sidebar-panel glass-rail" : "sidebar-panel";

  const statusReadout = (
    <div className="sidebar-status-readout" role="status" aria-label={`Network status ${status}`}>
      <span className={`sidebar-rail-dot status-${status.toLowerCase()}`} aria-hidden="true" />
      <span className="sidebar-status-text">{status}</span>
    </div>
  );

  return (
    <aside className={collapsed ? "sidebar is-collapsed" : "sidebar"} aria-label="Icon navigation">
      <div className={panelClass}>
        <div className={`sidebar-header${collapsed ? " is-collapsed" : ""}`}>
          {!collapsed ? (
            <div className="sidebar-logo-wrap">
              <img
                src="/brand/southwest-logo.jpg"
                alt="Southwest Airlines"
                className="sidebar-logo"
                width={160}
                height={32}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="sidebar-collapse-btn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={onToggleCollapsed}
          >
            <IconSidebarToggle className="sidebar-svg" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Sections">
          {LINKS.map((link) => {
            const active = activeId === link.id;
            const pulse = pulseId === link.id;
            const Icon = link.Icon;
            return (
              <button
                key={link.id}
                type="button"
                title={link.label}
                className={
                  active
                    ? pulse
                      ? "sidebar-link is-active is-pulse"
                      : "sidebar-link is-active"
                    : pulse
                      ? "sidebar-link is-pulse"
                      : "sidebar-link"
                }
                aria-current={active ? "true" : undefined}
                aria-label={link.label}
                onClick={() => {
                  onPulse(link.id);
                  onNavigate(link.id);
                }}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Icon className="sidebar-svg" />
                </span>
                <span className="sidebar-link-label">{link.label}</span>
              </button>
            );
          })}
        </nav>

        {collapsed ? (
          <div className="sidebar-rail-footer">
            {statusReadout}
            <RolePicker role={role} collapsed onRole={onRole} />
          </div>
        ) : (
          <div className="sidebar-footer">
            {statusReadout}
            <RolePicker role={role} collapsed={false} onRole={onRole} />
          </div>
        )}
      </div>
    </aside>
  );
}