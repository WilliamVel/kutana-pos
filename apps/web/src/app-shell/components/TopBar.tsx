import { SCREENS, type ScreenId } from "../screens.js";
import styles from "./TopBar.module.css";

export interface TopBarProps {
  readonly currentScreen: ScreenId;
  readonly onNavigate: (screen: ScreenId) => void;
}

/**
 * Purely presentational: the KUTANA wordmark plus the screen tabs. The tab
 * buttons keep the exact visible text of the pre-shell <nav> so existing
 * accessible-name lookups (unit + E2E) keep working.
 */
export function TopBar({ currentScreen, onNavigate }: TopBarProps): JSX.Element {
  return (
    <header className={styles.bar}>
      <h1 className={styles.wordmark}>KUTANA POS</h1>
      <nav className={styles.tabs}>
        {SCREENS.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={styles.tab}
            aria-current={screen.id === currentScreen ? "page" : undefined}
            onClick={() => onNavigate(screen.id)}
          >
            {screen.tabLabel}
          </button>
        ))}
      </nav>
    </header>
  );
}
