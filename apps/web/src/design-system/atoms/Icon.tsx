export type IconName =
  | "beer"
  | "warning"
  | "check"
  | "close"
  | "receipt"
  | "arrow-right"
  | "arrow-left";

export interface IconProps {
  readonly name: IconName;
  /** When provided, the icon becomes an accessible image with this name; otherwise it is purely decorative. */
  readonly label?: string;
  readonly size?: number;
}

/**
 * Minimal glyph atom. A small inline SVG set is enough for v1 (beer/warning/
 * check/close/receipt); a full icon library is not in scope for this PR.
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
    case "receipt":
      return <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" strokeWidth={2} />;
    case "arrow-right":
      return <path d="M5 12h14m-6-6 6 6-6 6" strokeWidth={2} />;
    case "arrow-left":
      return <path d="M19 12H5m6 6-6-6 6-6" strokeWidth={2} />;
  }
}
