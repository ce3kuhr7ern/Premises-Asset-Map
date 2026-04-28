import Link from 'next/link';
import { ShieldCheck, Plus } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  status: string;
  nextDue: string | null;
  lastCompletedAt: string | null;
  complianceTypeName: string | null;
}

function statusBadge(status: string, nextDue: string | null) {
  if (status === 'cancelled') return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' };
  if (status === 'completed') return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
  if (nextDue) {
    const diff = new Date(nextDue).getTime() - Date.now();
    if (diff < 0) return { label: 'Overdue', cls: 'bg-red-50 text-red-700' };
    if (diff <= 30 * 86_400_000) return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700' };
  }
  return {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    cls: 'bg-blue-50 text-blue-700',
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AssetComplianceCard({ assetId, items }: { assetId: string; items: Item[] }) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Compliance items</h2>
        <Link
          href={`/compliance?asset=${assetId}`}
          aria-label="View all compliance items for this asset"
          className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium hover:text-blue-900"
        >
          <Plus size={12} />
          Add
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No compliance items linked yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const badge = statusBadge(item.status, item.nextDue);
            return (
              <li key={item.id} className="py-2 flex items-center gap-2">
                <ShieldCheck size={14} className="text-slate-400 shrink-0" />
                <Link
                  href={`/compliance/${item.id}`}
                  className="flex-1 min-w-0 text-sm text-slate-900 hover:text-blue-700 truncate"
                >
                  {item.name}
                </Link>
                <span className="text-xs text-slate-500 shrink-0">{formatDate(item.nextDue)}</span>
                <span className={`shrink-0 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.cls}`}>
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
