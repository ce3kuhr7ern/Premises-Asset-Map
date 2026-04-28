import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and, inArray } from 'drizzle-orm';
import { ArrowLeft, ShieldCheck, Calendar, Repeat } from 'lucide-react';
import { db } from '@/db';
import { users, memberships, documentTypes } from '@/db/schema';
import { getComplianceDetail } from '@/app/actions/compliance';
import { resolveCurrentUser } from '@/lib/auth/provision';
import ComplianceDetailActions from './ComplianceDetailActions';
import ComplianceDocumentsCard from './ComplianceDocumentsCard';

export const metadata = { title: 'Compliance Item' };

function formatDate(d: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status: string, nextDue: string | null) {
  if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' };
  if (status === 'completed') return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
  if (nextDue) {
    const diff = new Date(nextDue).getTime() - Date.now();
    if (diff < 0) return { label: 'Overdue', cls: 'bg-red-50 text-red-700' };
    if (diff <= 30 * 86_400_000) return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700' };
  }
  return { label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), cls: 'bg-blue-50 text-blue-700' };
}

export default async function ComplianceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await resolveCurrentUser();
  if (!user) notFound();

  const detail = await getComplianceDetail(id);
  if (!detail) notFound();

  const { item, events, approvals, linkedDocs } = detail;

  // Fetch doc types for the upload modal (used in ComplianceDocumentsCard)
  const docTypes = await db
    .select({ id: documentTypes.id, name: documentTypes.name })
    .from(documentTypes)
    .orderBy(documentTypes.name);

  // Fetch trustees / admins for the approval modal — anyone with an active membership
  // in this org and one of the approval-eligible roles. selectDistinct dedupes
  // when a single user holds multiple memberships in the same org (e.g. admin +
  // a trustee role scoped to an area).
  const eligibleApprovers = await db
    .selectDistinct({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.organisationId, user.organisationId),
        eq(memberships.isActive, true),
        inArray(memberships.role, ['trust_admin', 'trustee']),
      ),
    );

  const badge = statusBadge(item.status, item.nextDue);

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/compliance" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} />
        Back to register
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-blue-100">
            <ShieldCheck size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{item.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-slate-500">{item.complianceTypeName ?? 'Untyped'}</span>
              {item.isRecurring && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Repeat size={11} />
                  Every {item.intervalDays} days
                </span>
              )}
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                <span className="sr-only">Status: </span>{badge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {item.status === 'cancelled' && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-md p-4 mb-4">
          <p>Cancelled {item.cancelledAt ? `on ${formatDate(item.cancelledAt)}` : ''}.</p>
          {item.cancelledReason && <p className="mt-1 text-slate-500">{item.cancelledReason}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="md:col-span-2 space-y-4">
          {/* Lifecycle timeline */}
          <section className="bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Lifecycle</h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">No history yet.</p>
            ) : (
              <ol aria-label="Lifecycle history" className="space-y-2.5">
                {events.map((ev) => (
                  <li key={ev.id} className="flex gap-3 text-sm">
                    <Calendar size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700">
                        {ev.eventType === 'created' && 'Item created'}
                        {ev.eventType === 'status_changed' && (
                          <>
                            Status changed
                            {ev.fromStatus && (
                              <>
                                {' from '}
                                <span className="font-mono text-xs">{ev.fromStatus}</span>
                              </>
                            )}
                            {ev.toStatus && (
                              <>
                                {' to '}
                                <span className="font-mono text-xs">{ev.toStatus}</span>
                              </>
                            )}
                          </>
                        )}
                        {ev.eventType === 'document_linked' && 'Document linked'}
                        {ev.eventType === 'noted' && 'Note added'}
                        {ev.eventType === 'reopened' && 'Reopened'}
                        {ev.eventType === 'rescheduled' && 'Rescheduled'}
                      </p>
                      {ev.payload && 'note' in ev.payload && (
                        <p className="text-xs text-slate-500 mt-0.5">{ev.payload.note}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(ev.recordedAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Approvals */}
          {approvals.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Approvals</h2>
              <ul className="space-y-3">
                {approvals.map((a) => (
                  <li key={a.id} className="text-sm border-l-2 border-blue-200 pl-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        a.decision === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {a.decision.charAt(0).toUpperCase() + a.decision.slice(1)}
                      </span>
                      <span className="text-xs text-slate-500">via {a.channel.replace('_', ' ')}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(a.recordedAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {a.approverUserIds.length} {a.approverUserIds.length === 1 ? 'trustee' : 'trustees'}
                    </p>
                    {a.notes && <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{a.notes}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ComplianceDocumentsCard
            complianceItemId={id}
            complianceItemName={item.name}
            complianceStatus={item.status}
            documents={linkedDocs.map((d) => ({
              id: d.id,
              name: d.name,
              mimeType: d.mimeType,
              fileSize: d.fileSize,
              fileUrl: d.fileUrl,
              createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : (d.createdAt as unknown as string),
            }))}
            docTypes={docTypes}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ComplianceDetailActions
            id={id}
            status={item.status}
            isRecurring={item.isRecurring}
            intervalDays={item.intervalDays}
            eligibleApprovers={eligibleApprovers.map((a) => ({
              id: a.id,
              name: a.displayName ?? a.email,
            }))}
          />

          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Schedule</h2>
            <Field label="Next due" value={formatDate(item.nextDue)} />
            <Field label="Scheduled for" value={formatDate(item.scheduledFor)} />
            <Field label="Last completed" value={formatDate(item.lastCompletedAt)} />
            <Field label="Lead days" value={`${item.leadDays} days`} />
            <Field label="Recurring" value={item.isRecurring ? `Every ${item.intervalDays} days` : 'No (one-off)'} />
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Supplier</h2>
            {item.contractorId && item.contractorName ? (
              <div className="space-y-1">
                <Link href={`/suppliers/${item.contractorId}`} className="text-sm text-blue-700 hover:text-blue-900 font-medium">
                  {item.contractorName}
                </Link>
                {item.contractorContactName && (
                  <p className="text-xs text-slate-500">{item.contractorContactName}</p>
                )}
                {item.contractorEmail && (
                  <a href={`mailto:${item.contractorEmail}`} className="text-xs text-slate-500 hover:text-blue-700 block truncate">
                    {item.contractorEmail}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No supplier assigned yet.</p>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Linked to</h2>
            {item.assetId && item.assetName ? (
              <Link href={`/assets/${item.assetId}`} className="text-sm text-blue-700 hover:text-blue-900 font-medium">
                {item.assetName}
              </Link>
            ) : (
              <p className="text-sm text-slate-500 italic">Trust-level (no asset)</p>
            )}
          </section>

          {item.description && (
            <section className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Description</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 text-right">{value || '—'}</span>
    </div>
  );
}
