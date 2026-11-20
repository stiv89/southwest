import {
  DEFAULT_SCREEN,
  DEPARTMENT_SCREENS,
  SHARED_NAV,
  UTILITY_SCREENS,
  type DepartmentScreenId,
} from "./department-nav";
import { ROLES, type DemoRole } from "./shared-case";

const ROLE_IDS = new Set(ROLES.map((role) => role.id));
const SCREENS_BY_ROLE = new Map<DemoRole, Set<string>>(
  ROLES.map((role) => [
    role.id,
    new Set(DEPARTMENT_SCREENS.filter((screen) => screen.role === role.id).map((screen) => screen.id)),
  ]),
);
const UTILITY_IDS = new Set<string>(UTILITY_SCREENS.map((screen) => screen.id));
const SHARED_IDS = new Set<string>(SHARED_NAV.map((screen) => screen.id));

export function deskPath(role: DemoRole, screen: DepartmentScreenId): string {
  return `/${role}/${screen}`;
}

export function parseDeskPath(pathname: string): { role: DemoRole; screen: DepartmentScreenId } | null {
  const [role, screen] = pathname.split("/").filter(Boolean);
  if (!role || !ROLE_IDS.has(role as DemoRole)) return null;
  const deskRole = role as DemoRole;
  const allowed = SCREENS_BY_ROLE.get(deskRole);
  if (screen && (allowed?.has(screen) || UTILITY_IDS.has(screen) || SHARED_IDS.has(screen))) {
    return { role: deskRole, screen: screen as DepartmentScreenId };
  }
  return { role: deskRole, screen: DEFAULT_SCREEN[deskRole] };
}
