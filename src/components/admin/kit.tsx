'use client';

/**
 * Admin UI kit (R12) — the dashboard's shared recipes with ONE home.
 * Every component here is a port of an existing recipe, not a redesign:
 * the class strings were carried over verbatim from the duplication sites.
 */

import { useEffect, type ReactNode } from 'react';
import { Plus, Trash2, type LucideIcon } from 'lucide-react';

/* ── Field ──────────────────────────────────────────────────────────────
 * `<label class="block"><span class="mb-1.5 block text-xs font-medium
 * text-sadn-ink">` + control + optional red error line.
 * Ported from the file-private Field in AdminProductsTab and the ~30
 * inlined copies in AdminSettingsTab/AdminInventoryTab. Sites whose span
 * differs (size-guide cells, textarea bodies) override via spanClassName.
 */
export function Field({
  label,
  error,
  children,
  className = 'block',
  spanClassName = 'mb-1.5 block text-xs font-medium text-sadn-ink',
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
  spanClassName?: string;
}) {
  return (
    <label className={className}>
      <span className={spanClassName}>{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

/* ── SettingsCard ───────────────────────────────────────────────────────
 * The settings section header recipe (14× in AdminSettingsTab): icon tile
 * + display h2 + soft description + optional trailing action (Switch).
 * The WhatsApp card recolors the tile via iconTileClassName/iconClassName;
 * the password card has no description — omit the prop.
 */
export function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  iconTileClassName = 'bg-sadn-plum-50',
  iconClassName = 'text-sadn-plum-700',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  iconTileClassName?: string;
  iconClassName?: string;
}) {
  return (
    <section className="rounded-none border border-sadn-plum-100 bg-white p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none ${iconTileClassName}`}
        >
          <Icon className={`h-5 w-5 ${iconClassName}`} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-sadn-display text-lg text-sadn-ink">{title}</h2>
          {description !== undefined && (
            <p className="mt-1 text-xs leading-relaxed text-sadn-ink-soft">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── AddRowButton ───────────────────────────────────────────────────────
 * The "add row/stage/section/chat" pill (4× in AdminSettingsTab): plum
 * outline, fills on hover, Plus glyph.
 */
export function AddRowButton({
  label,
  onClick,
  disabled,
  className = '',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press inline-flex h-10 items-center gap-1.5 rounded-none border border-sadn-plum-800 px-4 text-xs font-semibold text-sadn-plum-800 transition-colors hover:bg-sadn-plum-800 hover:text-white disabled:opacity-40 ${className}`}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
      {label}
    </button>
  );
}

/* ── RowDeleteButton ────────────────────────────────────────────────────
 * Tap-target delete icon button (settings rows + categories/reviews rows).
 * Defaults reproduce the settings-row recipe (tap-target, active:scale-90,
 * Trash2 h-3.5); categories/reviews pass { size: 9, iconSize: 'md',
 * tone: 'red', tapTarget: false } for their variant.
 */
export function RowDeleteButton({
  label,
  onClick,
  disabled,
  size = 8,
  iconSize = 'sm',
  tone = 'soft',
  tapTarget = true,
  className = '',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Button box: h-8 w-8 (settings rows) or h-9 w-9. */
  size?: 8 | 9;
  /** 'sm' = h-3.5 w-3.5, 'md' = h-4 w-4 with 1.75 stroke. */
  iconSize?: 'sm' | 'md';
  /** 'soft' = text-sadn-ink-soft, 'red' = text-red-400. */
  tone?: 'soft' | 'red';
  /** tap-target + active:scale-90 (the settings-row recipe). */
  tapTarget?: boolean;
  /** Extra classes, e.g. "ms-auto shrink-0". */
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        tapTarget ? 'tap-target active:scale-90' : '',
        'flex items-center justify-center rounded-none transition-colors hover:bg-red-50 hover:text-red-600',
        size === 9 ? 'h-9 w-9' : 'h-8 w-8',
        tone === 'red' ? 'text-red-400' : 'text-sadn-ink-soft',
        disabled !== undefined ? 'disabled:opacity-30' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Trash2
        className={iconSize === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'}
        strokeWidth={iconSize === 'md' ? 1.75 : undefined}
      />
    </button>
  );
}

/* ── AdminSheet ─────────────────────────────────────────────────────────
 * The dashboard modal shell (3×: OrderDetail, ManualOrderSheet,
 * ProductEditor): fixed inset-0 z-70 + blurred plum overlay (click closes)
 * + the panel. `variant="modal"` is the centered/bottom sheet; `variant=
 * "drawer"` is the end-anchored slide-in panel (product editor). Escape
 * closes on all of them now (a11y parity — OrderDetail already had it).
 * Each site keeps its exact panel classes via panelClassName.
 */
export function AdminSheet({
  onClose,
  label,
  variant = 'modal',
  panelClassName,
  children,
}: {
  onClose: () => void;
  /** aria-label for the dialog. */
  label: string;
  /** 'modal' = flex items-end sm:items-center sheet, 'drawer' = end slide-in. */
  variant?: 'modal' | 'drawer';
  panelClassName: string;
  children: ReactNode;
}) {
  /* Escape closes the dialog (a11y parity with the storefront sheets). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={
        variant === 'drawer'
          ? 'fixed inset-0 z-70'
          : 'fixed inset-0 z-70 flex items-end justify-center sm:items-center'
      }
      role="dialog"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-sadn-plum-950/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={panelClassName}>{children}</div>
    </div>
  );
}
