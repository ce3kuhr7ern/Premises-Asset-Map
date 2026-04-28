import AppShell from '@/components/app/AppShell';
import { MapProvider } from '@/contexts/MapContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MapProvider>
      <AppShell>{children}</AppShell>
    </MapProvider>
  );
}
