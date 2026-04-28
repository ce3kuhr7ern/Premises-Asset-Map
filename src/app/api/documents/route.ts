import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents, documentTypes, assets } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';

export async function GET() {
  const user = await resolveCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });

  const rows = await db
    .select({
      id: documents.id,
      name: documents.name,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      expiresAt: documents.expiresAt,
      assetId: documents.assetId,
      assetName: assets.name,
      docTypeName: documentTypes.name,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(documentTypes, eq(documentTypes.id, documents.docTypeId))
    .leftJoin(assets, eq(assets.id, documents.assetId))
    .where(eq(documents.organisationId, user.organisationId))
    .orderBy(documents.name);

  return NextResponse.json({ success: true, data: rows });
}
