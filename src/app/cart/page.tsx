import { redirect } from 'next/navigation';

/** /cart moved to /bag (round 16 — "السلة" became "الشنطة"). */
export default function CartRedirect() {
  redirect('/bag');
}
