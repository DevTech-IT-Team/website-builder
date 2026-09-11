import type { EditorComponentType } from '../types/editor';

export function paletteId(type: EditorComponentType): string {
  return `palette:${type}`;
}

export function canvasNodeId(id: string): string {
  return `node:${id}`;
}
