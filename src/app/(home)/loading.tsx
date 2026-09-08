import { HomeSkeleton } from '@/components/sadn/Skeletons';

/**
 * /(home)/loading — skeleton mirrors the home layout. The home page can
 * never 404, so a loading boundary here is safe (unlike /product and
 * /policies, where a streaming boundary would turn notFound() into a
 * soft 404 — those routes intentionally have no loading.tsx).
 */
export default function Loading() {
  return <HomeSkeleton />;
}
