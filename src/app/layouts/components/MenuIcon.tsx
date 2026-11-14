import { resolveMenuIcon } from './menuIcons';

// Icon map + resolver live in ./menuIcons.ts (unknown names fall back to a generic icon).
export const MenuIcon: React.FC<{ name?: string | null; className?: string }> = ({ name, className = 'w-4 h-4' }) => {
  const Icon = resolveMenuIcon(name);
  return <Icon className={className} aria-hidden="true" />;
};
