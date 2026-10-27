import { create } from 'zustand';

/**
 * Whether the site menu is open: the header's menu button on a phone held
 * sideways and the tab bar's "More" both open the same menu.
 */
export const useMenuStore = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),
}));
