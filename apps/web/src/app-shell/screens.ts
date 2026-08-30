/**
 * Single source of truth for the milestone-1 screen list: the id used by
 * the App switcher, the tab label shown in the top bar (unchanged visible
 * text from the pre-shell nav) and the human title shown in the sidebar.
 */
export type ScreenId = "inventory" | "new-product" | "orders" | "register";

export interface ScreenMeta {
  readonly id: ScreenId;
  /** Visible tab text — must stay stable (the E2E specs match on it). */
  readonly tabLabel: string;
  /** Human title for the sidebar. */
  readonly title: string;
}

export const SCREENS: readonly ScreenMeta[] = [
  { id: "inventory", tabLabel: "Inventory", title: "Inventory" },
  { id: "new-product", tabLabel: "Add product", title: "Add product" },
  { id: "orders", tabLabel: "Orders", title: "Orders" },
  { id: "register", tabLabel: "Register", title: "Register" },
];

export function screenTitle(id: ScreenId): string {
  return SCREENS.find((s) => s.id === id)?.title ?? "";
}
