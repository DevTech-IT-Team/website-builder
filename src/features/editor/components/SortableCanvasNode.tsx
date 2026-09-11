import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import type { CanvasDragData } from '../dnd/types';
import { RenderNode } from '../renderer/RenderNode';
import { useEditorStore } from '../store/editorStore';
import type { EditorNode } from '../types/editor';

export function SortableCanvasNode({ node }: { node: EditorNode }) {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const setSelectedNode = useEditorStore((state) => state.setSelectedNode);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: node.id,
    data: { source: 'canvas', nodeId: node.id, type: node.type } satisfies CanvasDragData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx('relative py-2', isDragging && 'opacity-40')}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        event.stopPropagation();
        setSelectedNode(node.id);
      }}
    >
      {isOver && <div className="absolute inset-x-0 top-0 z-10 h-0.5 rounded-full bg-sky-500" />}
      <div className={clsx('rounded-lg outline-offset-4', selectedNodeId === node.id && 'outline outline-2 outline-sky-500')}>
        <RenderNode node={node} />
      </div>
    </div>
  );
}
