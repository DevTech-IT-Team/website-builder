import type { CatalogItem } from './catalog';
import { CANVAS_PARENT_RULES, type DropTarget, type ElementType, type NodeKind } from './types';

export const ELEMENT_ACCEPTS = Array.from(CANVAS_PARENT_RULES.container || []);

export type PaletteDragData = {
  source: 'palette';
  itemKind: CatalogItem['kind'];
  catalogId: string;
  name: string;
  elementType?: ElementType;
};

export type CanvasDragData = {
  source: 'canvas' | 'layer';
  nodeId: string;
  kind: NodeKind;
  type: string;
  name: string;
  parentId?: string;
  index?: number;
  pageId?: string;
  locked?: boolean;
};

export type DropZoneData = {
  type: 'dropzone';
  target: DropTarget;
};

export type BuilderDragData = PaletteDragData | CanvasDragData | DropZoneData;

export function canvasDragId(kind: NodeKind, id: string): string {
  return `node:${kind}:${id}`;
}

export function canvasHitId(kind: NodeKind, id: string): string {
  return `hit:${kind}:${id}`;
}

export function layerDragId(kind: NodeKind, id: string): string {
  return `layer:${kind}:${id}`;
}

export function paletteDragId(item: Pick<CatalogItem, 'id' | 'kind'>): string {
  return `palette:${item.kind}:${item.id}`;
}

export function dropZoneId(parentKind: NodeKind, parentId: string, index: number, edge: DropTarget['edge']): string {
  return `drop:${parentKind}:${parentId}:${index}:${edge}`;
}

export type ParsedDragId =
  | { origin: 'palette'; itemKind: CatalogItem['kind']; catalogId: string }
  | { origin: 'node' | 'layer' | 'hit'; kind: NodeKind; nodeId: string }
  | { origin: 'drop'; parentKind: NodeKind; parentId: string; index: number; edge: DropTarget['edge'] };

export function parseDragId(id: string): ParsedDragId | null {
  const parts = String(id).split(':');
  const origin = parts[0];
  if (origin === 'palette' && parts.length >= 3) {
    return {
      origin: 'palette',
      itemKind: parts[1] as CatalogItem['kind'],
      catalogId: parts.slice(2).join(':'),
    };
  }
  if ((origin === 'node' || origin === 'layer' || origin === 'hit') && parts.length >= 3) {
    return { origin, kind: parts[1] as NodeKind, nodeId: parts.slice(2).join(':') };
  }
  if (origin === 'drop' && parts.length >= 5) {
    const edge = parts[parts.length - 1] as DropTarget['edge'];
    const index = Number(parts[parts.length - 2]);
    return {
      origin: 'drop',
      parentKind: parts[1] as NodeKind,
      parentId: parts.slice(2, -2).join(':'),
      index,
      edge,
    };
  }
  return null;
}

function dropTargetFromOver(overId: string, overData: unknown, pageId?: string): DropTarget | null {
  const parsed = parseDragId(overId);
  const data = overData as BuilderDragData | undefined;

  if (parsed?.origin === 'drop') {
    if (data && 'type' in data && data.type === 'dropzone') return data.target;
    return {
      parentId: parsed.parentId,
      parentKind: parsed.parentKind,
      index: parsed.index,
      edge: parsed.edge,
      accepts: [],
    };
  }

  if (parsed && (parsed.origin === 'node' || parsed.origin === 'layer' || parsed.origin === 'hit')) {
    const canvas = data && 'source' in data ? (data as CanvasDragData) : null;
    if (parsed.kind === 'container') {
      return {
        parentId: parsed.nodeId,
        parentKind: 'container',
        index: canvas?.index ?? 0,
        edge: 'inside',
        accepts: ELEMENT_ACCEPTS,
      };
    }
    if (parsed.kind === 'section') {
      return {
        parentId: parsed.nodeId,
        parentKind: 'section',
        index: 0,
        edge: 'inside',
        accepts: ['container'],
      };
    }
    if (parsed.kind === 'element' && canvas?.parentId) {
      return {
        parentId: canvas.parentId,
        parentKind: 'container',
        index: canvas.index ?? 0,
        edge: 'after',
        accepts: ELEMENT_ACCEPTS,
      };
    }
    if (parsed.kind === 'section' || canvas?.kind === 'section') {
      return {
        parentId: canvas?.pageId || pageId || '',
        parentKind: 'page',
        index: canvas?.index ?? 0,
        edge: 'after',
        accepts: ['section'],
      };
    }
  }

  return null;
}

export type DropAction =
  | { type: 'move'; nodeId: string; target: DropTarget }
  | { type: 'palette'; item: PaletteDragData; target: DropTarget | null }
  | { type: 'footer' };

export function resolveDropAction(
  activeId: string,
  overId: string | null,
  activeData: unknown,
  overData: unknown,
  pageId?: string
): DropAction | null {
  const activeParsed = parseDragId(String(activeId));
  if (!activeParsed) return null;

  if (activeParsed.origin === 'palette') {
    const item = (activeData || {}) as PaletteDragData;
    if (item.itemKind === 'footer' || activeParsed.itemKind === 'footer') return { type: 'footer' };
    const paletteItem: PaletteDragData = {
      source: 'palette',
      itemKind: item.itemKind || activeParsed.itemKind,
      catalogId: item.catalogId || activeParsed.catalogId,
      name: item.name || activeParsed.catalogId,
      elementType: item.elementType,
    };
    if (!overId) return { type: 'palette', item: paletteItem, target: null };
    return { type: 'palette', item: paletteItem, target: dropTargetFromOver(overId, overData, pageId) };
  }

  if (activeParsed.origin !== 'node' && activeParsed.origin !== 'layer') return null;
  if (!overId || overId === activeId) return null;

  const overParsed = parseDragId(overId);
  const activeCanvas = activeData as CanvasDragData | undefined;
  const overCanvas = overData as CanvasDragData | undefined;

  if (overParsed?.origin === 'drop') {
    const target = dropTargetFromOver(overId, overData, pageId);
    if (!target) return null;
    return { type: 'move', nodeId: activeParsed.nodeId, target };
  }

  if (overParsed && (overParsed.origin === 'node' || overParsed.origin === 'layer' || overParsed.origin === 'hit')) {
    if (activeParsed.nodeId === overParsed.nodeId) return null;

    if (activeParsed.kind === 'section' && overParsed.kind === 'section') {
      return {
        type: 'move',
        nodeId: activeParsed.nodeId,
        target: {
          parentId: overCanvas?.pageId || activeCanvas?.pageId || pageId || '',
          parentKind: 'page',
          index: overCanvas?.index ?? 0,
          edge: 'after',
          accepts: ['section'],
        },
      };
    }

    if (activeParsed.kind === 'container' && overParsed.kind === 'container' && overCanvas?.parentId) {
      return {
        type: 'move',
        nodeId: activeParsed.nodeId,
        target: {
          parentId: overCanvas.parentId,
          parentKind: 'section',
          index: overCanvas.index ?? 0,
          edge: 'after',
          accepts: ['container'],
        },
      };
    }

    if (activeParsed.kind === 'element' && overParsed.kind === 'element' && overCanvas?.parentId) {
      return {
        type: 'move',
        nodeId: activeParsed.nodeId,
        target: {
          parentId: overCanvas.parentId,
          parentKind: 'container',
          index: overCanvas.index ?? 0,
          edge: 'after',
          accepts: ELEMENT_ACCEPTS,
        },
      };
    }

    if (activeParsed.kind === 'element' && overParsed.kind === 'container') {
      return {
        type: 'move',
        nodeId: activeParsed.nodeId,
        target: {
          parentId: overParsed.nodeId,
          parentKind: 'container',
          index: 0,
          edge: 'inside',
          accepts: ELEMENT_ACCEPTS,
        },
      };
    }

    if (activeParsed.kind === 'container' && overParsed.kind === 'section') {
      return {
        type: 'move',
        nodeId: activeParsed.nodeId,
        target: {
          parentId: overParsed.nodeId,
          parentKind: 'section',
          index: 0,
          edge: 'inside',
          accepts: ['container'],
        },
      };
    }
  }

  return null;
}
