'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, FileImage, File as FileIcon, Download } from 'lucide-react';
import DocumentUploadModal from '@/components/app/documents/DocumentUploadModal';

interface DocRow {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  expiresAt: string | null;
  docTypeName: string | null;
  createdAt: string;
}

interface Props {
  assetId: string;
  assetName: string;
  documents: DocRow[];
  docTypes: { id: string; name: string }[];
}

function fileIcon(mime: string) {
  if (mime === 'application/pdf') return FileText;
  if (mime.startsWith('image/')) return FileImage;
  return FileIcon;
}

function expiryClass(iso: string | null): string {
  if (!iso) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(iso).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'text-red-700';
  if (days <= 30) return 'text-amber-700';
  return 'text-emerald-700';
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AssetDocumentsCard({ assetId, assetName, documents, docTypes }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const router = useRouter();

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Linked documents</h2>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          aria-label={`Upload document for ${assetName}`}
          className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium hover:text-blue-900"
        >
          <Plus size={12} />
          Upload
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-slate-400">No documents linked yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const Icon = fileIcon(doc.mimeType);
            return (
              <li key={doc.id} className="py-2 flex items-center gap-2">
                <Icon size={14} className="text-slate-400 shrink-0" />
                <Link href={`/documents/${doc.id}`} className="flex-1 min-w-0 text-sm text-slate-900 hover:text-blue-700 truncate">
                  {doc.name}
                </Link>
                {doc.expiresAt && (
                  <span className={`text-xs ${expiryClass(doc.expiresAt)}`}>
                    {formatDate(doc.expiresAt)}
                  </span>
                )}
                <a
                  href={doc.fileUrl}
                  download
                  aria-label={`Download ${doc.name}`}
                  className="text-slate-400 hover:text-slate-700 shrink-0"
                >
                  <Download size={14} />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => router.refresh()}
        docTypes={docTypes}
        preselectedAssetId={assetId}
        preselectedAssetName={assetName}
      />
    </section>
  );
}
