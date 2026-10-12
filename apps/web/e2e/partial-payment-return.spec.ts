import { expect, test } from "@playwright/test";
import {
  expectMainOrderView,
  installStatefulPaymentFixture,
  paymentFixtureTable,
} from "./fixtures/stateful-payment-fixture.js";

test("returns to the open order after paying products from an existing split", async ({ page }) => {
  await installStatefulPaymentFixture(page);
  await page.goto("/");

  await page.locator(`[data-table-id="${paymentFixtureTable.id}"]`).click();
  await expectMainOrderView(page);

  // Create/open the account-splitting flow first.
  await page.getByRole("button", { name: "Dividir cuenta" }).click();
  await page.getByRole("menuitem", { name: "Partes iguales" }).click();
  await expect(page.getByRole("heading", { name: /Cuentas personales/ })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar división de cuenta" }).click();
  await expectMainOrderView(page);

  // Then collect a product through the dedicated product-payment flow.
  await page.getByRole("button", { name: "Dividir cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cobrar productos" }).click();
  const selection = page.locator('[aria-label="Seleccionar productos para cobrar"]');
  await expect(selection).toBeVisible();
  await selection.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Revisar y cobrar" }).click();
  await page.getByRole("button", { name: /Cobrar \$/ }).click();

  await expect(page.getByRole("heading", { name: "Cobrar orden" })).toBeVisible();
  await page.getByRole("radio", { name: "Pago QR" }).click();
  await page.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }).click();
  await page.getByRole("button", { name: /Registrar pago ·/ }).click();

  await expectMainOrderView(page);
  const orderCard = page.locator(`[data-table-id="${paymentFixtureTable.id}"]`);
  await expect(orderCard).toBeVisible();
  await expect(orderCard).toContainText("$11.20");
});
