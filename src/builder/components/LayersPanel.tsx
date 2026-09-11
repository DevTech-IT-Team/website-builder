import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  MoreVertical,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useDraggable, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import useBuilderStore from '@/store/useBuilderStore';
import { normalizePageSections } from '@/builder/adapter';
import { collectLayerTree } from '@/builder/tree';
import { layerDragId, type CanvasDragData } from '@/builder/dnd';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { NodeKind } from '@/builder/types';

interface LayerNode {
  id: string;
  kind: NodeKind;
  type: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  children: LayerNode[];
  parentId?: string;
  parentKind?: NodeKind;
  index?: number;
  siblingCount?: number;
  pageId?: string;
}

function LayerRow({
  node,
  depth,
  dragHandleProps,
  onMoveUp,
  onMoveDown,
}: {
  node: LayerNode;
  depth: number;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners?: DraggableSyntheticListeners;
  };
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const selectedId = useBuilderStore((state) => state.editor.selectedNodeId);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const updateCanvasNode = useBuilderStore((state) => state.updateCanvasNode);
  const deleteCanvasNode = useBuilderStore((state) => state.deleteCanvasNode);
  const duplicateCanvasNode = useBuilderStore((state) => state.duplicateCanvasNode);
  const [open, setOpen] = useState(true);
  const selected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const isChrome = node.kind === 'navbar' || node.kind === 'footer';

  return (
    <div>
      <div
        className={cn(
          'group relative flex items-start gap-0.5 rounded-md py-1 pr-1 text-[11px] cursor-pointer',
          selected ? 'bg-slate-100' : 'hover:bg-slate-50',
          node.locked && 'opacity-80'
        )}
        style={{ paddingLeft: 6 + depth * 10 }}
        onClick={() => selectNode(node.id, node.kind)}
      >
        {dragHandleProps ? (
          <div
            role="button"
            tabIndex={0}
            className="mt-0.5 flex h-4 w-4 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Reorder ${node.name}`}
            title="Drag to reorder"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            onPointerDown={(event) => {
              dragHandleProps.listeners?.onPointerDown?.(event);
              event.stopPropagation();
            }}
          >
            <GripVertical className="h-3 w-3" />
          </div>
        ) : null}
        {hasChildren ? (
          <button
            type="button"
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-slate-400"
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-1 font-medium leading-snug text-slate-800 [overflow-wrap:anywhere]">
            <span>{node.name}</span>
            {node.locked ? <Lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /> : null}
          </p>
          <p className="text-[9px] uppercase tracking-wide text-slate-400">{node.type}</p>
        </div>
        <div className={cn('absolute right-0.5 top-1 hidden items-center rounded-md shadow-sm group-hover:flex', selected ? 'bg-slate-100' : 'bg-slate-50')}>
          {(onMoveUp || onMoveDown) && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={!onMoveUp}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveUp?.();
                }}
                aria-label="Move layer up"
                title="Move up"
              >
                <ArrowUp className="h-3 w-3 text-slate-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                disabled={!onMoveDown}
                onClick={(event) => {
                  event.stopPropagation();
                  onMoveDown?.();
                }}
                aria-label="Move layer down"
                title="Move down"
              >
                <ArrowDown className="h-3 w-3 text-slate-400" />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" aria-label={`${node.name} actions`} onClick={(event) => event.stopPropagation()}>
                <MoreVertical className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {!isChrome && (
                <DropdownMenuItem onClick={() => updateCanvasNode(node.id, node.kind === 'section' ? { visible: !node.visible } : { visibility: { desktop: !node.visible, tablet: !node.visible, mobile: !node.visible } })}>
                  {node.visible ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                  {node.visible ? 'Hide' : 'Show'}
                </DropdownMenuItem>
              )}
              {!isChrome && (
                <DropdownMenuItem onClick={() => updateCanvasNode(node.id, { locked: !node.locked })}>
                  {node.locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                  {node.locked ? 'Unlock' : 'Lock'}
                </DropdownMenuItem>
              )}
              {!isChrome && !node.locked && (
                <DropdownMenuItem onClick={() => duplicateCanvasNode(node.id)}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
              )}
              {node.kind !== 'navbar' && !node.locked && (
                <DropdownMenuItem className="text-destructive" onClick={() => deleteCanvasNode(node.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {open && hasChildren && node.children.map((child) => (
        <SortableLayerRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function SortableLayerRow({
  node,
  depth = 0,
}: {
  node: LayerNode;
  depth?: number;
}) {
  const moveCanvasNode = useBuilderStore((state) => state.moveCanvasNode);
  const reorderSections = useBuilderStore((state) => state.reorderSections);
  const page = useBuilderStore((state) => state.getActivePage());
  const disabled = Boolean(node.locked || node.kind === 'navbar' || node.kind === 'footer');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: layerDragId(node.kind, node.id),
    disabled,
    data: {
      source: 'layer',
      nodeId: node.id,
      kind: node.kind,
      type: node.type,
      name: node.name,
      parentId: node.parentId,
      index: node.index,
      pageId: node.pageId,
      locked: node.locked,
    } satisfies CanvasDragData,
  });

  const index = node.index ?? -1;
  const last = (node.siblingCount ?? 1) - 1;

  const moveBy = (direction: -1 | 1) => {
    if (node.kind === 'section' && page) {
      const ids = page.sections.map((section) => section.id);
      const current = ids.indexOf(node.id);
      const next = current + direction;
      if (current < 0 || next < 0 || next >= ids.length) return;
      reorderSections(arrayMove(ids, current, next));
      return;
    }
    if (!node.parentId || !node.parentKind || index < 0) return;
    if (direction < 0) {
      moveCanvasNode(node.id, { parentId: node.parentId, parentKind: node.parentKind, index: index - 1, edge: 'before', accepts: [] });
    } else {
      moveCanvasNode(node.id, { parentId: node.parentId, parentKind: node.parentKind, index: index + 1, edge: 'after', accepts: [] });
    }
  };

  return (
    <div ref={setNodeRef} className={cn(isDragging && 'relative z-50 opacity-40')}>
      <LayerRow
        node={node}
        depth={depth}
        dragHandleProps={disabled ? undefined : { attributes, listeners }}
        onMoveUp={index > 0 ? () => moveBy(-1) : undefined}
        onMoveDown={index >= 0 && index < last ? () => moveBy(1) : undefined}
      />
    </div>
  );
}

function attachParents(nodes: LayerNode[], pageId: string): LayerNode[] {
  return nodes.map((section, sectionIndex) => ({
    ...section,
    parentId: pageId,
    parentKind: 'page' as const,
    index: sectionIndex,
    siblingCount: nodes.length,
    pageId,
    children: section.children.map((container, containerIndex) => ({
      ...container,
      parentId: section.id,
      parentKind: 'section' as const,
      index: containerIndex,
      siblingCount: section.children.length,
      pageId,
      children: container.children.map((element, elementIndex) => ({
        ...element,
        parentId: container.id,
        parentKind: 'container' as const,
        index: elementIndex,
        siblingCount: container.children.length,
        pageId,
      })),
    })),
  }));
}

export function LayersPanel() {
  const page = useBuilderStore((state) => state.getActivePage());
  const device = useBuilderStore((state) => state.editor.device);
  const [query, setQuery] = useState('');

  const tree = useMemo(() => {
    if (!page) return [];
    return attachParents(collectLayerTree(normalizePageSections(page.sections, page.id), device) as LayerNode[], page.id);
  }, [page, device]);

  const navbarLayer: LayerNode | null = page?.navbar
    ? {
        id: 'navbar',
        kind: 'navbar',
        type: 'navbar',
        name: page.navbar.logo?.text || 'Header',
        visible: true,
        children: [],
      }
    : null;

  const footerLayer: LayerNode | null = page?.footer
    ? {
        id: 'footer',
        kind: 'footer',
        type: 'footer',
        name: page.footer.logo?.text || 'Footer',
        visible: true,
        children: [],
      }
    : null;

  const matchesQuery = (node: { name: string; type: string }) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return node.name.toLowerCase().includes(q) || node.type.toLowerCase().includes(q);
  };

  const filteredSections = tree.filter(matchesQuery);
  const showNavbar = Boolean(navbarLayer && matchesQuery(navbarLayer));
  const showFooter = Boolean(footerLayer && matchesQuery(footerLayer));
  const layerCount = tree.length + (navbarLayer ? 1 : 0) + (footerLayer ? 1 : 0);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <h2 className="text-sm font-semibold text-slate-900">Layers</h2>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{layerCount}</span>
      </div>
      <div className="px-3 py-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a layer..."
          className="h-9 rounded-lg border-transparent bg-slate-100 text-xs shadow-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {page && (
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {page.name}
          </div>
        )}
        {showNavbar && navbarLayer && <LayerRow node={navbarLayer} depth={0} />}
        {filteredSections.length ? (
          filteredSections.map((node) => (
            <SortableLayerRow key={node.id} node={node} depth={0} />
          ))
        ) : null}
        {showFooter && footerLayer && <LayerRow node={footerLayer} depth={0} />}
        {!showNavbar && !filteredSections.length && !showFooter && (
          <div className="py-12 text-center">
            <Layers className="mx-auto mb-3 h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-500">No layers yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
