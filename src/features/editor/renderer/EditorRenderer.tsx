import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEditorStore } from '../store/editorStore';
import { SortableCanvasNode } from '../components/SortableCanvasNode';

export function EditorRenderer() {
  const nodes = useEditorStore((state) => state.page.nodes);

  return (
    <SortableContext items={nodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
      <div className="flex flex-col">
        {nodes.map((node) => (
          <SortableCanvasNode key={node.id} node={node} />
        ))}
      </div>
    </SortableContext>
  );
}
