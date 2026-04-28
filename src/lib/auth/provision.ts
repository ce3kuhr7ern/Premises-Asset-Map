import { auth, currentUser } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { users, memberships, organisations, sites } from '@/db/schema';

export interface ResolvedUser {
  userId: string;          // internal users.id (UUID)
  clerkId: string;
  organisationId: string;
  siteId: string;
  role: string;
}

/**
 * Resolve the current Clerk user to an internal user + active membership.
 *
 * Lazy provisioning — if the user signed in via Clerk but has no internal record yet
 * (e.g. webhook not configured in dev), create one on the fly.
 *
 * Single-site MVP: every new user is granted `trust_admin` on the default org+site.
 * Multi-tenant role assignment will come with the Users Management feature.
 *
 * Returns null if there is no signed-in user.
 */
export async function resolveCurrentUser(): Promise<ResolvedUser | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  // Find or create the internal users row
  let userRow = (await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1))[0];
  if (!userRow) {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
      ?? clerkUser?.emailAddresses?.[0]?.emailAddress
      ?? `${clerkId}@unknown.local`;
    const displayName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || null;

    [userRow] = await db
      .insert(users)
      .values({ clerkId, email, displayName: displayName ?? undefined })
      .returning();
  }

  // Find or create an active membership
  let membership = (
    await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userRow.id), eq(memberships.isActive, true)))
      .limit(1)
  )[0];

  if (!membership) {
    const organisation = (await db.select().from(organisations).limit(1))[0];
    const site = (await db.select().from(sites).limit(1))[0];
    if (!organisation || !site) {
      throw new Error('No organisation or site bootstrapped — run the bootstrap migration first.');
    }

    [membership] = await db
      .insert(memberships)
      .values({
        userId: userRow.id,
        role: 'trust_admin',
        organisationId: organisation.id,
        siteId: site.id,
        isActive: true,
      })
      .returning();
  }

  if (!membership.organisationId || !membership.siteId) {
    throw new Error('Membership exists but is missing organisation_id or site_id.');
  }

  return {
    userId: userRow.id,
    clerkId,
    organisationId: membership.organisationId,
    siteId: membership.siteId,
    role: membership.role as string,
  };
}
