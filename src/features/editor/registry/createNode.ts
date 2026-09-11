import { componentRegistry } from './componentRegistry';
import type { EditorComponentType, EditorNode } from '../types/editor';

export function createNode(type: EditorComponentType): EditorNode {
  const entry = componentRegistry[type];
  const clone = structuredClone({
    type: entry.type,
    props: entry.defaultProps,
    styles: entry.defaultStyles,
    children: entry.defaultChildren,
  });

  return {
    ...clone,
    id: crypto.randomUUID(),
  };
}
