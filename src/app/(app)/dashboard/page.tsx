import HelpIcon from '@/components/help/HelpIcon';
import HelpBanner from '@/components/help/HelpBanner';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6 inline-flex items-center gap-2">
        Dashboard
        <HelpIcon topic="dashboard-overview" />
      </h1>

      <HelpBanner
        topic="dashboard-overview"
        text="Welcome. The dashboard is your at-a-glance view — what's overdue, what's due soon, and recent activity across the trust. Click any card to dig in. The sidebar on the left takes you to each major register."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Assets', value: '—' },
          { label: 'Documents', value: '—' },
          { label: 'Overdue', value: '—' },
          { label: 'Due Soon', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-medium text-gray-900 mb-4">Overdue Compliance Items</h2>
        <p className="text-sm text-gray-500">No data yet — compliance records will appear here once assets are set up.</p>
      </div>
    </div>
  );
}
