import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { componentRegistry } from '../registry/componentRegistry';
import { useEditorStore } from '../store/editorStore';
import type { EditorComponentType } from '../types/editor';
import type { EditorDragData } from './types';

export function DragDropProvider({ children }: { children: ReactNode }) {
  const addNode = useEditorStore((state) => state.addNode);
  const reorderNodes = useEditorStore((state) => state.reorderNodes);
  const [activeType, setActiveType] = useState<EditorComponentType | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as EditorDragData | undefined;
    setActiveType(data?.type ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveType(null);
    if (!over) return;

    const activeData = active.data.current as EditorDragData | undefined;
    const overData = over.data.current as EditorDragData | undefined;
    const overCanvas = String(over.id) === 'canvas' || overData?.source === 'canvas';

    if (activeData?.source === 'palette' && overCanvas) {
      addNode(activeData.type);
      return;
    }

    if (activeData?.source === 'canvas' && overData?.source === 'canvas' && active.id !== over.id) {
      const nodes = useEditorStore.getState().page.nodes;
      const oldIndex = nodes.findIndex((node) => node.id === active.id);
      const newIndex = nodes.findIndex((node) => node.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      reorderNodes(arrayMove(nodes, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveType(null)}>
      {children}
      <DragOverlay dropAnimation={null}>
        {activeType ? (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-lg">
            {componentRegistry[activeType].label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
