import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assetTypes } from '@/db/schema';
import AssetTypePanel from './AssetTypePanel';

export const metadata = { title: 'Asset Types' };

export default async function AssetTypesPage() {
  const all = await db
    .select()
    .from(assetTypes)
    .orderBy(assetTypes.name);

  const active = all.filter((t) => t.isActive);
  const archived = all.filter((t) => !t.isActive);

  return <AssetTypePanel activeTypes={active} archivedTypes={archived} />;
}
