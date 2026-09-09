import type { IconName } from "../design-system/atoms/Icon.js";

/** App screens: some are primary navigation items, others are reached from inside a screen. */
export type ScreenId =
  "inventory" | "new-product" | "categories" | "register" | "customers" | "pending-debts";

export interface ScreenMeta {
  readonly id: ScreenId;
  readonly tabLabel: string;
  readonly icon: IconName;
}

export const SCREENS: readonly ScreenMeta[] = [
  { id: "inventory", tabLabel: "Inventario", icon: "inventory" },
  { id: "register", tabLabel: "Órdenes", icon: "orders" },
  { id: "customers", tabLabel: "Clientes", icon: "customers" },
  { id: "pending-debts", tabLabel: "Cuentas por cobrar", icon: "debt" },
];
