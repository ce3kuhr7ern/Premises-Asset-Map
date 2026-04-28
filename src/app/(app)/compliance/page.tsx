import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { complianceTypes, assets } from '@/db/schema';
import { listComplianceForCurrentOrg } from '@/app/actions/compliance';
import { resolveCurrentUser } from '@/lib/auth/provision';
import ComplianceRegisterPanel from './ComplianceRegisterPanel';

export const metadata = { title: 'Compliance' };

export default async function CompliancePage() {
  const user = await resolveCurrentUser();
  const [rows, types, assetOptions] = await Promise.all([
    listComplianceForCurrentOrg(),
    db
      .select({
        id: complianceTypes.id,
        name: complianceTypes.name,
        defaultLeadDays: complianceTypes.defaultLeadDays,
        defaultIntervalDays: complianceTypes.defaultIntervalDays,
      })
      .from(complianceTypes)
      .orderBy(complianceTypes.name),
    user
      ? db
          .select({ id: assets.id, name: assets.name })
          .from(assets)
          .where(eq(assets.organisationId, user.organisationId))
          .orderBy(assets.name)
      : [],
  ]);

  return <ComplianceRegisterPanel rows={rows} types={types} assets={assetOptions} />;
}
