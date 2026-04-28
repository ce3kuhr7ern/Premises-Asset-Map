import { Lightbulb, Info, AlertTriangle } from 'lucide-react';
import type { HelpBlock } from '@/lib/help/types';

/**
 * Renders an array of HelpBlocks as semantic HTML. No Markdown parser, no MDX —
 * the content is structured TypeScript so we trust it implicitly.
 */
export default function HelpContent({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return <p key={i}>{block.text}</p>;
          case 'heading':
            return block.level === 2 ? (
              <h3 key={i} className="text-base font-semibold text-slate-900 pt-2">{block.text}</h3>
            ) : (
              <h4 key={i} className="text-sm font-semibold text-slate-900 pt-1">{block.text}</h4>
            );
          case 'list':
            return block.ordered ? (
              <ol key={i} className="list-decimal pl-5 space-y-1">
                {block.items.map((item, j) => (<li key={j}>{item}</li>))}
              </ol>
            ) : (
              <ul key={i} className="list-disc pl-5 space-y-1">
                {block.items.map((item, j) => (<li key={j}>{item}</li>))}
              </ul>
            );
          case 'tip':
            return (
              <aside key={i} className="flex gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2">
                <Lightbulb size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs">{block.text}</p>
              </aside>
            );
          case 'callout': {
            const Icon = block.tone === 'warning' ? AlertTriangle : Info;
            const cls = block.tone === 'warning'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900';
            const iconCls = block.tone === 'warning' ? 'text-red-600' : 'text-blue-600';
            return (
              <aside key={i} className={`flex gap-2 border rounded-md px-3 py-2 ${cls}`}>
                <Icon size={14} className={`mt-0.5 shrink-0 ${iconCls}`} />
                <p className="text-xs">{block.text}</p>
              </aside>
            );
          }
        }
      })}
    </div>
  );
}
