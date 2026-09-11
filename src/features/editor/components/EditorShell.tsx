import { DragDropProvider } from '../dnd/DragDropProvider';
import { ComponentSidebar } from './ComponentSidebar';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';

export function EditorShell() {
  return (
    <DragDropProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <ComponentSidebar />
          <Canvas />
          <PropertiesPanel />
        </div>
      </div>
    </DragDropProvider>
  );
}
