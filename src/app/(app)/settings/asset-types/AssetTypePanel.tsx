'use client';

import { useState } from 'react';
import { Pencil, ArchiveRestore, Archive, Plus, X, Check } from 'lucide-react';
import {
  createAssetType,
  updateAssetType,
  archiveAssetType,
  restoreAssetType,
  type AssetTypeFormData,
} from '@/app/actions/asset-types';
import { ASSET_ICON_META, LAYERS } from '@/lib/icons/asset-icons';
import type { InferSelectModel } from 'drizzle-orm';
import type { assetTypes } from '@/db/schema';
import HelpIcon from '@/components/help/HelpIcon';
import HelpBanner from '@/components/help/HelpBanner';

type AssetType = InferSelectModel<typeof assetTypes>;

interface Props {
  activeTypes: AssetType[];
  archivedTypes: AssetType[];
}

const BLANK_FORM: AssetTypeFormData = {
  name: '',
  iconKey: 'iso7010-f001',
  layer: 'fire-safety',
  inspectionIntervalDays: null,
  requiresCertificate: false,
  certificateType: '',
  notes: '',
};

export default function AssetTypePanel({ activeTypes, archivedTypes }: Props) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<AssetTypeFormData>(BLANK_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  function openNew() {
    setForm(BLANK_FORM);
    setError('');
    setEditingId('new');
  }

  function openEdit(type: AssetType) {
    setForm({
      name: type.name,
      iconKey: type.iconKey,
      layer: type.layer,
      inspectionIntervalDays: type.inspectionIntervalDays ?? null,
      requiresCertificate: type.requiresCertificate,
      certificateType: type.certificateType ?? '',
      notes: type.notes ?? '',
    });
    setError('');
    setEditingId(type.id);
  }

  function cancel() {
    setEditingId(null);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const result =
      editingId === 'new'
        ? await createAssetType(form)
        : await updateAssetType(editingId!, form);
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setEditingId(null);
  }

  async function handleArchive(id: string) {
    const result = await archiveAssetType(id);
    if (!result.success) alert(result.error);
  }

  async function handleRestore(id: string) {
    const result = await restoreAssetType(id);
    if (!result.success) alert(result.error);
  }

  const isOpen = editingId !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 inline-flex items-center gap-2">
          Asset Types
          <HelpIcon topic="asset-types-overview" />
        </h1>
        <button
          type="button"
          onClick={openNew}
          aria-expanded={editingId === 'new'}
          title="Define a new kind of asset (e.g. Coffee Machine, EV Charger)"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isOpen}
        >
          <Plus size={15} />
          Add Asset Type
        </button>
      </div>

      <HelpBanner
        topic="asset-types-overview"
        text="Asset types are templates — Fire Extinguisher, Boiler, Distribution Board. Each one sets the icon, the layer on the map, and any compliance rules (like an annual service interval). When you add an asset, you pick its type from this catalogue."
      />

      {/* Inline form — create or edit */}
      {isOpen && (
        <div className="bg-white border border-blue-200 rounded-lg p-5 mb-4 shadow-sm">
          <h2 className="text-base font-medium text-gray-900 mb-4">
            {editingId === 'new' ? 'New Asset Type' : 'Edit Asset Type'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="at-name" className="form-label">Name <span className="text-red-500">*</span></label>
              <input
                id="at-name"
                type="text"
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input"
                placeholder="e.g. CO₂ Fire Extinguisher"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="at-icon" className="form-label">Icon <span className="text-red-500">*</span></label>
              <select
                id="at-icon"
                value={form.iconKey}
                onChange={(e) => setForm((f) => ({ ...f, iconKey: e.target.value }))}
                className="form-select"
              >
                {Object.entries(ASSET_ICON_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="at-layer" className="form-label">Layer <span className="text-red-500">*</span></label>
              <select
                id="at-layer"
                value={form.layer}
                onChange={(e) => setForm((f) => ({ ...f, layer: e.target.value }))}
                className="form-select"
              >
                {LAYERS.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="at-interval" className="form-label">Inspection interval (days)</label>
              <input
                id="at-interval"
                type="number"
                min={1}
                step={1}
                value={form.inspectionIntervalDays ?? ''}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  inspectionIntervalDays: e.target.value ? parseInt(e.target.value, 10) : null,
                }))}
                className="form-input"
                placeholder="e.g. 365"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="at-notes" className="form-label">Notes</label>
              <textarea
                id="at-notes"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="form-textarea"
                placeholder="Internal admin notes (optional)"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  id="at-cert"
                  type="checkbox"
                  checked={form.requiresCertificate}
                  onChange={(e) => setForm((f) => ({ ...f, requiresCertificate: e.target.checked }))}
                  className="form-checkbox"
                />
                <label htmlFor="at-cert" className="text-sm text-gray-700">
                  Requires service certificate
                </label>
              </div>

              {/* Certificate type — revealed with CSS grid height transition */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${form.requiresCertificate ? 'grid-expand-open' : 'grid-expand-closed'}`}
              >
                <div className="overflow-hidden">
                  <div className={`transition-all duration-300 ${form.requiresCertificate ? 'pt-3 opacity-100' : 'pt-0 opacity-0'}`}>
                    <label htmlFor="at-cert-type" className="form-label">
                      Certificate type <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="at-cert-type"
                      type="text"
                      maxLength={200}
                      value={form.certificateType ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, certificateType: e.target.value }))}
                      className="form-input"
                      placeholder="e.g. CD11, OFTEC, Gas Safe"
                      tabIndex={form.requiresCertificate ? 0 : -1}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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

      {/* Active types table */}
      {activeTypes.length === 0 && !isOpen ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No asset types yet. Add your first one to start placing assets on the map.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <table className="hidden sm:table min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Icon</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Layer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Inspection</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Cert</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTypes.map((type) => (
                <AssetTypeRow
                  key={type.id}
                  type={type}
                  isEditing={editingId === type.id}
                  onEdit={() => openEdit(type)}
                  onArchive={() => handleArchive(type.id)}
                  disabled={isOpen && editingId !== type.id}
                />
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="sm:hidden divide-y divide-gray-100">
            {activeTypes.map((type) => (
              <AssetTypeCard
                key={type.id}
                type={type}
                onEdit={() => openEdit(type)}
                onArchive={() => handleArchive(type.id)}
                disabled={isOpen && editingId !== type.id}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Archived section */}
      {archivedTypes.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <ArchiveRestore size={14} />
            {showArchived ? 'Hide' : 'Show'} {archivedTypes.length} archived type{archivedTypes.length !== 1 ? 's' : ''}
          </button>

          {showArchived && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-100">
              {archivedTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between px-4 py-3 opacity-60">
                  <span className="text-sm text-gray-600 line-through">{type.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRestore(type.id)}
                    aria-label={`Restore ${type.name}`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssetTypeRow({
  type,
  isEditing,
  onEdit,
  onArchive,
  disabled,
}: {
  type: AssetType;
  isEditing: boolean;
  onEdit: () => void;
  onArchive: () => void;
  disabled: boolean;
}) {
  const layerLabel = LAYERS.find((l) => l.key === type.layer)?.label ?? type.layer;
  return (
    <tr className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
      <td className="px-4 py-3">
        <IconBadge iconKey={type.iconKey} name={type.name} />
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{type.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{layerLabel}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {type.inspectionIntervalDays ? `${type.inspectionIntervalDays}d` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {type.requiresCertificate ? <Check size={14} className="text-green-600" /> : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            aria-label={`Edit ${type.name}`}
            className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onArchive}
            disabled={disabled}
            aria-label={`Archive ${type.name}`}
            className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"
          >
            <Archive size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AssetTypeCard({
  type,
  onEdit,
  onArchive,
  disabled,
}: {
  type: AssetType;
  onEdit: () => void;
  onArchive: () => void;
  disabled: boolean;
}) {
  const layerLabel = LAYERS.find((l) => l.key === type.layer)?.label ?? type.layer;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <IconBadge iconKey={type.iconKey} name={type.name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{type.name}</p>
        <p className="text-xs text-gray-500">{layerLabel}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        aria-label={`Edit ${type.name}`}
        className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={onArchive}
        disabled={disabled}
        aria-label={`Archive ${type.name}`}
        className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Archive size={16} />
      </button>
    </li>
  );
}

function IconBadge({ iconKey, name }: { iconKey: string; name: string }) {
  const meta = ASSET_ICON_META[iconKey];
  if (!meta) return <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />;
  return (
    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${meta.svgFile ? 'bg-white border border-gray-200' : meta.bgClass}`}>
      {meta.svgFile ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.svgFile} alt={name} className="w-5 h-5 object-contain" />
      ) : (
        <span className="text-white text-[10px] font-bold">{name.charAt(0)}</span>
      )}
    </div>
  );
}
