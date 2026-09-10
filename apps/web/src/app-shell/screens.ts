import type { AuthRole } from "@kutana/shared/auth/model/auth-session.js";
import type { IconName } from "../design-system/atoms/Icon.js";

export type ScreenId =
  | "inventory" | "new-product" | "categories" | "register" | "customers"
  | "pending-debts" | "users" | "analytics";

export interface ScreenMeta {
  readonly id: ScreenId;
  readonly tabLabel: string;
  readonly icon: IconName;
  readonly roles?: readonly AuthRole[];
}

export const SCREENS: readonly ScreenMeta[] = [
  { id: "inventory", tabLabel: "Inventario", icon: "inventory" },
  { id: "register", tabLabel: "Órdenes", icon: "orders" },
  { id: "customers", tabLabel: "Clientes", icon: "customers" },
  { id: "pending-debts", tabLabel: "Cuentas por cobrar", icon: "debt" },
  { id: "users", tabLabel: "Usuarios", icon: "customers", roles: ["admin"] },
  { id: "analytics", tabLabel: "Analítica", icon: "receipt", roles: ["admin"] },
];

export function screensForRole(role: AuthRole): readonly ScreenMeta[] {
  return SCREENS.filter((screen) => !screen.roles || screen.roles.includes(role));
}

export function canAccessScreen(screenId: ScreenId, role: AuthRole): boolean {
  const screen = SCREENS.find((candidate) => candidate.id === screenId);
  return !screen?.roles || screen.roles.includes(role);
}
