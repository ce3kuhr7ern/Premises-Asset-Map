import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">Topic not found</h1>
      <p className="text-sm text-slate-500 mb-6">
        That help topic doesn&apos;t exist (or has been renamed). Try the index.
      </p>
      <Link
        href="/help"
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Back to help
      </Link>
    </div>
  );
}
