import * as Icons from 'lucide-react';
import { CircleDot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Menu icon names from `GET /menu` → lucide-react components. Keys are lower-case aliases;
 * any exact lucide export name ("Bot", "FileCode2"), kebab-case name ("file-code-2") or
 * case-insensitive match ("barchart3") also resolves. Unknown names fall back to a generic
 * icon instead of crashing.
 */
const iconMap: Record<string, string> = {
  dashboard: 'LayoutDashboard',
  users: 'Users',
  roles: 'Shield',
  rolepermissions: 'ShieldCheck',
  'role-permissions': 'ShieldCheck',
  permissions: 'Key',
  'user-roles': 'UserCheck',
  settings: 'Settings',
  activity: 'Activity',
  home: 'Home',
  products: 'Package',
  orders: 'ShoppingCart',
  analytics: 'TrendingUp',
  notifications: 'Bell',
  calendar: 'Calendar',
  messages: 'MessageSquare',
  profile: 'User',
  preferences: 'Sliders',
  menu: 'Menu',
  'site-settings': 'Settings',
  // PentestOps menu
  bot: 'Bot',
  scrolltext: 'ScrollText',
  'scroll-text': 'ScrollText',
  puzzle: 'Puzzle',
  shieldcheck: 'ShieldCheck',
  'shield-check': 'ShieldCheck',
  radar: 'Radar',
  crosshair: 'Crosshair',
  target: 'Target',
  layers: 'Layers',
  cpu: 'Cpu',
  keyround: 'KeyRound',
  'key-round': 'KeyRound',
  filecode2: 'FileCode2',
  'file-code-2': 'FileCode2',
  settings2: 'Settings2',
  'settings-2': 'Settings2',
  boxes: 'Boxes',
  network: 'Network',
  terminal: 'Terminal',
  barchart3: 'BarChart3',
  'bar-chart-3': 'BarChart3',
  layoutdashboard: 'LayoutDashboard',
  'layout-dashboard': 'LayoutDashboard',
};

const isIconComponent = (value: unknown): value is LucideIcon =>
  typeof value === 'object' && value !== null && '$$typeof' in value;

const iconExports = Icons as unknown as Record<string, unknown>;

// Case-insensitive index of every real icon export (skips helpers like createLucideIcon / icons).
const lowerIndex = new Map<string, LucideIcon>();
for (const [name, value] of Object.entries(iconExports)) {
  if (isIconComponent(value) && !lowerIndex.has(name.toLowerCase())) {
    lowerIndex.set(name.toLowerCase(), value);
  }
}

const kebabToPascal = (s: string) =>
  s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');

export function resolveMenuIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return CircleDot;
  const name = iconName.trim();
  const candidates = [iconMap[name.toLowerCase()], name, kebabToPascal(name)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const exact = iconExports[candidate];
    if (isIconComponent(exact)) return exact;
    const loose = lowerIndex.get(candidate.toLowerCase());
    if (loose) return loose;
  }
  return CircleDot;
}
