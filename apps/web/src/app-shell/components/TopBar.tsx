import { useState } from "react";
import { SCREENS, type ScreenId } from "../screens.js";
import styles from "./TopBar.module.css";

export interface TopBarProps {
  readonly currentScreen: ScreenId;
  readonly onNavigate: (screen: ScreenId) => void;
  readonly onLogout: () => void;
}

/**
 * Main app navigation. Desktop keeps the tab bar visible; small screens expose
 * the same navigation and account actions behind a hamburger button.
 */
export function TopBar({ currentScreen, onNavigate, onLogout }: TopBarProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const navigate = (screen: ScreenId): void => {
    onNavigate(screen);
    setIsMenuOpen(false);
  };

  const logout = (): void => {
    setIsAccountOpen(false);
    setIsMenuOpen(false);
    onLogout();
  };

  return (
    <header className={styles.bar}>
      <div className={styles.brandRow}>
        <h1 className={styles.wordmark}>
          <img className={styles.logo} src="/LOGOkutana.svg" alt="KUTANA" />
        </h1>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Abrir menú de navegación"
          aria-controls="main-navigation"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      <nav id="main-navigation" className={`${styles.tabs} ${isMenuOpen ? styles.tabsOpen : ""}`}>
        {SCREENS.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={styles.tab}
            aria-current={screen.id === currentScreen ? "page" : undefined}
            onClick={() => navigate(screen.id)}
          >
            {screen.tabLabel}
          </button>
        ))}

        <div className={styles.accountMenu}>
          <button
            type="button"
            className={styles.accountButton}
            aria-expanded={isAccountOpen}
            onClick={() => setIsAccountOpen((open) => !open)}
          >
            Cuenta
          </button>
          {isAccountOpen ? (
            <div className={styles.accountActions}>
              <button type="button" className={styles.logoutButton} onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
