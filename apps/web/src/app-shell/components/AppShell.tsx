import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

export interface AppShellProps {
  /** Full-width sticky header slot — typically <TopBar />. */
  readonly topBar: ReactNode;
  /** Left panel slot — typically <SideBar />. */
  readonly sidebar: ReactNode;
  /** Optional sticky bottom bar slot — typically <ActionBar />. */
  readonly actionBar?: ReactNode;
  /** The active screen. */
  readonly children: ReactNode;
}

/**
 * Purely presentational layout chrome: a CSS-grid application shell with a
 * full-width top bar, a light sidebar, a scrollable content area and an
 * optional sticky bottom action bar. Holds no navigation or screen state —
 * callers pass rendered slots in.
 */
export function AppShell({ topBar, sidebar, actionBar, children }: AppShellProps): JSX.Element {
  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>{topBar}</div>
      <div className={styles.sidebar}>{sidebar}</div>
      <main className={styles.content}>{children}</main>
      {actionBar ? <div className={styles.actionbar}>{actionBar}</div> : null}
    </div>
  );
}
