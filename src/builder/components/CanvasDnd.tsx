import { useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import useBuilderStore from '@/store/useBuilderStore';
import { ELEMENT_CATALOG, PREBUILT_CATALOG } from '@/builder/catalog';
import { createDefaultFooter } from '@/lib/defaultPageData';
import { resolveDropAction, type BuilderDragData, type CanvasDragData, type PaletteDragData } from '@/builder/dnd';
import { BuilderPointerSensor } from '@/builder/pointerSensor';
import { CanvasDndContext, type CanvasDndState } from './CanvasDndContext';

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const drops = pointerHits.filter((hit) => String(hit.id).startsWith('drop:'));
  if (drops.length) return drops;
  if (pointerHits.length) return pointerHits;
  return rectIntersection(args);
};

function OverlayCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{title}</p>
      {subtitle ? <p className="text-[10px] uppercase tracking-wide text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

export function CanvasDndProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<BuilderDragData | null>(null);
  const sensors = useSensors(
    useSensor(BuilderPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const value = useMemo<CanvasDndState>(
    () => ({ isDragging: Boolean(active), active }),
    [active]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActive((event.active.data.current || null) as BuilderDragData | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: activeItem, over } = event;
    const page = useBuilderStore.getState().getActivePage();
    const action = resolveDropAction(
      String(activeItem.id),
      over ? String(over.id) : null,
      activeItem.data.current,
      over?.data.current,
      page?.id
    );
    setActive(null);
    if (!action || !page) return;

    const store = useBuilderStore.getState();
    if (action.type === 'footer') {
      if (!page.footer) store.updateFooter(createDefaultFooter());
      store.selectNode('footer', 'footer');
      return;
    }
    if (action.type === 'move') {
      store.moveCanvasNode(action.nodeId, action.target);
      return;
    }
    if (action.type === 'palette') {
      const catalog = [...ELEMENT_CATALOG, ...PREBUILT_CATALOG].find((item) => item.id === action.item.catalogId);
      if (catalog?.kind === 'footer') {
        if (!page.footer) store.updateFooter(createDefaultFooter());
        store.selectNode('footer', 'footer');
        return;
      }
      store.addPaletteItem(
        {
          ...action.item,
          catalogId: catalog?.id || action.item.catalogId,
        },
        action.target,
        catalog?.createPrebuilt?.()
      );
    }
  };

  const overlay = (() => {
    if (!active) return null;
    if ('itemKind' in active) {
      const item = active as PaletteDragData;
      return <OverlayCard title={item.name} subtitle={item.itemKind} />;
    }
    if ('nodeId' in active) {
      const item = active as CanvasDragData;
      return <OverlayCard title={item.name} subtitle={item.kind} />;
    }
    return null;
  })();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={{ threshold: { x: 0.12, y: 0.18 }, acceleration: 12 }}
      onDragStart={handleDragStart}
      onDragCancel={() => setActive(null)}
      onDragEnd={handleDragEnd}
    >
      <CanvasDndContext.Provider value={value}>
        {children}
        <DragOverlay dropAnimation={null} zIndex={200}>{overlay}</DragOverlay>
      </CanvasDndContext.Provider>
    </DndContext>
  );
}
