import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_SCREEN,
  linksForRole,
  type DepartmentScreenId,
} from "../lib/department-nav";
import { ROLES, type DemoRole } from "../lib/shared-case";
import { ROLE_ICONS } from "./RoleSwitchOverlay";
import {
  IconActivity,
  IconAffectedPassengers,
  IconAlerts,
  IconAudit,
  IconDecision,
  IconFlightWatch,
  IconGateMap,
  IconMessages,
  IconRebooking,
  IconSettings,
  IconSidebarToggle,
  IconTasks,
  IconWeather,
} from "./sidebar-icons";

const ICON_BY_SCREEN: Record<DepartmentScreenId, typeof IconGateMap> = {
  "gate-map": IconGateMap,
  tasks: IconTasks,
  "flight-watch": IconFlightWatch,
  weather: IconWeather,
  alerts: IconAlerts,
  "affected-passengers": IconAffectedPassengers,
  rebooking: IconRebooking,
  messages: IconMessages,
  activity: IconActivity,
  decision: IconDecision,
  audit: IconAudit,
};

function RolePicker({
  role,
  collapsed,
  onRole,
  onNavigate,
  onOpenSettings,
}: {
  role: DemoRole;
  collapsed: boolean;
  onRole: (role: DemoRole) => void;
  onNavigate: (id: DepartmentScreenId) => void;
  onOpenSettings: () => void;
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
    <div className={`role-picker-row${collapsed ? " is-collapsed" : ""}`}>
      <div className={`role-picker${collapsed ? " is-collapsed" : ""}`} ref={rootRef}>
        <div className={collapsed ? undefined : "sidebar-user-split"}>
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
          {collapsed ? null : (
            <button
              type="button"
              className="role-picker-gear"
              aria-label="Desk settings"
              title="Desk settings"
              onClick={onOpenSettings}
              data-testid="open-desk-settings"
            >
              <IconSettings className="sidebar-svg" />
            </button>
          )}
        </div>
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
                    if (item.id !== role) {
                      onRole(item.id);
                      onNavigate(DEFAULT_SCREEN[item.id]);
                    }
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
      {collapsed ? (
        <button
          type="button"
          className="sidebar-link sidebar-link--compact role-picker-gear-btn"
          aria-label="Desk settings"
          title="Desk settings"
          onClick={onOpenSettings}
          data-testid="open-desk-settings-collapsed"
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            <IconSettings className="sidebar-svg" />
          </span>
        </button>
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
  onOpenSettings,
}: {
  status: "Normal" | "Grounded";
  collapsed: boolean;
  onToggleCollapsed: () => void;
  role: DemoRole;
  onRole: (role: DemoRole) => void;
  activeId: DepartmentScreenId;
  pulseId: string | null;
  onPulse: (id: string) => void;
  onNavigate: (id: DepartmentScreenId) => void;
  onOpenSettings: () => void;
}) {
  const panelClass = collapsed ? "sidebar-panel glass-rail" : "sidebar-panel";
  const links = linksForRole(role);

  const statusReadout = (
    <div className="sidebar-status-readout" role="status" aria-label={`Network status ${status}`}>
      <span className={`sidebar-rail-dot status-${status.toLowerCase()}`} aria-hidden="true" />
      <span className="sidebar-status-text">{status}</span>
    </div>
  );

  const footerExtras = (
    <RolePicker
      role={role}
      collapsed={collapsed}
      onRole={onRole}
      onNavigate={onNavigate}
      onOpenSettings={onOpenSettings}
    />
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

        <nav className="sidebar-nav" aria-label="Department">
          {links.map((link) => {
            const active = activeId === link.id;
            const pulse = pulseId === link.id;
            const Icon = ICON_BY_SCREEN[link.id];
            const disabled = !link.ready;
            return (
              <button
                key={link.id}
                type="button"
                title={disabled ? `${link.label} (coming soon)` : link.label}
                className={["sidebar-link", active ? "is-active" : "", pulse ? "is-pulse" : "", disabled ? "is-disabled" : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "true" : undefined}
                aria-label={link.label}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
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
          <div className="sidebar-rail-logo-slot">
            <div className="sidebar-rail-logo" aria-hidden="true">
              <img
                src="/brand/southwest-logo.jpg"
                alt=""
                className="sidebar-rail-logo-img"
                width={160}
                height={32}
              />
            </div>
          </div>
        ) : null}

        {collapsed ? (
          <div className="sidebar-rail-footer">
            {statusReadout}
            {footerExtras}
          </div>
        ) : (
          <div className="sidebar-footer">
            {statusReadout}
            {footerExtras}
          </div>
        )}
      </div>
    </aside>
  );
}