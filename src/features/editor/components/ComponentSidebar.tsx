import { registryList } from '../registry/componentRegistry';
import { DraggablePaletteItem } from './DraggablePaletteItem';

export function ComponentSidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex h-12 items-center border-b border-slate-200 px-4">
        <h2 className="text-sm font-semibold text-slate-900">Components</h2>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto p-3">
        {registryList.map((item) => (
          <DraggablePaletteItem key={item.type} type={item.type} label={item.label} />
        ))}
      </div>
    </aside>
  );
}
