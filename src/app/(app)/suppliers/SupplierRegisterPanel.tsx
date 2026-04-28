'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Wrench, Pencil, Archive, ArchiveRestore, Trash2, Check, Mail, Phone } from 'lucide-react';
import {
  createContractor,
  updateContractor,
  archiveContractor,
  restoreContractor,
  deleteContractor,
  type ContractorFormData,
} from '@/app/actions/suppliers';
import HelpIcon from '@/components/help/HelpIcon';
import HelpBanner from '@/components/help/HelpBanner';

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface Row {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  lastUsedAt: string | null;
  categories: Category[];
}

interface Props {
  rows: Row[];
  categories: Category[];
}

type StatusFilter = 'all' | 'active' | 'archived';

const BLANK_FORM: ContractorFormData = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  notes: '',
  categoryIds: [],
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function SupplierRegisterPanel({ rows, categories }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<ContractorFormData>(BLANK_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'active' && row.status !== 'active') return false;
      if (statusFilter === 'archived' && row.status !== 'archived') return false;
      if (q) {
        const hay = `${row.name} ${row.contactName ?? ''} ${row.email ?? ''} ${row.phone ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter.size > 0) {
        const rowCatIds = new Set(row.categories.map((c) => c.id));
        const matches = Array.from(categoryFilter).some((cid) => rowCatIds.has(cid));
        if (!matches) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, categoryFilter]);

  function openNew() {
    setForm(BLANK_FORM);
    setError('');
    setEditingId('new');
  }

  function openEdit(row: Row) {
    setForm({
      name: row.name,
      contactName: row.contactName ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      address: '',
      website: '',
      notes: '',
      categoryIds: row.categories.map((c) => c.id),
    });
    setError('');
    setEditingId(row.id);
  }

  function toggleCategoryInForm(id: string) {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((cid) => cid !== id)
        : [...f.categoryIds, id],
    }));
  }

  function toggleCategoryFilter(id: string) {
    setCategoryFilter((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    const result =
      editingId === 'new' ? await createContractor(form) : await updateContractor(editingId!, form);
    setSaving(false);
    if (!result.success) { setError(result.error); return; }
    setEditingId(null);
    router.refresh();
  }

  async function handleArchive(id: string) {
    const result = await archiveContractor(id);
    if (!result.success) { alert(result.error); return; }
    router.refresh();
  }

  async function handleRestore(id: string) {
    const result = await restoreContractor(id);
    if (!result.success) { alert(result.error); return; }
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteContractor(id);
    if (!result.success) { alert(result.error); return; }
    setConfirmDeleteId(null);
    router.refresh();
  }

  const isOpen = editingId !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 inline-flex items-center gap-2">
          Suppliers
          <HelpIcon topic="adding-a-supplier" />
        </h1>
        <button
          type="button"
          onClick={openNew}
          disabled={isOpen}
          title="Add a new contractor — Gas Safe engineer, electrician, anyone you trust"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={15} />
          Add Supplier
        </button>
      </div>

      <HelpBanner
        topic="adding-a-supplier"
        text="Suppliers are your trusted contacts — Gas Safe engineers, electricians, fire safety inspectors. Add them once and they'll be picked from a list when you schedule compliance work."
      />

      {/* Filter row */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search suppliers"
          placeholder="Search name, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input max-w-xs"
        />
        <div className="flex gap-1">
          {(['active', 'archived', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategoryFilter(c.id)}
              aria-pressed={categoryFilter.has(c.id)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                categoryFilter.has(c.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.name}
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
            {editingId === 'new' ? 'New Supplier' : 'Edit Supplier'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="s-name" className="form-label">Name <span className="text-red-500">*</span></label>
              <input
                id="s-name"
                type="text"
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input"
                placeholder="e.g. ABC Plumbing Ltd"
                autoFocus
              />
            </div>

            <div className="sm:col-span-2">
              <fieldset>
                <legend className="form-label">Categories <span className="text-red-500">*</span></legend>
                <div className="flex gap-1 flex-wrap mt-1">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategoryInForm(c.id)}
                      aria-pressed={form.categoryIds.includes(c.id)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors border ${
                        form.categoryIds.includes(c.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div>
              <label htmlFor="s-contact" className="form-label">Contact name</label>
              <input
                id="s-contact"
                type="text"
                maxLength={200}
                value={form.contactName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                className="form-input"
                placeholder="e.g. Sam Patel"
              />
            </div>

            <div>
              <label htmlFor="s-email" className="form-label">Email</label>
              <input
                id="s-email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="form-input"
                placeholder="sam@abcplumbing.co.uk"
              />
            </div>

            <div>
              <label htmlFor="s-phone" className="form-label">Phone</label>
              <input
                id="s-phone"
                type="tel"
                maxLength={50}
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="s-website" className="form-label">Website</label>
              <input
                id="s-website"
                type="url"
                maxLength={500}
                value={form.website ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className="form-input"
                placeholder="abcplumbing.co.uk"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="s-address" className="form-label">Address</label>
              <textarea
                id="s-address"
                value={form.address ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="form-textarea"
                placeholder="Optional"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="s-notes" className="form-label">Notes</label>
              <textarea
                id="s-notes"
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="form-textarea"
                placeholder="Rate card, preferred timing, who recommended them…"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={() => setEditingId(null)}
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
          <Wrench size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">
            No suppliers yet. Add your first contractor to start tracking compliance work.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus size={15} />
            Add Supplier
          </button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500">No suppliers match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="hidden sm:table min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Categories</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Last used</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const archived = row.status === 'archived';
                return (
                  <tr key={row.id} className={editingId === row.id ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3">
                      <Link href={`/suppliers/${row.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-blue-700">
                        <Wrench size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{row.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap max-w-xs">
                        {row.categories.slice(0, 3).map((c) => (
                          <span key={c.id} className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700">
                            {c.name}
                          </span>
                        ))}
                        {row.categories.length > 3 && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">
                            +{row.categories.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-0.5">
                        {row.contactName && <p className="text-slate-700">{row.contactName}</p>}
                        {row.email && (
                          <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700">
                            <Mail size={11} />{row.email}
                          </a>
                        )}
                        {row.phone && (
                          <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700">
                            <Phone size={11} />{row.phone}
                          </a>
                        )}
                        {!row.contactName && !row.email && !row.phone && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.lastUsedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        archived ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <span className="sr-only">Status: </span>{archived ? 'Archived' : 'Active'}
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

          <ul className="sm:hidden divide-y divide-slate-100">
            {filteredRows.map((row) => (
              <li key={row.id}>
                <Link href={`/suppliers/${row.id}`} className="flex items-center gap-3 px-4 py-3">
                  <Wrench size={16} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{row.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {row.categories[0]?.name ?? '—'}{row.contactName ? ` · ${row.contactName}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                    row.status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {row.status === 'archived' ? 'Archived' : 'Active'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Delete this supplier?</h2>
            <p className="text-sm text-slate-500 mb-5">
              This permanently removes the record. If the supplier has any compliance history, archive them instead.
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
