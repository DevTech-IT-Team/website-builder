import { componentRegistry } from '../registry/componentRegistry';
import { useEditorStore } from '../store/editorStore';

export function PropertiesPanel() {
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const nodes = useEditorStore((state) => state.page.nodes);
  const deleteNode = useEditorStore((state) => state.deleteNode);
  const node = nodes.find((item) => item.id === selectedNodeId) || null;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex h-12 items-center border-b border-slate-200 px-4">
        <h2 className="text-sm font-semibold text-slate-900">Properties</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!node ? (
          <p className="text-sm text-slate-400">Select a component on the canvas.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {componentRegistry[node.type].label}
            </p>
            <p className="break-all text-xs text-slate-400">{node.id}</p>
            <button
              type="button"
              className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
              onClick={() => deleteNode(node.id)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
