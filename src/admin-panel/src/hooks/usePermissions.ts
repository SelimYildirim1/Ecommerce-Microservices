"use client";

import { useEffect, useMemo, useState } from "react";
import { getToken, parseUser, type AdminUser, STAFF_ROLES } from "@/lib/auth";

export type PermissionKey =
  | "dashboard"
  | "catalog"
  | "blog"
  | "content"
  | "orders"
  | "returns"
  | "promotions"
  | "shipping"
  | "customers"
  | "users"
  | "stock"
  | "currencies"
  | "reports"
  | "cms"
  | "settings"
  | "audit";

/** Rol bazli menu / aksiyon eslemesi. Admin her seye erisir. */
const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  Admin: [
    "dashboard",
    "catalog",
    "blog",
    "content",
    "orders",
    "returns",
    "promotions",
    "shipping",
    "customers",
    "users",
    "stock",
    "currencies",
    "reports",
    "cms",
    "settings",
    "audit",
  ],
  Editor: ["dashboard", "catalog", "blog", "content", "cms", "currencies"],
  Support: ["dashboard", "orders", "returns", "customers", "shipping"],
  Warehouse: ["dashboard", "stock", "orders"],
};

export function permissionsForRoles(roles: string[]): Set<PermissionKey> {
  const set = new Set<PermissionKey>();
  for (const role of roles) {
    const keys = ROLE_PERMISSIONS[role];
    if (keys) keys.forEach((k) => set.add(k));
  }
  return set;
}

export function usePermissions() {
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) setUser(parseUser(token));
  }, []);

  const roles = user?.roles ?? [];
  const permissions = useMemo(() => permissionsForRoles(roles), [roles]);

  const has = (key: PermissionKey) => permissions.has(key);
  const hasAny = (...keys: PermissionKey[]) => keys.some((k) => permissions.has(k));
  const hasRole = (...wanted: string[]) => roles.some((r) => wanted.includes(r));

  return {
    user,
    roles,
    permissions,
    isAdmin: roles.includes("Admin"),
    isStaff: roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r)),
    has,
    hasAny,
    hasRole,
    canManageUsers: roles.includes("Admin"),
    canViewAudit: roles.includes("Admin"),
    canEditCatalog: hasRole("Admin", "Editor"),
    canManageOrders: hasRole("Admin", "Support", "Warehouse"),
    canManageStock: hasRole("Admin", "Warehouse"),
  };
}
