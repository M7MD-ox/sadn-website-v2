import type { Metadata } from 'next';
import { AdminApp } from '@/components/admin/AdminApp';

export const metadata: Metadata = {
  title: 'SADN Dashboard',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * /admin — the owner dashboard at a real, bookmarkable URL (round 16).
 * Excluded from all robots and the sitemap.
 */
export default function AdminPage() {
  return (
    <div className="admin-scope contents">
      <AdminApp />
    </div>
  );
}
