import { create } from 'zustand'

interface UIState {
    isCartOpen: boolean
    toggleCart: () => void
    openCart: () => void
    closeCart: () => void
    showUpsell: boolean
    upsellTriggerId: string | null
    openUpsell: (itemId: string) => void
    closeUpsell: () => void
}

export const useUIStore = create<UIState>((set) => ({
    isCartOpen: false,
    toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
    openCart: () => set({ isCartOpen: true }),
    closeCart: () => set({ isCartOpen: false }),
    showUpsell: false,
    upsellTriggerId: null,
    openUpsell: (itemId: string) => set({ showUpsell: true, upsellTriggerId: itemId }),
    closeUpsell: () => set({ showUpsell: false, upsellTriggerId: null }),
}))
