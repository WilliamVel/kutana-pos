import styles from "./SideBar.module.css";

export interface SideBarProps {
  /** Human title of the active screen. */
  readonly screenTitle: string;
}

/**
 * Purely presentational: a light context panel that names the active
 * screen. Deliberately shows nothing else — there is no shift, staff or
 * notification data in milestone 1 to display here.
 */
export function SideBar({ screenTitle }: SideBarProps): JSX.Element {
  return (
    <div className={styles.sidebar}>
      <p className={styles.eyebrow}>Screen</p>
      <p className={styles.title}>{screenTitle}</p>
    </div>
  );
}
