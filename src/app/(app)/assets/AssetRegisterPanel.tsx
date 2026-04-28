'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pencil, Archive, ArchiveRestore, Trash2, Plus, Check, MapPin } from 'lucide-react';
import {
  createAsset,
  updateAsset,
  archiveAsset,
  restoreAsset,
  deleteAsset,
  type AssetFormData,
} from '@/app/actions/assets';
import { ASSET_ICON_META, LAYERS } from '@/lib/icons/asset-icons';
import HelpIcon from '@/components/help/HelpIcon';
import HelpBanner from '@/components/help/HelpBanner';

interface AssetRow {
  id: string;
  name: string;
  serialNumber: string | null;
  assetTypeId: string;
  assetTypeName: string | null;
  iconKey: string | null;
  layer: string | null;
  status: string;
  installedAt: string | null;
  lastInspectedAt: string | null;
  nextInspectionDue: string | null;
  hasPlacement: boolean;
}

interface AssetTypeOption {
  id: string;
  name: string;
  iconKey: string;
  layer: string;
  inspectionIntervalDays: number | null;
  requiresCertificate: boolean;
  certificateType: string | null;
}

interface Props {
  rows: AssetRow[];
  assetTypes: AssetTypeOption[];
}

type StatusFilter = 'all' | 'active' | 'archived' | 'overdue' | 'due_soon';

const BLANK_FORM: AssetFormData = {
  name: '',
  assetTypeId: '',
  serialNumber: '',
  manufacturer: '',
  model: '',
  installedAt: '',
  purchasedAt: '',
  warrantyExpiresAt: '',
  lastInspectedAt: '',
  notes: '',
};

function statusBadge(row: AssetRow) {
  if (row.status === 'archived') {
    return { label: 'Archived', cls: 'bg-slate-100 text-slate-500' };
  }
  if (!row.nextInspectionDue) {
    return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' };
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(row.nextInspectionDue);
  const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0)  return { label: 'Overdue',  cls: 'bg-red-50 text-red-700' };
  if (days <= 30) return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function IconBadge({ iconKey, name }: { iconKey: string | null; name: string }) {
  const meta = iconKey ? ASSET_ICON_META[iconKey] : null;
  if (!meta) return <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />;
  return (
    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${meta.svgFile ? 'bg-white border border-slate-200' : meta.bgClass}`}>
      {meta.svgFile ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.svgFile} alt="" className="w-5 h-5 object-contain" />
      ) : (
        <span className="text-white text-[10px] font-bold">{name.charAt(0)}</span>
      )}
    </div>
  );
}

export default function AssetRegisterPanel({ rows, assetTypes }: Props) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AssetFormData>(BLANK_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [layerFilter, setLayerFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (layerFilter !== 'all' && row.layer !== layerFilter) return false;
      if (q) {
        const hay = `${row.name} ${row.serialNumber ?? ''} ${row.assetTypeName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (statusFilter === 'all') return true;
      if (statusFilter === 'archived') return row.status === 'archived';
      if (row.status === 'archived') return false;
      if (statusFilter === 'active') return true;

      // 'overdue' and 'due_soon' both require a next_inspection_due date
      if (!row.nextInspectionDue) return false;
      const due = new Date(row.nextInspectionDue);
      const days = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (statusFilter === 'overdue') return days < 0;
      if (statusFilter === 'due_soon') return days >= 0 && days <= 30;
      return true;
    });
  }, [rows, statusFilter, layerFilter, search]);

  function openNew() {
    setForm({ ...BLANK_FORM, assetTypeId: assetTypes[0]?.id ?? '' });
    setError('');
    setEditingId('new');
  }

  function openEdit(row: AssetRow) {
    setForm({
      name: row.name,
      assetTypeId: row.assetTypeId,
      serialNumber: row.serialNumber ?? '',
      manufacturer: '',
      model: '',
      installedAt: row.installedAt ?? '',
      purchasedAt: '',
      warrantyExpiresAt: '',
      lastInspectedAt: row.lastInspectedAt ?? '',
      notes: '',
    });
    setError('');
    setEditingId(row.id);
  }

  function cancel() {
    setEditingId(null);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const result =
      editingId === 'new' ? await createAsset(form) : await updateAsset(editingId!, form);
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setEditingId(null);
  }

  async function handleArchive(id: string) {
    const result = await archiveAsset(id);
    if (!result.success) alert(result.error);
  }

  async function handleRestore(id: string) {
    const result = await restoreAsset(id);
    if (!result.success) alert(result.error);
  }

  async function handleDelete(id: string) {
    const result = await deleteAsset(id);
    if (!result.success) { alert(result.error); return; }
    setConfirmDeleteId(null);
  }

  const isOpen = editingId !== null;
  const selectedType = assetTypes.find((t) => t.id === form.assetTypeId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 inline-flex items-center gap-2">
          Assets
          <HelpIcon topic="adding-an-asset" />
        </h1>
        <button
          type="button"
          onClick={openNew}
          aria-expanded={editingId === 'new'}
          disabled={isOpen || assetTypes.length === 0}
          title="Add a new physical thing the trust owns or is responsible for"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={15} />
          Add Asset
        </button>
      </div>

      <HelpBanner
        topic="adding-an-asset"
        text="Assets are everything physical the trust owns — fire extinguishers, the boiler, fire doors, even the building itself. Place them on the map or just track them in this list."
      />

      {assetTypes.length === 0 && !isOpen && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md p-4 mb-4">
          No active asset types configured. <Link href="/settings/asset-types" className="underline font-medium">Set up asset types first</Link> before adding assets.
        </div>
      )}

      {/* Filter row */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search assets"
          placeholder="Search name, serial, or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input max-w-xs"
        />

        <div className="flex gap-1">
          {(['active', 'overdue', 'due_soon', 'archived', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'due_soon' ? 'Due soon' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setLayerFilter('all')}
            aria-pressed={layerFilter === 'all'}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
              layerFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All layers
          </button>
          {LAYERS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLayerFilter(l.key)}
              aria-pressed={layerFilter === l.key}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                layerFilter === l.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 ml-auto">
          {filteredRows.length} of {rows.length}
        </span>
      </div>

      {/* Inline form */}
      {isOpen && (
        <div className="bg-white border border-blue-200 rounded-lg p-5 mb-4 shadow-sm">
          <h2 className="text-base font-medium text-slate-900 mb-4">
            {editingId === 'new' ? 'New Asset' : 'Edit Asset'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="a-name" className="form-label">Name <span className="text-red-500">*</span></label>
              <input
                id="a-name"
                type="text"
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input"
                placeholder="e.g. Fire Extinguisher — Hall Entrance"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="a-type" className="form-label">Asset type <span className="text-red-500">*</span></label>
              <select
                id="a-type"
                value={form.assetTypeId}
                onChange={(e) => setForm((f) => ({ ...f, assetTypeId: e.target.value }))}
                className="form-select"
              >
                {assetTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedType?.requiresCertificate && (
                <p className="mt-1 text-xs text-amber-700">
                  Requires {selectedType.certificateType ?? 'service'} certificate
                </p>
              )}
            </div>

            <div>
              <label htmlFor="a-serial" className="form-label">Serial number</label>
              <input
                id="a-serial"
                type="text"
                maxLength={100}
                value={form.serialNumber ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                className="form-input"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="a-manu" className="form-label">Manufacturer</label>
              <input
                id="a-manu"
                type="text"
                maxLength={200}
                value={form.manufacturer ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="a-model" className="form-label">Model</label>
              <input
                id="a-model"
                type="text"
                maxLength={200}
                value={form.model ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="a-installed" className="form-label">Installed</label>
              <input
                id="a-installed"
                type="date"
                value={form.installedAt ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, installedAt: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="a-purchased" className="form-label">Purchased</label>
              <input
                id="a-purchased"
                type="date"
                value={form.purchasedAt ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, purchasedAt: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="a-warranty" className="form-label">Warranty expires</label>
              <input
                id="a-warranty"
                type="date"
                value={form.warrantyExpiresAt ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, warrantyExpiresAt: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="a-last-insp" className="form-label">Last inspected</label>
              <input
                id="a-last-insp"
                type="date"
                value={form.lastInspectedAt ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, lastInspectedAt: e.target.value }))}
                className="form-input"
              />
              {selectedType?.inspectionIntervalDays && form.lastInspectedAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Next inspection in {selectedType.inspectionIntervalDays} days
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="a-notes" className="form-label">Notes</label>
              <textarea
                id="a-notes"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="form-textarea"
                placeholder="Optional"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Check size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !isOpen ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500">
            No assets yet. Add your first asset to start tracking compliance.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500">No assets match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Desktop table */}
          <table className="hidden sm:table min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Asset</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Serial</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Installed</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Next due</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const badge = statusBadge(row);
                const archived = row.status === 'archived';
                return (
                  <tr key={row.id} className={editingId === row.id ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <IconBadge iconKey={row.iconKey} name={row.name} />
                        <Link href={`/assets/${row.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                          {row.name}
                        </Link>
                        {row.hasPlacement && <MapPin size={12} className="text-slate-400" aria-label="Placed on map" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{row.assetTypeName ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{row.serialNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.installedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.nextInspectionDue)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                        <span className="sr-only">Status: </span>{badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          disabled={isOpen && editingId !== row.id}
                          aria-label={`Edit ${row.name}`}
                          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <Pencil size={14} />
                        </button>
                        {archived ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(row.id)}
                            aria-label={`Restore ${row.name}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-700"
                          >
                            <ArchiveRestore size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchive(row.id)}
                            aria-label={`Archive ${row.name}`}
                            className="p-1.5 text-slate-400 hover:text-amber-700"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(row.id)}
                          aria-label={`Delete ${row.name}`}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="sm:hidden divide-y divide-slate-100">
            {filteredRows.map((row) => {
              const badge = statusBadge(row);
              return (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <IconBadge iconKey={row.iconKey} name={row.name} />
                  <Link href={`/assets/${row.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{row.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {row.assetTypeName ?? '—'} · Next: {formatDate(row.nextInspectionDue)}
                    </p>
                  </Link>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Delete this asset?</h2>
            <p className="text-sm text-slate-500 mb-5">
              This permanently removes the record and cannot be undone. To hide it without deleting, archive it instead.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
