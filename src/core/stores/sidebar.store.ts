import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isCollapsed: false,
      toggleCollapsed: () => set({ isCollapsed: !get().isCollapsed }),
    }),
    {
      name: 'shield_report_sidebar_collapsed',
    }
  )
);
