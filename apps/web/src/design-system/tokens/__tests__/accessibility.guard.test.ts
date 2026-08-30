import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL as NodeURL } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Load-bearing accessibility guard (v1 scope decision "brand palette"):
 * terracotta (#D65C2B) on beige is ~3.4:1 contrast — acceptable for
 * buttons/accents/large headings, but it fails WCAG AA for normal-size
 * body text (needs 4.5:1). POS screens are read for entire shifts under
 * venue lighting, so this must be enforced by the ABSENCE of the
 * affordance, not by reviewer memory (design.md "Design System Tokens").
 */

const repoRoot = path.resolve(fileURLToPath(new NodeURL("../../../../../../", import.meta.url)));
const designSystemDir = path.join(repoRoot, "apps/web/src/design-system");
const paletteCssPath = path.join(designSystemDir, "tokens/palette.css");

/** Names a body-text-specific terracotta/accent token would plausibly take. */
const FORBIDDEN_BODY_TEXT_TOKEN_NAMES = [
  "--text-terracotta",
  "--text-accent",
  "--body-text-accent",
  "--text-body-terracotta",
];

/** Tokens whose `color:` use marks accent/terracotta text — legitimate only for large headings, never body text. */
const ACCENT_TEXT_TOKENS = ["--accent-emphasis", "--action-primary-bg"];

function listCssFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listCssFilesRecursively(fullPath);
    }
    return entry.name.endsWith(".css") ? [fullPath] : [];
  });
}

describe("design-system accessibility guard: terracotta is never body text", () => {
  it("does not define a body-text terracotta/accent token anywhere in tokens/", () => {
    const paletteSource = fs.readFileSync(paletteCssPath, "utf-8");

    for (const forbiddenName of FORBIDDEN_BODY_TEXT_TOKEN_NAMES) {
      expect(paletteSource).not.toContain(`${forbiddenName}:`);
    }
  });

  it("no atom or molecule stylesheet sets `color` to the accent/terracotta token", () => {
    const atomsAndMolecules = [
      ...listCssFilesRecursively(path.join(designSystemDir, "atoms")),
      ...listCssFilesRecursively(path.join(designSystemDir, "molecules")),
    ];

    const violations: string[] = [];

    for (const filePath of atomsAndMolecules) {
      const source = fs.readFileSync(filePath, "utf-8");
      for (const token of ACCENT_TEXT_TOKENS) {
        // Matches a `color:` declaration specifically — not `background-color`
        // or `border-color` — by requiring the property name to start right
        // after a rule boundary (`{`, `;`, or start-of-line whitespace).
        const colorUsingAccentToken = new RegExp(
          `(?:^|[{;\\s])color\\s*:\\s*var\\(\\s*${token.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
          "m",
        );
        if (colorUsingAccentToken.test(source)) {
          violations.push(`${path.relative(repoRoot, filePath)} sets color: var(${token})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
