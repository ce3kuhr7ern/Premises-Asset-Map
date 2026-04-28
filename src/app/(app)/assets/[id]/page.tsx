import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and, isNull } from 'drizzle-orm';
import { ArrowLeft, MapPin } from 'lucide-react';
import { db } from '@/db';
import { assets, assetTypes, mapAssets, floorPlans, documentTypes } from '@/db/schema';
import { resolveCurrentUser } from '@/lib/auth/provision';
import { ASSET_ICON_META } from '@/lib/icons/asset-icons';
import { listDocumentsForAsset } from '@/app/actions/documents';
import { listComplianceForAsset } from '@/app/actions/compliance';
import AssetDocumentsCard from './AssetDocumentsCard';
import AssetComplianceCard from './AssetComplianceCard';

export const metadata = { title: 'Asset Detail' };

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status: string, nextDue: string | null) {
  if (status === 'archived') return { label: 'Archived', cls: 'bg-slate-100 text-slate-500' };
  if (!nextDue) return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue);
  const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Overdue', cls: 'bg-red-50 text-red-700' };
  if (days <= 30) return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await resolveCurrentUser();
  if (!user) notFound();

  const [row] = await db
    .select({
      id: assets.id,
      name: assets.name,
      serialNumber: assets.serialNumber,
      manufacturer: assets.manufacturer,
      model: assets.model,
      installedAt: assets.installedAt,
      purchasedAt: assets.purchasedAt,
      warrantyExpiresAt: assets.warrantyExpiresAt,
      lastInspectedAt: assets.lastInspectedAt,
      nextInspectionDue: assets.nextInspectionDue,
      status: assets.status,
      archivedAt: assets.archivedAt,
      notes: assets.notes,
      assetTypeId: assets.assetTypeId,
      assetTypeName: assetTypes.name,
      iconKey: assetTypes.iconKey,
      layer: assetTypes.layer,
      inspectionIntervalDays: assetTypes.inspectionIntervalDays,
      requiresCertificate: assetTypes.requiresCertificate,
      certificateType: assetTypes.certificateType,
    })
    .from(assets)
    .leftJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
    .where(and(eq(assets.id, id), eq(assets.organisationId, user.organisationId)))
    .limit(1);

  if (!row) notFound();

  const [placement] = await db
    .select({
      id: mapAssets.id,
      floorPlanId: mapAssets.floorPlanId,
      floorPlanName: floorPlans.name,
    })
    .from(mapAssets)
    .leftJoin(floorPlans, eq(floorPlans.id, mapAssets.floorPlanId))
    .where(and(eq(mapAssets.assetId, id), isNull(mapAssets.removedAt)))
    .limit(1);

  const [linkedDocs, allDocTypes, complianceItems] = await Promise.all([
    listDocumentsForAsset(id),
    db
      .select({ id: documentTypes.id, name: documentTypes.name })
      .from(documentTypes)
      .orderBy(documentTypes.name),
    listComplianceForAsset(id),
  ]);

  const badge = statusBadge(row.status, row.nextInspectionDue);
  const meta = row.iconKey ? ASSET_ICON_META[row.iconKey] : null;

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/assets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} />
        Back to assets
      </Link>

      <div className="flex items-start gap-4 mb-6">
        {meta && (
          <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${meta.svgFile ? 'bg-white border border-slate-200' : meta.bgClass}`}>
            {meta.svgFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.svgFile} alt="" className="w-8 h-8 object-contain" />
            ) : (
              <span className="text-white font-bold">{row.name.charAt(0)}</span>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">{row.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">{row.assetTypeName}</span>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {row.status === 'archived' && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-md p-4 mb-4">
          Archived {row.archivedAt ? `on ${formatDate(row.archivedAt.toString().slice(0, 10))}` : ''}. Restore from the register to edit.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column — identity, lifecycle, compliance */}
        <div className="md:col-span-2 space-y-4">
          <Card title="Identity">
            <Field label="Serial number" value={row.serialNumber} mono />
            <Field label="Manufacturer" value={row.manufacturer} />
            <Field label="Model" value={row.model} />
          </Card>

          <Card title="Lifecycle">
            <Field label="Installed" value={formatDate(row.installedAt)} />
            <Field label="Purchased" value={formatDate(row.purchasedAt)} />
            <Field label="Warranty expires" value={formatDate(row.warrantyExpiresAt)} />
          </Card>

          <Card title="Compliance">
            <Field label="Inspection interval" value={row.inspectionIntervalDays ? `Every ${row.inspectionIntervalDays} days` : '—'} />
            <Field label="Last inspected" value={formatDate(row.lastInspectedAt)} />
            <Field label="Next inspection due" value={formatDate(row.nextInspectionDue)} />
            {row.requiresCertificate && (
              <Field
                label="Certificate required"
                value={row.certificateType ?? 'Yes'}
              />
            )}
          </Card>

          {row.notes && (
            <Card title="Notes">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{row.notes}</p>
            </Card>
          )}
        </div>

        {/* Right column — location, future modules */}
        <div className="space-y-4">
          <Card title="Location">
            {placement ? (
              <>
                <Field label="Floor plan" value={placement.floorPlanName ?? '—'} />
                <Link
                  href={`/map/${placement.floorPlanId}?selected=${placement.id}`}
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-700 font-medium hover:text-blue-900"
                >
                  <MapPin size={14} />
                  View on map
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500">Not placed on a floor plan.</p>
            )}
          </Card>

          <AssetComplianceCard
            assetId={id}
            items={complianceItems.map((c) => ({
              ...c,
              nextDue: c.nextDue,
              lastCompletedAt: c.lastCompletedAt,
            }))}
          />

          <AssetDocumentsCard
            assetId={id}
            assetName={row.name}
            documents={linkedDocs.map((d) => ({
              ...d,
              expiresAt: d.expiresAt,
              createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : (d.createdAt as unknown as string),
            }))}
            docTypes={allDocTypes}
          />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, muted = false }: { title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-lg p-4 ${muted ? 'opacity-70' : ''}`}>
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-sm text-slate-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
