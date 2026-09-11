import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { EditorRenderer } from '../renderer/EditorRenderer';
import { useEditorStore } from '../store/editorStore';

export function Canvas() {
  const nodes = useEditorStore((state) => state.page.nodes);
  const setSelectedNode = useEditorStore((state) => state.setSelectedNode);
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  return (
    <main className="min-w-0 flex-1 overflow-auto bg-slate-100 p-6" onClick={() => setSelectedNode(null)}>
      <div
        ref={setNodeRef}
        className={clsx(
          'mx-auto min-h-[640px] max-w-5xl rounded-xl bg-white p-6 shadow-sm ring-offset-2',
          isOver && 'ring-2 ring-sky-500'
        )}
      >
        {nodes.length === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center text-sm text-slate-400">
            {isOver ? (
              <div className="w-full border-t-2 border-sky-500" />
            ) : (
              'Drag a component here, or click one in the left panel'
            )}
          </div>
        ) : (
          <>
            <EditorRenderer />
            {isOver && <div className="mt-2 h-0.5 rounded-full bg-sky-500" />}
          </>
        )}
      </div>
    </main>
  );
}
