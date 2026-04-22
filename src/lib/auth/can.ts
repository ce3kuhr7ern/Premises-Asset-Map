import { Permission, ROLE_PERMISSIONS } from './permissions';

// TODO: Replace with actual database query using Drizzle ORM
// Expected return type maps to the memberships schema
async function getMemberships(userId: string): Promise<any[]> {
  console.warn('getMemberships is a mock. Implement real DB fetch.');
  return [];
}

export async function can(
  userId: string,
  permission: Permission,
  context: { siteId?: string; areaId?: string; assetTypeId?: string; docTypeId?: string } = {}
): Promise<boolean> {
  const memberships = await getMemberships(userId);

  return memberships.some(m => {
    if (!m.isActive) return false;
    
    // Check if the role grants the required permission
    const rolePermissions = ROLE_PERMISSIONS[m.role as keyof typeof ROLE_PERMISSIONS];
    if (!rolePermissions?.includes(permission)) return false;

    // trust_admin bypasses all scope restrictions
    if (m.role === 'trust_admin') return true;

    // Scope checks — a null scope in DB means "all within this domain"
    if (context.siteId && m.siteId && m.siteId !== context.siteId) return false;
    if (context.areaId && m.areaId && m.areaId !== context.areaId) return false;
    if (context.assetTypeId && m.assetTypeId && m.assetTypeId !== context.assetTypeId) return false;
    if (context.docTypeId && m.docTypeId && m.docTypeId !== context.docTypeId) return false;

    return true;
  });
}
