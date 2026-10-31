import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PERMISSIONS, ROLE_PERMISSIONS, TENANT_ROLES, permissionsForRole } from "@/config/permissions";
import { hasPermission } from "@/lib/security/permissions";

describe("role bundles", () => {
  it("defines a bundle for every tenant role using known permissions only", () => {
    for (const role of TENANT_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      for (const p of ROLE_PERMISSIONS[role]) expect(PERMISSIONS[p]).toBe(p);
    }
  });

  it("keeps chefs and cashiers away from finance and settings", () => {
    for (const role of ["CHEF", "CASHIER", "WAITER", "STAFF", "INVENTORY_MANAGER"]) {
      const perms = permissionsForRole(role);
      expect(perms).not.toContain("FINANCIAL_READ");
      expect(perms).not.toContain("FINANCIAL_MANAGE");
      expect(perms).not.toContain("SETTINGS_MANAGE");
      expect(perms).not.toContain("STAFF_MANAGE");
    }
  });

  it("gives only the owner settings control", () => {
    expect(permissionsForRole("OWNER")).toContain("SETTINGS_MANAGE");
    expect(permissionsForRole("MANAGER")).not.toContain("SETTINGS_MANAGE");
  });

  it("returns copies so callers cannot mutate the defaults", () => {
    permissionsForRole("OWNER").push("HACK");
    expect(permissionsForRole("OWNER")).not.toContain("HACK");
  });

  it("returns an empty bundle for unknown roles", () => {
    expect(permissionsForRole("GOD")).toEqual([]);
  });
});

describe("hasPermission", () => {
  it("is strict about names and input types", () => {
    expect(hasPermission(["POS_READ"], "POS_READ")).toBe(true);
    expect(hasPermission(["POS_READ"], "NOPE")).toBe(false);
    expect(hasPermission(undefined, "POS_READ")).toBe(false);
    expect(hasPermission(["constructor"], "constructor")).toBe(false);
  });
});

describe("rules stay in sync with config/permissions.js", () => {
  for (const file of ["firebase/firestore.rules", "firebase/storage.rules"]) {
    it(`${file} only references known permissions`, () => {
      const text = readFileSync(file, "utf8");
      const used = [...text.matchAll(/can\(\s*\w+\s*,\s*'([A-Z_]+)'\s*\)/g)].map((m) => m[1]);
      expect(used.length).toBeGreaterThan(0);
      for (const p of used) expect(PERMISSIONS[p], `${p} in ${file}`).toBe(p);
    });
  }

  it("firestore rules deny by default and never contain an open rule", () => {
    const text = readFileSync("firebase/firestore.rules", "utf8");
    expect(text).not.toMatch(/if\s+true/);
    expect(text).not.toMatch(/match\s+\/\{document=\*\*\}/);
  });

  it("storage rules contain no unconditional writes", () => {
    const text = readFileSync("firebase/storage.rules", "utf8");
    expect(text).not.toMatch(/allow\s+(write|create|update|delete)[^;]*:\s*if\s+true/);
  });
});
