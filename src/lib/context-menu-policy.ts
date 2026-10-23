// This is a UI exception, not an authorization check; admin access stays unchanged.
export function allowAdminContextMenu(pathname: string): boolean {
  return pathname.startsWith("/admin/");
}