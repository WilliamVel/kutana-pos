/**
 * Single source of truth for the milestone-1 screen list: the id used by
 * the App switcher and the tab label shown in the top bar (unchanged
 * visible text from the pre-shell nav).
 */
export type ScreenId = "inventory" | "new-product" | "register" | "customers" | "pending-debts";

export interface ScreenMeta {
  readonly id: ScreenId;
  /** Visible tab text — must stay stable (the E2E specs match on it). */
  readonly tabLabel: string;
}

export const SCREENS: readonly ScreenMeta[] = [
  { id: "inventory", tabLabel: "Inventory" },
  { id: "new-product", tabLabel: "Add product" },
  { id: "register", tabLabel: "Register" },
  { id: "customers", tabLabel: "Customers" },
  { id: "pending-debts", tabLabel: "Pending debts" },
];
