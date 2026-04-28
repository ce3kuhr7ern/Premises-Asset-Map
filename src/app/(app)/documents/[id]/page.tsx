import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { db } from '@/db';
import { documents, documentTypes, assets, users } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { humanFileSize } from '@/lib/documents/constants';

export const metadata = { title: 'Document' };

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expiryBadge(iso: string | null) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Expired', cls: 'bg-red-50 text-red-700' };
  if (days <= 30) return { label: `Expires in ${days}d`, cls: 'bg-amber-50 text-amber-700' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' };
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await resolveCurrentUser();
  if (!user) notFound();

  const [row] = await db
    .select({
      id: documents.id,
      name: documents.name,
      filename: documents.filename,
      mimeType: documents.mimeType,
      fileSize: documents.fileSize,
      fileUrl: documents.fileUrl,
      expiresAt: documents.expiresAt,
      notes: documents.notes,
      createdAt: documents.createdAt,
      docTypeName: documentTypes.name,
      assetId: documents.assetId,
      assetName: assets.name,
      uploaderName: users.displayName,
      uploaderEmail: users.email,
    })
    .from(documents)
    .leftJoin(documentTypes, eq(documentTypes.id, documents.docTypeId))
    .leftJoin(assets, eq(assets.id, documents.assetId))
    .leftJoin(users, eq(users.id, documents.uploadedBy))
    .where(and(eq(documents.id, id), eq(documents.organisationId, user.organisationId)))
    .limit(1);

  if (!row) notFound();

  const isPdf = row.mimeType === 'application/pdf';
  const isImage = row.mimeType.startsWith('image/');
  const badge = expiryBadge(row.expiresAt);

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/documents" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} />
        Back to documents
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{row.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">{row.docTypeName ?? 'Untyped'}</span>
            {badge && (
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={row.fileUrl}
            download={row.filename}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <Download size={14} />
            Download
          </a>
          <a
            href={row.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <ExternalLink size={14} />
            Open
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preview */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" style={{ minHeight: 480 }}>
            {isPdf ? (
              <iframe
                src={row.fileUrl}
                title={row.name}
                className="w-full h-[640px] border-0"
              />
            ) : isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.fileUrl} alt={row.name} className="w-full h-auto object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <p className="text-sm text-slate-500 mb-3">Preview not available for this file type.</p>
                <a
                  href={row.fileUrl}
                  download={row.filename}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Download size={14} />
                  Download to view
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <Card title="Identity">
            <Field label="Type" value={row.docTypeName} />
            <Field label="Mime type" value={row.mimeType} mono />
            <Field label="Size" value={humanFileSize(row.fileSize)} />
            <Field label="Filename" value={row.filename} mono />
          </Card>

          <Card title="Lifecycle">
            <Field label="Uploaded" value={formatDate(row.createdAt)} />
            <Field label="Uploaded by" value={row.uploaderName ?? row.uploaderEmail ?? '—'} />
            <Field label="Expires" value={formatDate(row.expiresAt)} />
          </Card>

          <Card title="Linked to">
            {row.assetId && row.assetName ? (
              <Link href={`/assets/${row.assetId}`} className="text-sm text-blue-700 hover:text-blue-900 font-medium">
                {row.assetName}
              </Link>
            ) : (
              <p className="text-sm text-slate-500 italic">Trust-level (not linked to an asset)</p>
            )}
          </Card>

          {row.notes && (
            <Card title="Notes">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{row.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-sm text-slate-900 text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
