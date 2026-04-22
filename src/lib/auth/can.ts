import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { memberships, users } from '@/db/schema';
import { Permission, ROLE_PERMISSIONS } from './permissions';

interface CanContext {
  siteId?: string;
  areaId?: string;
  assetTypeId?: string;
  docTypeId?: string;
}

async function getActiveMemberships(userId: string) {
  return db
    .select()
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.isActive, true),
        eq(users.isActive, true),
      ),
    );
}

export async function can(
  userId: string,
  permission: Permission,
  context: CanContext = {},
): Promise<boolean> {
  const rows = await getActiveMemberships(userId);

  return rows.some(({ memberships: m }: { memberships: typeof memberships.$inferSelect; users: typeof users.$inferSelect }) => {
    const rolePermissions = ROLE_PERMISSIONS[m.role as keyof typeof ROLE_PERMISSIONS];
    if (!rolePermissions?.includes(permission)) return false;

    if (m.role === 'trust_admin') return true;

    if (context.siteId && m.siteId && m.siteId !== context.siteId) return false;
    if (context.areaId && m.areaId && m.areaId !== context.areaId) return false;
    if (context.assetTypeId && m.assetTypeId && m.assetTypeId !== context.assetTypeId) return false;
    if (context.docTypeId && m.docTypeId && m.docTypeId !== context.docTypeId) return false;

    return true;
  });
}
