import { expect, test } from "@playwright/test";

/**
 * The milestone-1 exit scenario (design.md "Testing Strategy" / tasks.md
 * 11.6): split a table's bill into two tickets and pay each independently,
 * end-to-end through the real UI, against the mock-adapter production
 * build — no `apps/api` involvement.
 *
 * Seeded order for Table 1: 2x KUTANA Pilsener 500ml (784 cents w/ tax) +
 * 1 Loaded Nachos (728 cents w/ tax) = 1512 cents total.
 */
test("splits Table 1's bill into two tickets and pays each independently", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KUTANA POS" })).toBeVisible();

  // --- Navigate to the Register screen, pick Table 1, enter split-bill mode ---
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByRole("button", { name: /Table 1/ }).click();
  await page.getByRole("button", { name: "Manage splits" }).click();

  const originalBill = page.getByRole("region", { name: "Original Bill" });
  const newBill = page.getByRole("region", { name: "New Bill" });

  await expect(originalBill).toContainText("$15.12");
  await expect(newBill).toContainText("$0.00");
  await expect(newBill).toContainText("No items moved yet.");

  // --- Move the Pilsener line item to the New Bill ---
  await originalBill.getByRole("button", { name: "Move to New Bill" }).first().click();

  // Cent conservation: 728 (Nachos) + 784 (Pilsener) still sums to 1512.
  await expect(originalBill).toContainText("$7.28");
  await expect(newBill).toContainText("$7.84");
  await expect(newBill).not.toContainText("No items moved yet.");

  // --- Pay the New Bill (Pilsener ticket) independently ---
  await page.getByRole("button", { name: "Pay New Bill" }).click();
  await expect(page.getByRole("radio", { name: "Cash" })).toBeVisible();
  await expect(page.getByText("KUTANA Pilsener 500ml")).toBeVisible();
  await expect(page.getByText("Loaded Nachos")).not.toBeVisible();

  await page.getByRole("radio", { name: "QR Payment" }).click();
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByText("$0.00").first()).toBeVisible();

  // --- Go back to split-bill mode and pay the Original Bill (Nachos ticket) independently ---
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByRole("button", { name: /Table 1/ }).click();
  await page.getByRole("button", { name: "Manage splits" }).click();
  await expect(page.getByRole("region", { name: "Original Bill" })).toContainText("$7.28");

  await page.getByRole("button", { name: "Pay Original Bill" }).click();
  await expect(page.getByRole("radio", { name: "Cash" })).toBeVisible();
  await expect(page.getByText("Loaded Nachos")).toBeVisible();
  await expect(page.getByText("KUTANA Pilsener 500ml")).not.toBeVisible();

  await page.getByRole("radio", { name: "Bank Transfer" }).click();
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByText("$0.00").first()).toBeVisible();
});

test("shows a non-technical conflict banner on a forced conflict and lets the server retry the move", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByRole("button", { name: /Table 1/ }).click();
  await page.getByRole("button", { name: "Manage splits" }).click();

  await expect(page.getByRole("region", { name: "Original Bill" })).toContainText("$15.12");

  await page.getByRole("button", { name: "Force conflict (demo)" }).click();
  await page
    .getByRole("region", { name: "Original Bill" })
    .getByRole("button", { name: "Move to New Bill" })
    .first()
    .click();

  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(/this bill changed/i);
  await expect(banner).not.toContainText(/409|ConflictError|stack|Error:/i);

  await page.getByRole("button", { name: "Got it — try again" }).click();
  await page
    .getByRole("region", { name: "Original Bill" })
    .getByRole("button", { name: "Move to New Bill" })
    .first()
    .click();
  await expect(page.getByRole("region", { name: "New Bill" })).not.toContainText(
    "No items moved yet.",
  );
});
