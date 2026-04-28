'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import {
  createComplianceItem,
  transitionStatus,
  type ComplianceItemFormData,
  type ComplianceStatus,
} from '@/app/actions/compliance';
import HelpIcon from '@/components/help/HelpIcon';
import HelpBanner from '@/components/help/HelpBanner';

interface Row {
  id: string;
  name: string;
  status: string;
  nextDue: string | null;
  lastCompletedAt: string | null;
  isRecurring: boolean;
  assetId: string | null;
  assetName: string | null;
  complianceTypeId: string | null;
  complianceTypeName: string | null;
}

interface ComplianceTypeOption {
  id: string;
  name: string;
  defaultLeadDays: number;
  defaultIntervalDays: number | null;
}

interface AssetOption {
  id: string;
  name: string;
}

interface Props {
  rows: Row[];
  types: ComplianceTypeOption[];
  assets: AssetOption[];
}

type StatusFilter = 'all' | 'active' | 'overdue' | 'due_soon' | 'awaiting_approval' | 'completed' | 'cancelled';
type LinkFilter = 'all' | 'asset' | 'trust';

const BLANK_FORM: ComplianceItemFormData = {
  name: '',
  description: '',
  complianceTypeId: '',
  assetId: null,
  isRecurring: false,
  intervalDays: null,
  leadDays: 60,
  nextDue: '',
};

function isOverdue(row: Row): boolean {
  if (!row.nextDue || row.status === 'completed' || row.status === 'cancelled') return false;
  return new Date(row.nextDue).getTime() < Date.now() - 86_400_000;
}

function dueSoon(row: Row): boolean {
  if (!row.nextDue || row.status === 'completed' || row.status === 'cancelled') return false;
  const diff = new Date(row.nextDue).getTime() - Date.now();
  return diff >= 0 && diff <= 30 * 86_400_000;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadge(row: Row) {
  if (row.status === 'cancelled') return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' };
  if (row.status === 'completed') return { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' };
  if (isOverdue(row)) return { label: 'Overdue', cls: 'bg-red-50 text-red-700' };
  if (dueSoon(row)) return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700' };
  return { label: statusLabel(row.status), cls: 'bg-blue-50 text-blue-700' };
}

const NEXT_ACTION: Record<ComplianceStatus, { label: string; target: ComplianceStatus | null }> = {
  pending:           { label: 'Start quoting',    target: 'quoting' },
  quoting:           { label: 'Request approval', target: 'awaiting_approval' },
  awaiting_approval: { label: 'Record approval',  target: null }, // handled in detail page
  approved:          { label: 'Schedule',         target: 'scheduled' },
  scheduled:         { label: 'Mark complete',    target: null }, // handled in detail page (modal)
  completed:         { label: 'View',             target: null },
  cancelled:         { label: 'Reopen',           target: 'pending' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function ComplianceRegisterPanel({ rows, types, assets }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ComplianceItemFormData>(BLANK_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const hay = `${row.name} ${row.assetName ?? ''} ${row.complianceTypeName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (linkFilter === 'asset' && !row.assetId) return false;
      if (linkFilter === 'trust' && row.assetId) return false;

      switch (statusFilter) {
        case 'all': return true;
        case 'active': return row.status !== 'completed' && row.status !== 'cancelled';
        case 'completed': return row.status === 'completed';
        case 'cancelled': return row.status === 'cancelled';
        case 'awaiting_approval': return row.status === 'awaiting_approval';
        case 'overdue': return isOverdue(row);
        case 'due_soon': return dueSoon(row);
      }
    });
  }, [rows, search, statusFilter, linkFilter]);

  function openNew() {
    const firstType = types[0];
    setForm({
      ...BLANK_FORM,
      complianceTypeId: firstType?.id ?? '',
      leadDays: firstType?.defaultLeadDays ?? 60,
      intervalDays: firstType?.defaultIntervalDays ?? null,
      isRecurring: !!firstType?.defaultIntervalDays,
    });
    setError('');
    setShowForm(true);
  }

  function pickType(typeId: string) {
    const t = types.find((tt) => tt.id === typeId);
    setForm((f) => ({
      ...f,
      complianceTypeId: typeId,
      leadDays: t?.defaultLeadDays ?? f.leadDays,
      intervalDays: t?.defaultIntervalDays ?? null,
      isRecurring: !!t?.defaultIntervalDays,
    }));
  }

  async function save() {
    setSaving(true);
    setError('');
    const result = await createComplianceItem(form);
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setShowForm(false);
    router.refresh();
  }

  async function quickAction(row: Row) {
    const action = NEXT_ACTION[row.status as ComplianceStatus];
    if (!action) return;
    if (!action.target) {
      // Detail-page action — navigate
      router.push(`/compliance/${row.id}`);
      return;
    }
    const result = await transitionStatus(row.id, action.target);
    if (!result.success) { alert(result.error); return; }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 inline-flex items-center gap-2">
          Compliance
          <HelpIcon topic="compliance-lifecycle" />
        </h1>
        <button
          type="button"
          onClick={openNew}
          disabled={types.length === 0}
          title="Add a new obligation, like an annual gas safe service"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={15} />
          Add Item
        </button>
      </div>

      <HelpBanner
        topic="compliance-lifecycle"
        text="The Compliance register is where you track every obligation — annual gas safe service, insurance renewal, safeguarding policy review. Each item flows through stages from Pending to Completed. Tap Add Item to start."
      />

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search compliance items"
          placeholder="Search name, asset, type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {(['active', 'overdue', 'due_soon', 'awaiting_approval', 'completed', 'cancelled', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'due_soon' ? 'Due soon' : s === 'awaiting_approval' ? 'Awaiting approval' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['all', 'asset', 'trust'] as LinkFilter[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLinkFilter(l)}
              aria-pressed={linkFilter === l}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                linkFilter === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {l === 'all' ? 'All' : l === 'asset' ? 'Asset-linked' : 'Trust-level'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">
          {filteredRows.length} of {rows.length}
        </span>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-lg p-5 mb-4 shadow-sm">
          <h2 className="text-base font-medium text-slate-900 mb-4">New Compliance Item</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="c-name" className="form-label">Name <span className="text-red-500">*</span></label>
              <input
                id="c-name"
                type="text"
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input"
                placeholder="e.g. Annual Gas Safe Service — Boiler"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="c-type" className="form-label">Type <span className="text-red-500">*</span></label>
              <select
                id="c-type"
                value={form.complianceTypeId}
                onChange={(e) => pickType(e.target.value)}
                className="form-select"
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="c-asset" className="form-label">Linked asset</label>
              <select
                id="c-asset"
                value={form.assetId ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value || null }))}
                className="form-select"
              >
                <option value="">— Trust-level (no asset) —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="c-next-due" className="form-label">Next due</label>
              <input
                id="c-next-due"
                type="date"
                value={form.nextDue ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, nextDue: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="c-lead" className="form-label">Lead days for alerts</label>
              <input
                id="c-lead"
                type="number"
                min={0}
                max={365}
                value={form.leadDays}
                onChange={(e) => setForm((f) => ({ ...f, leadDays: parseInt(e.target.value, 10) || 0 }))}
                className="form-input"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  id="c-recurring"
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
                  className="form-checkbox"
                />
                <label htmlFor="c-recurring" className="text-sm text-slate-700">Recurring obligation</label>
              </div>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  form.isRecurring ? 'grid-expand-open' : 'grid-expand-closed'
                }`}
              >
                <div className="overflow-hidden">
                  <div className={`transition-all duration-300 ${form.isRecurring ? 'pt-3 opacity-100' : 'pt-0 opacity-0'}`}>
                    <label htmlFor="c-interval" className="form-label">Interval (days) <span className="text-red-500">*</span></label>
                    <input
                      id="c-interval"
                      type="number"
                      min={1}
                      value={form.intervalDays ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, intervalDays: parseInt(e.target.value, 10) || null }))}
                      className="form-input max-w-xs"
                      placeholder="e.g. 365 for annual"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="c-desc" className="form-label">Description</label>
              <textarea
                id="c-desc"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="form-textarea"
                placeholder="Optional context — what this obligation covers"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <ShieldCheck size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">
            No compliance items yet. Add your first obligation to start tracking renewals.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus size={15} />
            Add Item
          </button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500">No items match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="hidden sm:table min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Title</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Linked to</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Next due</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const badge = statusBadge(row);
                const action = NEXT_ACTION[row.status as ComplianceStatus];
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/compliance/${row.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-blue-700">
                        <ShieldCheck size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{row.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.assetId && row.assetName ? (
                        <Link href={`/assets/${row.assetId}`} className="text-slate-700 hover:text-blue-700">
                          {row.assetName}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Trust-level</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{row.complianceTypeName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.nextDue)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                        <span className="sr-only">Status: </span>{badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {action && (
                        <button
                          type="button"
                          onClick={() => quickAction(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 border border-blue-200"
                        >
                          {action.label}
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="sm:hidden divide-y divide-slate-100">
            {filteredRows.map((row) => {
              const badge = statusBadge(row);
              return (
                <li key={row.id}>
                  <Link href={`/compliance/${row.id}`} className="flex items-center gap-3 px-4 py-3">
                    <ShieldCheck size={16} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{row.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {row.complianceTypeName ?? '—'} · Next: {formatDate(row.nextDue)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
