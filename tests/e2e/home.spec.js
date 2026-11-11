import { test, expect } from "@playwright/test";

test("homepage loads without any login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Green Lagoon");
});
