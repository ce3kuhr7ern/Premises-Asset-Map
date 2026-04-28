'use client';

import { useHelpMode } from '@/lib/help/use-help-mode';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Always-visible toggle on the /help page so users can re-enable hidden help.
 */
export default function HelpModeToggle() {
  const { mode, setMode } = useHelpMode();
  const hidden = mode === 'hidden';

  return (
    <div
      className={`rounded-md border px-4 py-3 flex items-center gap-3 mb-6 ${
        hidden ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      {hidden ? (
        <EyeOff size={16} className="text-slate-500 shrink-0" />
      ) : (
        <Eye size={16} className="text-emerald-700 shrink-0" />
      )}
      <p className="text-sm flex-1">
        Help guides are{' '}
        <strong className={hidden ? 'text-slate-700' : 'text-emerald-800'}>
          {hidden ? 'hidden' : 'shown'}
        </strong>{' '}
        on each page right now.
        {hidden && ' This page stays available either way.'}
      </p>
      <button
        type="button"
        onClick={() => setMode(hidden ? 'shown' : 'hidden')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md ${
          hidden
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
        }`}
      >
        {hidden ? 'Show them again' : 'Hide help guides'}
      </button>
    </div>
  );
}
