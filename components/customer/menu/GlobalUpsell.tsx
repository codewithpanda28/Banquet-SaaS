'use client'

import React from 'react'
import { UpsellModal } from './UpsellModal'
import { useUIStore } from '@/store/uiStore'
import { useRestaurant } from '@/hooks/useRestaurant'

export function GlobalUpsell() {
    const { showUpsell, upsellTriggerId, closeUpsell } = useUIStore()
    const { restaurant } = useRestaurant()

    if (!showUpsell || !upsellTriggerId || !restaurant?.id) return null

    return (
        <UpsellModal
            triggerItemId={upsellTriggerId}
            restaurantId={restaurant.id}
            onClose={closeUpsell}
        />
    )
}
