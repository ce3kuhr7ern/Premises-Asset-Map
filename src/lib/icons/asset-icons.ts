// Maps icon_key → display metadata and layer group
export const ASSET_ICON_META: Record<string, {
  label: string;
  bgClass: string;
  lucideIcon: string;
  layer: string;
  svgFile?: string;
}> = {
  // Fire Safety — ISO 7010 symbols
  'iso7010-f001': { label: 'Fire Extinguisher',    bgClass: 'bg-red-600',    lucideIcon: 'Flame',       layer: 'fire-safety', svgFile: '/icons/iso7010/ISO_7010_F001.svg' },
  'iso7010-f002': { label: 'Fire Alarm Call Point', bgClass: 'bg-red-600',    lucideIcon: 'Bell',        layer: 'fire-safety', svgFile: '/icons/iso7010/ISO_7010_F002.svg' },
  'iso7010-f003': { label: 'Smoke / Heat Detector', bgClass: 'bg-orange-500', lucideIcon: 'AlertCircle', layer: 'fire-safety', svgFile: '/icons/iso7010/ISO_7010_F003.svg' },
  'iso7010-e001': { label: 'Emergency Exit',         bgClass: 'bg-green-600',  lucideIcon: 'DoorOpen',    layer: 'fire-safety', svgFile: '/icons/iso7010/ISO_7010_E001.svg' },
  // Fire Safety — lucide icons (no ISO SVG available)
  'asset-fire-door':      { label: 'Fire Door',          bgClass: 'bg-red-700',    lucideIcon: 'DoorClosed',  layer: 'fire-safety' },
  'asset-fire-hose':      { label: 'Fire Hose Reel',     bgClass: 'bg-red-600',    lucideIcon: 'Flame',       layer: 'fire-safety' },
  'asset-fire-blanket':   { label: 'Fire Blanket',       bgClass: 'bg-red-500',    lucideIcon: 'Flame',       layer: 'fire-safety' },
  // Electrical
  'asset-elec-board':     { label: 'Distribution Board', bgClass: 'bg-yellow-500', lucideIcon: 'Zap',         layer: 'electrical'  },
  'asset-elec-light':     { label: 'Light Fitting',      bgClass: 'bg-yellow-400', lucideIcon: 'Lightbulb',   layer: 'electrical'  },
  'asset-elec-socket':    { label: 'Socket / Outlet',    bgClass: 'bg-yellow-500', lucideIcon: 'Zap',         layer: 'electrical'  },
  // Utilities
  'asset-util-stopcock':  { label: 'Stopcock',           bgClass: 'bg-blue-600',   lucideIcon: 'Droplets',    layer: 'utilities'   },
  'asset-util-boiler':    { label: 'Boiler',             bgClass: 'bg-blue-500',   lucideIcon: 'Droplets',    layer: 'utilities'   },
  // Openings
  'asset-open-door':      { label: 'Door',               bgClass: 'bg-violet-600', lucideIcon: 'DoorClosed',  layer: 'openings'    },
  'asset-open-window':    { label: 'Window',             bgClass: 'bg-violet-400', lucideIcon: 'Square',      layer: 'openings'    },
};

export const LAYERS = [
  { key: 'fire-safety', label: 'Fire Safety',  defaultOn: true  },
  { key: 'electrical',  label: 'Electrical',   defaultOn: true  },
  { key: 'openings',    label: 'Openings',      defaultOn: false },
  { key: 'utilities',   label: 'Utilities',     defaultOn: false },
];

export function getIconMeta(iconKey: string) {
  return ASSET_ICON_META[iconKey] ?? {
    label: iconKey,
    bgClass: 'bg-slate-500',
    lucideIcon: 'HelpCircle',
    layer: 'fire-safety',
  };
}
