'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Download, FileText, FileImage, File } from 'lucide-react';
import { deleteDocument } from '@/app/actions/documents';
import { humanFileSize } from '@/lib/documents/constants';
import DocumentUploadModal from '@/components/app/documents/DocumentUploadModal';
import HelpIcon from '@/components/help/HelpIcon';
import HelpBanner from '@/components/help/HelpBanner';

interface DocRow {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  expiresAt: string | null;
  assetId: string | null;
  assetName: string | null;
  docTypeName: string | null;
  createdAt: Date;
}

interface Props {
  rows: DocRow[];
  docTypes: { id: string; name: string }[];
  assets: { id: string; name: string }[];
}

type StatusFilter = 'all' | 'active' | 'expiring_soon' | 'expired';
type LinkFilter = 'all' | 'asset' | 'standalone';

function fileIcon(mime: string) {
  if (mime === 'application/pdf') return FileText;
  if (mime.startsWith('image/')) return FileImage;
  return File;
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
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

export default function DocumentVaultPanel({ rows, docTypes, assets }: Props) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredRows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (q) {
        const hay = `${row.name} ${row.docTypeName ?? ''} ${row.assetName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== 'all' && row.docTypeName !== typeFilter) return false;
      if (linkFilter === 'asset' && !row.assetId) return false;
      if (linkFilter === 'standalone' && row.assetId) return false;

      if (statusFilter !== 'all') {
        if (!row.expiresAt) return statusFilter === 'active';
        const days = Math.floor((new Date(row.expiresAt).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (statusFilter === 'expired' && days >= 0) return false;
        if (statusFilter === 'expiring_soon' && (days < 0 || days > 30)) return false;
        if (statusFilter === 'active' && days <= 30) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, linkFilter, typeFilter]);

  async function handleDelete(id: string) {
    const result = await deleteDocument(id);
    if (!result.success) { alert(result.error); return; }
    setConfirmDeleteId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 inline-flex items-center gap-2">
          Documents
          <HelpIcon topic="uploading-a-document" />
        </h1>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          disabled={docTypes.length === 0}
          title="Upload a PDF, image, or Office document"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={15} />
          Upload Document
        </button>
      </div>

      <HelpBanner
        topic="uploading-a-document"
        text="Documents are how the trust proves it's compliant — certificates, policies, insurance schedules, Land Registry titles. Drag a PDF or photo into the upload dialog and the AI will fill in the details for you."
      />

      {/* Filter row */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search documents"
          placeholder="Search name, type, or asset…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input max-w-xs"
        />

        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-select max-w-xs"
        >
          <option value="all">All types</option>
          {docTypes.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {(['all', 'asset', 'standalone'] as LinkFilter[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLinkFilter(l)}
              aria-pressed={linkFilter === l}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                linkFilter === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {l === 'all' ? 'All' : l === 'asset' ? 'Linked to asset' : 'Trust-level'}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(['all', 'active', 'expiring_soon', 'expired'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'expiring_soon' ? 'Expiring soon' : s === 'all' ? 'All status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 ml-auto">
          {filteredRows.length} of {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500 mb-4">
            No documents yet. Upload your first certificate or policy to start building the register.
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus size={15} />
            Upload Document
          </button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500">No documents match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="hidden sm:table min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Document</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Linked to</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Uploaded</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Expires</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Size</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const Icon = fileIcon(row.mimeType);
                const badge = expiryBadge(row.expiresAt);
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/documents/${row.id}`} className="flex items-center gap-3 text-sm font-medium text-slate-900 hover:text-blue-700">
                        <Icon size={18} className="text-slate-400 shrink-0" />
                        <span className="truncate">{row.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{row.docTypeName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.assetId && row.assetName ? (
                        <Link href={`/assets/${row.assetId}`} className="text-slate-700 hover:text-blue-700">
                          {row.assetName}
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Trust-level</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.expiresAt ? (
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge?.cls ?? ''}`}>
                          {formatDate(row.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{humanFileSize(row.fileSize)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/documents/${row.id}`}
                          aria-label={`Open ${row.name}`}
                          className="p-1.5 text-slate-400 hover:text-slate-700"
                        >
                          <Download size={14} />
                        </Link>
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
            {filteredRows.map((row) => {
              const Icon = fileIcon(row.mimeType);
              const badge = expiryBadge(row.expiresAt);
              return (
                <li key={row.id}>
                  <Link href={`/documents/${row.id}`} className="flex items-center gap-3 px-4 py-3">
                    <Icon size={20} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{row.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {row.docTypeName ?? '—'} · {row.assetName ? row.assetName : 'Trust-level'}
                      </p>
                    </div>
                    {badge && (
                      <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => router.refresh()}
        docTypes={docTypes}
        assets={assets}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Delete this document?</h2>
            <p className="text-sm text-slate-500 mb-5">
              The file will be permanently removed from storage. This cannot be undone.
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
