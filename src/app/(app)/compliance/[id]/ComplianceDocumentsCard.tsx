'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, FileImage, File as FileIcon } from 'lucide-react';
import DocumentUploadModal from '@/components/app/documents/DocumentUploadModal';
import { humanFileSize } from '@/lib/documents/constants';

interface DocRow {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
}

interface Props {
  complianceItemId: string;
  complianceItemName: string;
  complianceStatus: string;
  documents: DocRow[];
  docTypes: { id: string; name: string }[];
}

function fileIcon(mime: string) {
  if (mime === 'application/pdf') return FileText;
  if (mime.startsWith('image/')) return FileImage;
  return FileIcon;
}

export default function ComplianceDocumentsCard({
  complianceItemId,
  complianceItemName,
  complianceStatus,
  documents,
  docTypes,
}: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const router = useRouter();

  // After completion, uploads are certificates / reports. Otherwise, quotes.
  const role: 'quote' | 'certificate' = complianceStatus === 'completed' ? 'certificate' : 'quote';
  const buttonLabel = role === 'quote' ? 'Upload quote' : 'Upload certificate';

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Linked documents</h2>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          aria-label={`${buttonLabel} for ${complianceItemName}`}
          className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium hover:text-blue-900"
        >
          <Plus size={12} />
          {buttonLabel}
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
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex-1 min-w-0 text-sm text-slate-900 hover:text-blue-700 truncate"
                >
                  {doc.name}
                </Link>
                <span className="text-xs text-slate-400 shrink-0">{humanFileSize(doc.fileSize)}</span>
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
        preselectedComplianceItemId={complianceItemId}
        preselectedComplianceItemName={complianceItemName}
        role={role}
      />
    </section>
  );
}
