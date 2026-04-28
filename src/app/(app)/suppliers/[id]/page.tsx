import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Wrench, Mail, Phone, ExternalLink, MapPin, ShieldCheck, FileText } from 'lucide-react';
import { getContractorDetail } from '@/app/actions/suppliers';
import { humanFileSize } from '@/lib/documents/constants';

export const metadata = { title: 'Supplier Detail' };

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function complianceStatusBadge(status: string, nextDue: string | null) {
  if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' };
  if (status === 'completed') return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
  if (nextDue) {
    const diff = new Date(nextDue).getTime() - Date.now();
    if (diff < 0) return { label: 'Overdue', cls: 'bg-red-50 text-red-700' };
    if (diff <= 30 * 86_400_000) return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700' };
  }
  return { label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), cls: 'bg-blue-50 text-blue-700' };
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getContractorDetail(id);
  if (!detail) notFound();

  const { contractor, categories, workHistory, recentDocs } = detail;
  const archived = contractor.status === 'archived';

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/suppliers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3">
        <ArrowLeft size={14} />
        Back to suppliers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-blue-100">
            <Wrench size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{contractor.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {categories.map((c) => (
                <span key={c.id} className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
                  {c.name}
                </span>
              ))}
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                archived ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <span className="sr-only">Status: </span>{archived ? 'Archived' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {archived && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-md p-4 mb-4">
          Archived {contractor.archivedAt ? `on ${formatDate(contractor.archivedAt)}` : ''}.
          Archived suppliers don&apos;t appear in the Schedule typeahead but their history remains visible.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="md:col-span-2 space-y-4">
          <section className="bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Contact</h2>
            <div className="space-y-2">
              <Field label="Contact name" value={contractor.contactName} />
              <Field
                label="Email"
                value={contractor.email}
                renderValue={(v) => (
                  <a href={`mailto:${v}`} className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900">
                    <Mail size={12} /> {v}
                  </a>
                )}
              />
              <Field
                label="Phone"
                value={contractor.phone}
                renderValue={(v) => (
                  <a href={`tel:${v}`} className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900">
                    <Phone size={12} /> {v}
                  </a>
                )}
              />
              <Field
                label="Website"
                value={contractor.website}
                renderValue={(v) => (
                  <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900">
                    <ExternalLink size={12} /> {v.replace(/^https?:\/\//, '')}
                  </a>
                )}
              />
              <Field
                label="Address"
                value={contractor.address}
                renderValue={(v) => (
                  <span className="inline-flex items-start gap-1 text-slate-700 whitespace-pre-line">
                    <MapPin size={12} className="mt-0.5 shrink-0" /> {v}
                  </span>
                )}
              />
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-4">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Work history</h2>
            {workHistory.length === 0 ? (
              <p className="text-xs text-slate-400">No compliance items linked yet. Schedule one from the Compliance register.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {workHistory.map((w) => {
                  const badge = complianceStatusBadge(w.status, w.nextDue);
                  return (
                    <li key={w.id} className="py-2 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-slate-400 shrink-0" />
                      <Link href={`/compliance/${w.id}`} className="flex-1 min-w-0 text-sm text-slate-900 hover:text-blue-700 truncate">
                        {w.name}
                      </Link>
                      {w.assetName && (
                        <span className="text-xs text-slate-500 shrink-0 truncate max-w-[160px]">{w.assetName}</span>
                      )}
                      <span className="text-xs text-slate-500 shrink-0">
                        {w.lastCompletedAt ? formatDate(w.lastCompletedAt) : w.scheduledFor ? formatDate(w.scheduledFor) : '—'}
                      </span>
                      <span className={`shrink-0 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {recentDocs.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Recent documents</h2>
              <ul className="divide-y divide-slate-100">
                {recentDocs.map((doc) => (
                  <li key={doc.id} className="py-2 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400 shrink-0" />
                    <Link href={`/documents/${doc.id}`} className="flex-1 min-w-0 text-sm text-slate-900 hover:text-blue-700 truncate">
                      {doc.name}
                    </Link>
                    <span className="text-xs text-slate-400 shrink-0">{humanFileSize(doc.fileSize)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {contractor.notes && (
            <section className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Notes</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{contractor.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  renderValue,
}: {
  label: string;
  value: string | null;
  renderValue?: (v: string) => React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 text-right max-w-[60%] break-words">
        {value ? (renderValue ? renderValue(value) : value) : <span className="text-slate-400">—</span>}
      </span>
    </div>
  );
}
