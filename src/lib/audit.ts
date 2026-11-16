import type { AuditEvent, AuditKind, DemoSnapshot } from "../types/contracts";

export function appendAudit(
  snapshot: DemoSnapshot,
  now: string,
  event: { kind: AuditKind; simulated: boolean; message: string; detail?: string },
): DemoSnapshot {
  const entry: AuditEvent = {
    id: `audit-${snapshot.nextId}`,
    timestamp: now,
    kind: event.kind,
    simulated: event.simulated,
    message: event.message,
    detail: event.detail ?? "",
  };
  return {
    ...snapshot,
    nextId: snapshot.nextId + 1,
    audit: [...snapshot.audit, entry],
  };
}
