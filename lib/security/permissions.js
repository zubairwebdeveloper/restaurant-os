import { PERMISSIONS } from "@/config/permissions";

export { PERMISSIONS, permissionsForRole } from "@/config/permissions";

/** True only for a known permission string present in the list. */
export function hasPermission(permissions, permission) {
  return (
    Object.hasOwn(PERMISSIONS, permission) &&
    Array.isArray(permissions) &&
    permissions.includes(permission)
  );
}
