import type { EditorComponentType } from '../types/editor';

export type PaletteDragData = {
  source: 'palette';
  type: EditorComponentType;
};

export type CanvasDragData = {
  source: 'canvas';
  nodeId: string;
  type: EditorComponentType;
};

export type EditorDragData = PaletteDragData | CanvasDragData;
