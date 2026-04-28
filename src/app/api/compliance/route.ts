import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { complianceItems, complianceTypes, assets } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';

export async function GET() {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const rows = await db
    .select({
      id: complianceItems.id,
      name: complianceItems.name,
      status: complianceItems.status,
      nextDue: complianceItems.nextDue,
      assetName: assets.name,
      complianceTypeName: complianceTypes.name,
    })
    .from(complianceItems)
    .leftJoin(assets, eq(assets.id, complianceItems.assetId))
    .leftJoin(complianceTypes, eq(complianceTypes.id, complianceItems.complianceTypeId))
    .where(
      and(
        eq(complianceItems.organisationId, user.organisationId),
        sql`${complianceItems.status} NOT IN ('completed', 'cancelled')`,
      ),
    )
    .orderBy(sql`${complianceItems.nextDue} ASC NULLS LAST`);

  return NextResponse.json({ success: true, data: rows });
}
