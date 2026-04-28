import { db } from '@/db';
import { documentTypes, assets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { listDocumentsForCurrentOrg } from '@/app/actions/documents';
import { resolveCurrentUser } from '@/lib/auth/provision';
import DocumentVaultPanel from './DocumentVaultPanel';

export const metadata = { title: 'Documents' };

export default async function DocumentsPage() {
  const user = await resolveCurrentUser();
  const [rows, types, assetOptions] = await Promise.all([
    listDocumentsForCurrentOrg(),
    db.select({ id: documentTypes.id, name: documentTypes.name }).from(documentTypes).orderBy(documentTypes.name),
    user
      ? db
          .select({ id: assets.id, name: assets.name })
          .from(assets)
          .where(eq(assets.organisationId, user.organisationId))
          .orderBy(assets.name)
      : [],
  ]);

  return <DocumentVaultPanel rows={rows} docTypes={types} assets={assetOptions} />;
}
