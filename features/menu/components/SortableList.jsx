"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function Row({ id, label, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-lg border border-border bg-surface p-2", isDragging && "relative z-10 opacity-80 shadow-md")}
    >
      <button
        type="button"
        aria-label={`Reorder ${label}. Press space, then use the arrow keys.`}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

/**
 * Drag-and-drop (pointer, touch and keyboard) reordering. Shows the new order immediately and
 * calls onReorder(ids); if that resolves to false the previous order is restored.
 */
export default function SortableList({ listId, label, items, getLabel, onReorder, renderItem }) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(items.map((i) => [i.id, i]));
  const shown = [...order.filter((id) => byId.has(id)), ...items.map((i) => i.id).filter((id) => !order.includes(id))];

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const previous = shown;
    const next = arrayMove(shown, shown.indexOf(active.id), shown.indexOf(over.id));
    setOrder(next);
    const ok = await onReorder(next);
    if (!ok) setOrder(previous);
  }

  return (
    <DndContext id={listId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={shown} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="space-y-2">
          {shown.map((id) => (
            <Row key={id} id={id} label={getLabel(byId.get(id))}>{renderItem(byId.get(id))}</Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
