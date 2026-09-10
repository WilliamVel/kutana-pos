import { useState } from "react";
import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { Icon } from "../../design-system/atoms/Icon.js";
import { screensForRole, type ScreenId } from "../screens.js";
import styles from "./TopBar.module.css";

export interface TopBarProps {
  readonly currentScreen: ScreenId;
  readonly onNavigate: (screen: ScreenId) => void;
  readonly onLogout: () => void;
  readonly onChangePin?: () => void;
  readonly session: AuthSession;
}

/**
 * Main app navigation. Desktop keeps the tab bar visible; small screens expose
 * the same navigation and account actions behind a hamburger button.
 */
export function TopBar({ currentScreen, onNavigate, onLogout, onChangePin = () => undefined, session }: TopBarProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const screens = screensForRole(session.role);
  const initials = initialsFor(session.displayName);
  const roleLabel = session.role === "admin" ? "Administrador" : "Operador";

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
        {screens.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={styles.tab}
            aria-current={screen.id === currentScreen ? "page" : undefined}
            onClick={() => navigate(screen.id)}
          >
            <span className={styles.tabIcon} aria-hidden="true">
              <Icon name={screen.icon} size={18} />
            </span>
            <span className={styles.tabLabel}>{screen.tabLabel}</span>
          </button>
        ))}

        <div className={styles.accountMenu}>
          <button
            type="button"
            className={styles.accountButton}
            aria-expanded={isAccountOpen}
            aria-controls="account-actions"
            onClick={() => setIsAccountOpen((open) => !open)}
          >
            <span className={styles.accountAvatar} aria-hidden="true">
              {initials}
            </span>
            <span className={styles.accountCopy}>
              <span className={styles.accountEyebrow}>Cuenta</span>
              <span className={styles.accountName}>{session.displayName}</span>
            </span>
            <span className={styles.accountChevron} aria-hidden="true">
              ▾
            </span>
          </button>
          {isAccountOpen ? (
            <div id="account-actions" className={styles.accountActions}>
              <div className={styles.accountSummary}>
                <span className={styles.accountAvatarLarge} aria-hidden="true">
                  {initials}
                </span>
                <div>
                  <p className={styles.accountStatus}>Sesión activa</p>
                  <p className={styles.accountHint}>{roleLabel}</p>
                </div>
              </div>
              <button type="button" className={styles.logoutButton} onClick={() => { setIsAccountOpen(false); onChangePin(); }}
                  >
                    Cambiar PIN
                  </button>
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

function initialsFor(displayName: string): string {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
  return initials || "OP";
}
