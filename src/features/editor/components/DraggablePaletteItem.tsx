import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { paletteId } from '../dnd/ids';
import type { PaletteDragData } from '../dnd/types';
import { useEditorStore } from '../store/editorStore';
import type { EditorComponentType } from '../types/editor';

export function DraggablePaletteItem({ type, label }: { type: EditorComponentType; label: string }) {
  const addNode = useEditorStore((state) => state.addNode);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteId(type),
    data: { source: 'palette', type } satisfies PaletteDragData,
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => addNode(type)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          addNode(type);
        }
      }}
      className={clsx(
        'w-full cursor-grab rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50 active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
      {...listeners}
      {...attributes}
    >
      {label}
    </div>
  );
}
