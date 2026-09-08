'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { AdminKey } from './admin-i18n';

/**
 * SortableList (round 16) — ONE reusable drag & drop list for the dashboard.
 * Owner request: "ترتيب اي مجموعه حاجات بالسحب و الافلات مش بالترقيم".
 *
 * • Vertical by default; `layout="grid"` for card grids (rectSortingStrategy).
 * • Grip handle starts the drag (rows keep working inputs/buttons);
 *   the handle is focusable — keyboard users get dnd-kit's accessible
 *   reordering (space to lift, arrows to move, space to drop).
 * • NO numeric order inputs anywhere — the new array is handed back through
 *   `onReorder` after a drop so the parent can persist + toast optimistically.
 */

type SortableListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  /** Called with the reordered array after every completed drop. */
  onReorder: (next: T[]) => void;
  /** Row content — rendered inside the <li>, after the grip handle. */
  renderItem: (item: T, index: number) => ReactNode;
  layout?: 'vertical' | 'grid';
  ariaLabel?: string;
  /** Translation helper for the grip's aria-label. */
  t: (k: AdminKey) => string;
  className?: string;
  /** Disable dragging entirely (e.g. while a filter hides true positions). */
  disabled?: boolean;
};

export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  layout = 'vertical',
  ariaLabel,
  t,
  className = '',
  disabled = false,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = useMemo(() => items.map(getId), [items, getId]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={disabled ? [] : sensors}
      collisionDetection={closestCenter}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul
          aria-label={ariaLabel}
          className={
            layout === 'grid'
              ? `grid gap-4 sm:grid-cols-2 ${className}`
              : `flex flex-col ${className}`
          }
        >
          {items.map((item, index) => (
            <SortableRow
              key={getId(item)}
              id={getId(item)}
              t={t}
              disabled={disabled}
              dragging={activeId === getId(item)}
              grid={layout === 'grid'}
            >
              {renderItem(item, index)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/** One draggable row: grip handle + caller content, lift/translate via dnd-kit. */
function SortableRow({
  id,
  t,
  children,
  disabled,
  dragging,
  grid,
}: {
  id: string;
  t: (k: AdminKey) => string;
  children: ReactNode;
  disabled: boolean;
  dragging: boolean;
  grid: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging || dragging ? 'z-10 opacity-90 shadow-lg shadow-sadn-plum-950/10' : ''}`}
      data-dragging={isDragging || undefined}
    >
      {grid ? (
        // Grid layout: the whole card drags (no inputs inside review cards).
        <div
          {...attributes}
          {...listeners}
          className={disabled ? '' : 'cursor-grab touch-manipulation active:cursor-grabbing'}
        >
          {children}
        </div>
      ) : (
        <div className="flex items-stretch gap-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={disabled}
            aria-label={t('dragHandle')}
            title={t('dragHandle')}
            className={`flex w-7 shrink-0 cursor-grab touch-manipulation items-center justify-center text-sadn-plum-300 transition-colors hover:text-sadn-plum-700 active:cursor-grabbing ${
              disabled ? 'hidden' : ''
            }`}
          >
            <GripVertical className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </li>
  );
}
