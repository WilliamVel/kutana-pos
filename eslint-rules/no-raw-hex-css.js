// @ts-check

/**
 * Custom `@eslint/css`-language rule: bans raw hex color literals
 * (`#fff`, `#F5F0E1`, ...) in CSS. Used only for `apps/web/src/**\/*.css`
 * files outside `design-system/tokens/`, mirroring the equivalent
 * `no-restricted-syntax` guard already applied to `.ts`/`.tsx` files (core
 * ESLint rules do not run against the `css/css` language, so this rule
 * exists to cover the CSS half of the same guard).
 *
 * @type {import("@eslint/css").CSSRuleDefinition}
 */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw hex color literals outside design-system/tokens/.",
    },
    messages: {
      rawHex:
        "Raw hex colors are only allowed in design-system/tokens/. Use a role-named token (var(--...)) instead.",
    },
  },
  create(context) {
    return {
      Hash(node) {
        context.report({ node, messageId: "rawHex" });
      },
    };
  },
};
