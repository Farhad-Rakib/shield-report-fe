import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { WidgetId } from '../dashboard-layout.store';

interface DraggableWidgetProps {
  id: WidgetId;
  onHide: (id: WidgetId) => void;
  children: React.ReactNode;
  className?: string;
}

export function DraggableWidget({ id, onHide, children, className = '' }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className}`}
    >
      {/* Controls overlay — shown on hover */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-6 h-6 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Remove button */}
        <button
          onClick={() => onHide(id)}
          className="flex items-center justify-center w-6 h-6 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/40 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          title="Remove widget"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {children}
    </div>
  );
}

/** Lightweight placeholder rendered while dragging */
export function DragOverlayWidget({ children }: { children: React.ReactNode }) {
  return (
    <div className="opacity-95 shadow-overlay ring-2 ring-brand-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950 rounded-lg pointer-events-none">
      {children}
    </div>
  );
}
