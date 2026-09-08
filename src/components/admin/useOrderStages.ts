'use client';

/**
 * useOrderStages (R12) — the owner's editable order-stage checklist
 * (Setting.orderStages via GET /api/admin/settings), shared by the two
 * consumers that only READ it: AdminOrdersTab (filters, chips, checklist)
 * and AdminOverviewTab (status bars). Falls back to DEFAULT_ORDER_STAGES
 * until the settings GET resolves — exactly the previous per-tab recipes.
 */

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ORDER_STAGES, type OrderStage } from '@/lib/store-settings';

export function useOrderStages(): { stages: OrderStage[] } {
  const [stages, setStages] = useState<OrderStage[]>(DEFAULT_ORDER_STAGES);

  const load = useCallback(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.settings?.orderStages) && d.settings.orderStages.length > 0) {
          setStages(d.settings.orderStages);
        }
      })
      .catch((err) => {
        console.warn('useOrderStages: settings fetch failed', err);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stages };
}
