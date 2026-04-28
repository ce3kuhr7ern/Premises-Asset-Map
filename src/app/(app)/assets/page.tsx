import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assetTypes } from '@/db/schema';
import { listAssetsForCurrentOrg } from '@/app/actions/assets';
import AssetRegisterPanel from './AssetRegisterPanel';

export const metadata = { title: 'Assets' };

export default async function AssetsPage() {
  const [rows, types] = await Promise.all([
    listAssetsForCurrentOrg(),
    db
      .select({
        id: assetTypes.id,
        name: assetTypes.name,
        iconKey: assetTypes.iconKey,
        layer: assetTypes.layer,
        inspectionIntervalDays: assetTypes.inspectionIntervalDays,
        requiresCertificate: assetTypes.requiresCertificate,
        certificateType: assetTypes.certificateType,
      })
      .from(assetTypes)
      .where(eq(assetTypes.isActive, true))
      .orderBy(assetTypes.name),
  ]);

  return <AssetRegisterPanel rows={rows} assetTypes={types} />;
}
