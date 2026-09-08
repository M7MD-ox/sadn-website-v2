/**
 * Client-safe Egyptian phone helpers (round 18-3a1) — single source for the
 * 17-b/c courier rule: Egyptian mobiles only (010/011/012/015), optionally
 * with a +2 / 2 country prefix.
 *
 * NO 'use client' — pure regex/string helpers shared by client checkout and
 * the server order pipeline. `@/lib/orders` re-exports both so existing
 * server imports keep compiling, but client code must import from HERE
 * (orders.ts pulls @prisma/client).
 */
export const EG_MOBILE_RE = /^(?:\+?2)?01[0125]\d{8}$/;

/** Strip the separator characters people type into phone numbers. */
export const stripPhoneChars = (v: string) => v.replace(/[\s-()]/g, '');
