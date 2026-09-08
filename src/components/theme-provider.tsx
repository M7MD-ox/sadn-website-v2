'use client';

import { ThemeProvider as NextThemes } from 'next-themes';

/**
 * Dark mode (round 13 — owner: "ضيف زرار في الهيدر دارك مود").
 * Class-based so the SADN token overrides in globals.css (.dark) apply;
 * light is the default brand experience and the system preference is
 * intentionally ignored (the owner toggles explicitly).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
