import { useEffect, useRef, useState } from "react";
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

const PRIMARY_SCREEN_IDS: readonly ScreenId[] = [
  "register",
  "inventory",
  "customers",
  "pending-debts",
];

/** Main navigation. It keeps the POS/register workspace first and preserves role filtering. */
export function TopBar({
  currentScreen,
  onNavigate,
  onLogout,
  onChangePin = () => undefined,
  session,
}: TopBarProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const screens = screensForRole(session.role);
  const primaryScreens = screens.filter((screen) => PRIMARY_SCREEN_IDS.includes(screen.id));
  const moreScreens = screens.filter(
    (screen) => !PRIMARY_SCREEN_IDS.includes(screen.id) && screen.id !== "users",
  );
  const initials = initialsFor(session.displayName);
  const roleLabel = session.role === "admin" ? "Administrador" : "Operador";
  const isMoreActive = moreScreens.some((screen) => screen.id === currentScreen);

  useEffect(() => {
    if (!isMoreOpen && !isAccountOpen && !isMenuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (isAccountOpen) {
        setIsAccountOpen(false);
        accountButtonRef.current?.focus();
      } else if (isMoreOpen) {
        setIsMoreOpen(false);
        moreButtonRef.current?.focus();
      } else {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isAccountOpen, isMenuOpen, isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen && !isAccountOpen) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moreMenuRef.current?.contains(target) || accountMenuRef.current?.contains(target)) return;
      setIsMoreOpen(false);
      setIsAccountOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isAccountOpen, isMoreOpen]);

  const navigate = (screen: ScreenId): void => {
    onNavigate(screen);
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsAccountOpen(false);
  };

  const logout = (): void => {
    setIsAccountOpen(false);
    setIsMenuOpen(false);
    onLogout();
  };

  const navButton = (screen: (typeof screens)[number]): JSX.Element => (
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
  );

  return (
    <header className={styles.bar}>
      <div className={styles.brandRow}>
        <h1 className={styles.wordmark}>
          <img className={styles.logo} src="/LOGOkutana.svg" alt="KUTANA" />
        </h1>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label={isMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          aria-controls="main-navigation"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <Icon name="menu" size={21} />
        </button>
      </div>

      <nav
        id="main-navigation"
        className={`${styles.tabs} ${isMenuOpen ? styles.tabsOpen : ""}`}
        aria-label="Navegación principal"
      >
        <div className={styles.navigationItems}>
          {primaryScreens.map(navButton)}
          {moreScreens.length > 0 ? (
            <div ref={moreMenuRef} className={styles.dropdown}>
              <button
                ref={moreButtonRef}
                type="button"
                className={`${styles.tab} ${isMoreOpen ? styles.openButton : ""} ${isMoreActive ? styles.activeMenuButton : ""}`}
                aria-current={isMoreActive ? "page" : undefined}
                aria-expanded={isMoreOpen}
                aria-controls="more-navigation"
                onClick={() => {
                  setIsMoreOpen((open) => !open);
                  setIsAccountOpen(false);
                }}
              >
                <span className={styles.tabIcon} aria-hidden="true">
                  <Icon name="receipt" size={18} />
                </span>
                <span className={styles.tabLabel}>Más</span>
                <Icon name="chevron-down" size={15} />
              </button>
              {isMoreOpen ? (
                <div id="more-navigation" className={styles.dropdownMenu}>
                  {moreScreens.map(navButton)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div ref={accountMenuRef} className={styles.accountMenu}>
          <button
            ref={accountButtonRef}
            type="button"
            className={`${styles.accountButton} ${isAccountOpen ? styles.openButton : ""}`}
            aria-label={`Cuenta ${session.displayName}`}
            aria-expanded={isAccountOpen}
            aria-controls="account-actions"
            onClick={() => {
              setIsAccountOpen((open) => !open);
              setIsMoreOpen(false);
            }}
          >
            <span className={styles.accountAvatar} aria-hidden="true">
              {initials}
            </span>
            <span className={styles.accountCopy}>
              <span className={styles.accountName}>{session.displayName}</span>
              <span className={styles.accountRole}>{roleLabel}</span>
            </span>
            <Icon name="chevron-down" size={16} />
          </button>
          {isAccountOpen ? (
            <div id="account-actions" className={styles.accountActions}>
              <div className={styles.accountSummary}>
                <span className={styles.accountSummaryName}>{session.displayName}</span>
                <span className={styles.accountHint}>Sesión activa · {roleLabel}</span>
              </div>
              {session.role === "admin" ? (
                <button
                  type="button"
                  className={styles.menuAction}
                  aria-current={currentScreen === "users" ? "page" : undefined}
                  onClick={() => navigate("users")}
                >
                  <Icon name="customers" size={17} /> Usuarios
                </button>
              ) : null}
              <button
                type="button"
                className={styles.menuAction}
                onClick={() => {
                  setIsAccountOpen(false);
                  onChangePin();
                }}
              >
                Cambiar PIN
              </button>
              <button
                type="button"
                className={`${styles.menuAction} ${styles.logoutButton}`}
                onClick={logout}
              >
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
  return (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "OP"
  );
}
