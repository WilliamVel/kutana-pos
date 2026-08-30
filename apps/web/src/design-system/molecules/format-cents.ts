/**
 * Formats an integer amount of cents as a dollar string using ONLY integer
 * arithmetic — never `(cents / 100).toFixed(2)`, which routes the value
 * through IEEE-754 float division and can silently misrepresent a cents
 * value (see @kutana/shared `Money`, which enforces integer-cents at the
 * domain boundary for the exact same reason).
 */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`formatCents requires an integer number of cents, received: ${cents}`);
  }

  const isNegative = cents < 0;
  const absoluteCents = Math.abs(cents);
  const dollars = Math.trunc(absoluteCents / 100);
  const remainderCents = absoluteCents % 100;
  const paddedRemainder = remainderCents < 10 ? `0${remainderCents}` : `${remainderCents}`;

  return `${isNegative ? "-" : ""}$${dollars}.${paddedRemainder}`;
}
