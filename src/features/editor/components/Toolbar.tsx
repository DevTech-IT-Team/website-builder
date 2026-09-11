import { useEditorStore } from '../store/editorStore';

export function Toolbar() {
  const name = useEditorStore((state) => state.page.name);
  const count = useEditorStore((state) => state.page.nodes.length);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <p className="text-sm font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500">{count} component{count === 1 ? '' : 's'}</p>
    </header>
  );
}
