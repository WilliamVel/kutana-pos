export type IconName =
  | "beer"
  | "warning"
  | "check"
  | "close"
  | "trash"
  | "receipt"
  | "arrow-right"
  | "arrow-left"
  | "inventory"
  | "orders"
  | "customers"
  | "debt"
  | "plus"
  | "folder"
  | "split"
  | "cash"
  | "edit"
  | "menu"
  | "chevron-down"
  | "search"
  | "more";

export interface IconProps {
  readonly name: IconName;
  /** When provided, the icon becomes an accessible image with this name; otherwise it is purely decorative. */
  readonly label?: string;
  readonly size?: number;
}

/**
 * Minimal glyph atom. A small inline SVG set is enough for v1 (beer/warning/
 * check/close/trash/receipt); a full icon library is not in scope for this PR.
 * Purely presentational: props in, markup out, no port access.
 */
export function Icon({ name, label, size = 20 }: IconProps): JSX.Element {
  const sharedProps = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      data-icon={name}
      fill="none"
      stroke="currentColor"
      {...sharedProps}
    >
      <IconGlyph name={name} />
    </svg>
  );
}

function IconGlyph({ name }: { name: IconName }): JSX.Element {
  switch (name) {
    case "beer":
      return <path d="M6 8h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z" strokeWidth={2} />;
    case "warning":
      return <path d="M12 3 2 21h20L12 3Zm0 6v5m0 3h.01" strokeWidth={2} />;
    case "check":
      return <path d="m4 12 6 6L20 6" strokeWidth={2} />;
    case "close":
      return <path d="M6 6 18 18M18 6 6 18" strokeWidth={2} />;
    case "trash":
      return (
        <path
          d="M4 7h16m-10 4v6m4-6v6M9 7V4h6v3m-8 0 1 14h8l1-14"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "receipt":
      return <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeWidth={2} />;
    case "arrow-right":
      return <path d="M5 12h14m-6-6 6 6-6 6" strokeWidth={2} />;
    case "arrow-left":
      return <path d="M19 12H5m6 6-6-6 6-6" strokeWidth={2} />;
    case "inventory":
      return (
        <path
          d="M4 7h16M6 7v13h12V7M9 11h6M9 15h4M8 7l1-3h6l1 3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "orders":
      return (
        <path
          d="M7 4h10v16H7V4Zm3 4h4M10 12h4M10 16h2"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "customers":
      return (
        <path
          d="M16 20v-2a4 4 0 0 0-8 0v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6 8v-2a3 3 0 0 0-2-2.8M18 7.5a3 3 0 0 1 0 5"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "debt":
      return (
        <path
          d="M5 6h14v12H5V6Zm0 4h14M8 15h3m4 0h1M8 3v3m8-3v3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "plus":
      return <path d="M12 5v14M5 12h14" strokeWidth={2} strokeLinecap="round" />;
    case "folder":
      return (
        <path
          d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "split":
      return (
        <path
          d="M4 6h5a3 3 0 0 1 3 3v10M4 18h5a3 3 0 0 0 3-3V5m0 7h3a3 3 0 0 1 3 3v1m-2-2 2 2 2-2"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "cash":
      return (
        <path
          d="M3 7h18v10H3V7Zm3 3h.01M18 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "edit":
      return (
        <path
          d="m4 16-.75 4 4-.75L18 8.5 14.5 5 4 16Zm9.5-10.5L17 9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "menu":
      return <path d="M4 7h16M4 12h16M4 17h16" strokeWidth={2} strokeLinecap="round" />;
    case "chevron-down":
      return <path d="m6 9 6 6 6-6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
    case "search":
      return <circle cx="11" cy="11" r="6" strokeWidth={2} />;
    case "more":
      return <path d="M12 6h.01M12 12h.01M12 18h.01" strokeWidth={3} strokeLinecap="round" />;
  }
}
