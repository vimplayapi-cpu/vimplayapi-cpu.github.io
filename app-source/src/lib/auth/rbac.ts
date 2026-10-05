/**
 * Role-based access control.
 *
 * Permissions are resolved from the database on every request via the session
 * lookup — never from a cookie, a header, or anything the client can set. The
 * 'super' wildcard is held only by Super Admin.
 */

export const PERMISSIONS = [
  'content.read',
  'content.write',
  'content.publish',
  'content.delete',
  'media.read',
  'media.write',
  'media.delete',
  'leads.read',
  'leads.write',
  'leads.delete',
  'analytics.read',
  'users.read',
  'users.write',
  'settings.write',
  'audit.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'content.read': 'View content',
  'content.write': 'Edit content',
  'content.publish': 'Publish / unpublish content',
  'content.delete': 'Delete content',
  'media.read': 'View media library',
  'media.write': 'Upload and edit media',
  'media.delete': 'Delete media',
  'leads.read': 'View inquiries and demo requests',
  'leads.write': 'Update inquiry status and notes',
  'leads.delete': 'Delete inquiries',
  'analytics.read': 'View analytics',
  'users.read': 'View users',
  'users.write': 'Create and edit users',
  'settings.write': 'Change site settings',
  'audit.read': 'View the audit log',
};

const SUPER = 'super';

export function hasPermission(granted: string[], required: Permission): boolean {
  return granted.includes(SUPER) || granted.includes(required);
}

export function hasAnyPermission(granted: string[], required: Permission[]): boolean {
  return granted.includes(SUPER) || required.some((p) => granted.includes(p));
}

export function isSuperAdmin(granted: string[]): boolean {
  return granted.includes(SUPER);
}

/** Expands a role's stored permission list for display in the admin UI. */
export function describePermissions(granted: string[]): string[] {
  if (isSuperAdmin(granted)) return ['Full access to every area, including user management.'];
  return granted
    .filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p))
    .map((p) => PERMISSION_LABELS[p]);
}
