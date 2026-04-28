'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import HelpContent from './HelpContent';
import { getTopic } from '@/lib/help/topics';
import type { HelpTopicSlug } from '@/lib/help/types';

interface Props {
  topic: HelpTopicSlug;
  onClose: () => void;
}

export default function HelpModal({ topic, onClose }: Props) {
  const data = getTopic(topic);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 id="help-modal-title" className="text-base font-semibold text-slate-900">
            {data.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-3">{data.shortDescription}</p>
          <HelpContent blocks={data.body} />

          {data.related && data.related.length > 0 && (
            <div className="mt-5 pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Related</p>
              <ul className="space-y-1">
                {data.related.map((slug) => {
                  const r = getTopic(slug);
                  if (!r) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/help/${slug}`}
                        className="text-sm text-blue-700 hover:text-blue-900"
                        onClick={onClose}
                      >
                        {r.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <footer className="flex justify-between gap-3 px-5 py-3 border-t border-slate-200 bg-slate-50 sticky bottom-0">
          <Link
            href={`/help/${data.slug}`}
            onClick={onClose}
            className="text-sm text-blue-700 hover:text-blue-900"
          >
            Read the full guide →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
