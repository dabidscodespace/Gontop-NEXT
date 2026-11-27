export const PERMISSIONS = {
  "dashboard.view": "View dashboard",
  "orders.view": "View orders",
  "orders.update_status": "Update order status",
  "orders.process": "Process top-ups / fulfillment",
  "refunds.process": "Process refunds",
  "products.manage": "Manage products & variations",
  "categories.manage": "Manage games & categories",
  "banners.manage": "Manage banners",
  "customers.view": "View customers",
  "payments.view": "View payments",
  "wallet.manage": "Manage wallet transactions",
  "reports.view": "View reports",
  "settings.manage": "Manage system settings",
  "staff.manage": "Manage admins & moderators",
  "csv.manage": "Import / export CSV",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const DEFAULT_MODERATOR_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.update_status",
  "orders.process",
];

export function hasPermission(
  admin: { role: string; permissions: string[] } | null | undefined,
  permission: Permission,
) {
  if (!admin) return false;
  if (admin.role === "owner") return true;
  return admin.permissions.includes(permission);
}
