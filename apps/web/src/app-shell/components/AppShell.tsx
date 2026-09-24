import type { ReactNode } from "react";
import { Toaster } from "sonner";
import styles from "./AppShell.module.css";

export interface AppShellProps {
  /** Full-width sticky header slot — typically <TopBar />. */
  readonly topBar: ReactNode;
  /** Optional sticky bottom bar slot — typically <ActionBar />. */
  readonly actionBar?: ReactNode;
  /** The active screen. */
  readonly children: ReactNode;
}

/**
 * Purely presentational layout chrome: a CSS-grid application shell with a
 * full-width sticky top bar, a scrollable content area and an optional
 * sticky bottom action bar. Holds no navigation or screen state — callers
 * pass rendered slots in.
 */
export function AppShell({ topBar, actionBar, children }: AppShellProps): JSX.Element {
  return (
    <div className={styles.shell}>
      <Toaster
        position="top-right"
        offset={{
          top: "calc(env(safe-area-inset-top) + 4.75rem)",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
        mobileOffset={{
          top: "calc(env(safe-area-inset-top) + 4.75rem)",
          right: "1rem",
          left: "1rem",
        }}
        duration={4200}
        visibleToasts={2}
        closeButton
        expand={false}
        richColors={false}
        containerAriaLabel="Avisos del POS"
        toastOptions={{
          className: styles.toast,
          closeButtonAriaLabel: "Cerrar aviso",
        }}
      />
      <div className={styles.topbar}>{topBar}</div>
      <main className={styles.content}>{children}</main>
      {actionBar ? <div className={styles.actionbar}>{actionBar}</div> : null}
    </div>
  );
}
