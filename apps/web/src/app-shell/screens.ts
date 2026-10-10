import type { AuthRole } from "@kutana/shared/auth/model/auth-session.js";
import type { IconName } from "../design-system/atoms/Icon.js";

export type ScreenId =
  | "inventory"
  | "new-product"
  | "categories"
  | "register"
  | "customers"
  | "pending-debts"
  | "users"
  | "analytics";

export interface ScreenMeta {
  readonly id: ScreenId;
  readonly path: string;
  readonly tabLabel: string;
  readonly icon: IconName;
  readonly roles?: readonly AuthRole[];
}

export const SCREENS: readonly ScreenMeta[] = [
  { id: "register", path: "/orders", tabLabel: "Órdenes", icon: "orders" },
  { id: "inventory", path: "/inventory", tabLabel: "Inventario", icon: "inventory" },
  { id: "customers", path: "/customers", tabLabel: "Clientes", icon: "customers" },
  {
    id: "pending-debts",
    path: "/pending-debts",
    tabLabel: "Cuentas por cobrar",
    icon: "debt",
  },
  { id: "analytics", path: "/analytics", tabLabel: "Analítica", icon: "receipt", roles: ["admin"] },
  { id: "users", path: "/users", tabLabel: "Usuarios", icon: "customers", roles: ["admin"] },
];

const ROUTES: Readonly<Record<ScreenId, string>> = {
  register: "/orders",
  inventory: "/inventory",
  "new-product": "/products/new",
  categories: "/categories",
  customers: "/customers",
  "pending-debts": "/pending-debts",
  users: "/users",
  analytics: "/analytics",
};

export const screenPath = (screenId: ScreenId): string => ROUTES[screenId];

export function screenFromPath(pathname: string): ScreenId {
  if (pathname === "/") return "register";
  return (
    (Object.entries(ROUTES).find(([, path]) => path === pathname)?.[0] as ScreenId) ?? "register"
  );
}

export function screensForRole(role: AuthRole): readonly ScreenMeta[] {
  return SCREENS.filter((screen) => !screen.roles || screen.roles.includes(role));
}

export function canAccessScreen(screenId: ScreenId, role: AuthRole): boolean {
  const screen = SCREENS.find((candidate) => candidate.id === screenId);
  return !screen?.roles || screen.roles.includes(role);
}
