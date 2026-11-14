import { useQuery } from '@tanstack/react-query';
import { menuApi } from '../../core/api/services/menu.api';
import { MenuItem } from '../../domain/models/menu.model';
import { useAuthStore } from '../../features/auth/store/auth.store';

/** A top-level sidebar entry: either a section group (no url) or a plain link. */
export type NavEntry =
  | { kind: 'group'; item: MenuItem; children: MenuItem[] }
  | { kind: 'link'; item: MenuItem };

/**
 * Shared menu query for the Sidebar and the Header breadcrumb. Same query key as before,
 * so both read one cached `GET /menu` response.
 */
export function useNavigationMenu() {
  const { tokenPayload } = useAuthStore();
  const isSuperAdmin =
    tokenPayload?.role === 'SuperAdmin' ||
    tokenPayload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'SuperAdmin';

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu', isSuperAdmin ? 'all' : 'filtered'],
    // GET /menu returns the ordered, grouped tree (the full tree for SuperAdmin).
    queryFn: () => menuApi.getMenuItems(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return menuItems;
}

/**
 * Turns the API tree into ordered sidebar entries. Top-level items WITHOUT a url are section
 * groups (their children are the links); top-level items WITH a url are plain links. Items
 * that also appear as somebody's child are dropped from the top level, and empty groups are
 * skipped. Backend order is preserved.
 */
export function buildNavEntries(menuItems: MenuItem[]): NavEntry[] {
  const childIds = new Set<number>();
  menuItems.forEach((item) => item.children?.forEach((child) => childIds.add(child.id)));

  const entries: NavEntry[] = [];
  for (const item of menuItems) {
    if (childIds.has(item.id)) continue;
    const children = item.children ?? [];
    if (!item.url) {
      if (children.length > 0) entries.push({ kind: 'group', item, children });
    } else {
      entries.push({ kind: 'link', item });
    }
  }
  return entries;
}

const matches = (url: string, pathname: string) =>
  url === pathname || (url !== '/' && pathname.startsWith(url.endsWith('/') ? url : `${url}/`));

/**
 * Finds the menu link that best matches the current path (longest url prefix wins, so
 * `/engagements/12` highlights "Engagements" without also lighting up `/`). Returns the
 * trail of titles from the section group down to the link.
 */
export function findActiveTrail(
  menuItems: MenuItem[],
  pathname: string
): { url: string | null; trail: string[] } {
  let best: { url: string; trail: string[] } | null = null;

  const walk = (items: MenuItem[], parents: string[]) => {
    for (const item of items) {
      const trail = [...parents, item.title];
      if (item.url && matches(item.url, pathname) && (!best || item.url.length > best.url.length)) {
        best = { url: item.url, trail };
      }
      if (item.children?.length) walk(item.children, trail);
    }
  };
  walk(menuItems, []);

  const found = best as { url: string; trail: string[] } | null;
  return found ? found : { url: null, trail: [] };
}
