import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, GripVertical, Maximize2, Type, Play } from 'lucide-react';
import { sanitizeHTML } from '@/utils/sanitize';
import { pointInSection } from '@/builder/templatePieces';
import useBuilderStore from '@/store/useBuilderStore';

const HANDLE_CURSORS: Record<string, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

function parseSize(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function FloatingComponent({
  component,
  section,
  isSelected,
  isEditing,
  editor,
  updateComponent,
  deleteComponent,
  selectComponent,
  selectSection,
  moveComponent,
}: {
  component: any;
  section: any;
  isSelected: boolean;
  isEditing: boolean;
  editor: { previewMode?: boolean; selectedComponentId?: string | null; zoom?: number; showComponentBar?: boolean };
  updateComponent: (sectionId: string, componentId: string, updates: Record<string, unknown>, options?: { persist?: boolean }) => void;
  deleteComponent: (sectionId: string, componentId: string) => void;
  selectComponent: (id: string | null) => void;
  selectSection: (id: string | null) => void;
  moveComponent: (fromSectionId: string, toSectionId: string, componentId: string, position?: { x: number; y: number }) => void;
}) {
  const [isEditingText, setIsEditingText] = React.useState(false);
  const [showBar, setShowBar] = React.useState(false);
  const chromeOpen = showBar || Boolean(isSelected && editor.showComponentBar);
  const [barPos, setBarPos] = React.useState({ top: 0, left: 0 });
  const [livePos, setLivePos] = React.useState<{ x: number; y: number } | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dragInfo = React.useRef({ startClientX: 0, startClientY: 0, startX: 0, startY: 0, moved: false });

  React.useEffect(() => {
    if (!isSelected) {
      setShowBar(false);
      setIsEditingText(false);
    }
  }, [isSelected]);

  React.useEffect(() => {
    if (!chromeOpen || !rootRef.current) return;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBarPos({
        top: Math.max(12, rect.top - 48),
        left: Math.max(12, rect.left + rect.width / 2),
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [chromeOpen, component.position, component.style]);

  const clearSectionHints = () => {
    document.querySelectorAll('[data-section-id]').forEach((node) => {
      node.classList.remove('ring-2', 'ring-sky-400');
    });
  };

  const beginRelocate = (event: React.PointerEvent) => {
    if (editor.previewMode || isEditingText) return;
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

    const startX = component.position?.x || 0;
    const startY = component.position?.y || 0;
    dragInfo.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX,
      startY,
      moved: false,
    };
    setLivePos({ x: startX, y: startY });

    const onMove = (moveEvent: PointerEvent) => {
      const zoom = (useBuilderStore.getState().editor.zoom || 100) / 100;
      const next = {
        x: dragInfo.current.startX + (moveEvent.clientX - dragInfo.current.startClientX) / zoom,
        y: dragInfo.current.startY + (moveEvent.clientY - dragInfo.current.startClientY) / zoom,
      };
      dragInfo.current.moved = true;
      setLivePos(next);
      const over = pointInSection(moveEvent.clientX, moveEvent.clientY, zoom);
      document.querySelectorAll('[data-section-id]').forEach((node) => {
        const active = Boolean(over && node.getAttribute('data-section-id') === over.sectionId);
        node.classList.toggle('ring-2', active);
        node.classList.toggle('ring-sky-400', active);
      });
    };

    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      clearSectionHints();
      const zoom = (useBuilderStore.getState().editor.zoom || 100) / 100;
      const over = pointInSection(upEvent.clientX, upEvent.clientY, zoom);
      const page = useBuilderStore.getState().getActivePage();
      const currentSectionId =
        page?.sections.find((item) => (item.components || []).some((entry) => entry.id === component.id))?.id || section.id;
      const next = {
        x: dragInfo.current.startX + (upEvent.clientX - dragInfo.current.startClientX) / zoom,
        y: dragInfo.current.startY + (upEvent.clientY - dragInfo.current.startClientY) / zoom,
      };
      setLivePos(null);
      if (!dragInfo.current.moved) return;
      if (over && over.sectionId !== currentSectionId) {
        moveComponent(currentSectionId, over.sectionId, component.id, { x: over.x, y: over.y });
        return;
      }
      updateComponent(currentSectionId, component.id, { position: next }, { persist: false });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const openBar = () => {
    setShowBar(true);
    useBuilderStore.getState().setEditorState({
      selectedSectionId: section.id,
      selectedComponentId: component.id,
      selectedNodeId: component.id,
      selectedKind: 'element',
      showComponentBar: true,
    });
  };

  const handleResizeStart = (edge: string) => (event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const zoom = (useBuilderStore.getState().editor.zoom || 100) / 100;
    const startW = parseSize(component.style?.width, rootRef.current?.offsetWidth || 160);
    const startH = parseSize(component.style?.height, rootRef.current?.offsetHeight || 48);
    const startPos = { x: component.position?.x || 0, y: component.position?.y || 0 };

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      let width = startW;
      let height = startH;
      let x = startPos.x;
      let y = startPos.y;
      if (edge.includes('e')) width = Math.max(40, startW + dx);
      if (edge.includes('s')) height = Math.max(24, startH + dy);
      if (edge.includes('w')) {
        width = Math.max(40, startW - dx);
        x = startPos.x + (startW - width);
      }
      if (edge.includes('n')) {
        height = Math.max(24, startH - dy);
        y = startPos.y + (startH - height);
      }
      updateComponent(
        section.id,
        component.id,
        { position: { x, y }, style: { ...(component.style || {}), width: `${Math.round(width)}px`, height: `${Math.round(height)}px` } },
        { persist: false }
      );
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      updateComponent(section.id, component.id, { style: { ...(component.style || {}) } }, { persist: true });
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div
      ref={rootRef}
      className={`floating-component absolute group/comp transition-shadow duration-200 ${!editor.previewMode ? 'cursor-grab' : ''} ${isSelected && !editor.previewMode ? 'ring-2 ring-sky-500 ring-offset-2 rounded-sm shadow-xl' : ''}`}
      style={{
        left: livePos?.x ?? component.position?.x ?? 0,
        top: livePos?.y ?? component.position?.y ?? 0,
        zIndex: isSelected ? 50 : 10,
        width: component.style?.width,
        height: component.style?.height,
        fontSize: component.style?.fontSize,
        fontWeight: component.style?.fontWeight,
        color: component.style?.color,
        fontFamily: component.style?.fontFamily,
        fontStyle: component.style?.fontStyle,
      }}
      onClick={(event) => {
        event.stopPropagation();
        openBar();
      }}
    >
      {component.type === 'text' && (
        <div
          ref={contentRef}
          className={`outline-none min-w-[50px] p-1 transition-all ${isEditingText ? 'cursor-text bg-white/50 backdrop-blur-sm rounded' : 'cursor-grab'}`}
          contentEditable={isEditing && isSelected && isEditingText}
          suppressContentEditableWarning
          onBlur={(e) => {
            const relatedTarget = e.relatedTarget as HTMLElement | null;
            if (relatedTarget?.closest('.piece-function-bar, .comp-toolbar')) return;
            setIsEditingText(false);
            updateComponent(section.id, component.id, {
              content: { ...component.content, text: e.currentTarget.innerHTML },
            });
          }}
          onPointerDown={(e) => {
            selectSection(section.id);
            selectComponent(component.id);
            if (isEditingText) e.stopPropagation();
          }}
          style={{
            color: component.style?.color || 'inherit',
            fontSize: component.style?.fontSize || '24px',
            fontWeight: component.style?.fontWeight || 'normal',
            fontFamily: component.style?.fontFamily || 'Inter',
            fontStyle: component.style?.fontStyle || 'normal',
            letterSpacing: component.style?.letterSpacing || 'normal',
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(component.content?.text || 'Edit text') }}
        />
      )}
      {component.type === 'image' && (
        <img
          src={component.content?.imageUrl}
          alt="Component"
          draggable={false}
          className="max-w-full h-auto pointer-events-none select-none"
          style={{
            width: component.style?.width || '100%',
            height: component.style?.height || 'auto',
            borderRadius: component.style?.borderRadius || '0px',
          }}
        />
      )}
      {component.type === 'button' && (
        <button
          type="button"
          className="px-6 py-3 rounded-lg font-semibold whitespace-nowrap"
          style={{
            background: component.style?.background || 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: component.style?.color || '#ffffff',
            fontSize: component.style?.fontSize || '16px',
            borderRadius: component.style?.borderRadius || '8px',
            width: '100%',
            height: '100%',
          }}
        >
          <div className="flex items-center gap-2">
            {component.content?.text?.toLowerCase().includes('watch') && <Play className="w-4 h-4 fill-current" />}
            <span>{component.content?.text || 'Click me'}</span>
          </div>
        </button>
      )}

      {isEditing && isSelected && chromeOpen && (
        <>
          {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((edge) => (
            <div
              key={edge}
              onPointerDown={handleResizeStart(edge)}
              className="absolute z-[80] h-2.5 w-2.5 rounded-sm border border-white bg-sky-500 shadow"
              style={{
                cursor: HANDLE_CURSORS[edge],
                top: edge.includes('n') ? -5 : edge.includes('s') ? 'auto' : '50%',
                bottom: edge.includes('s') ? -5 : 'auto',
                left: edge.includes('w') ? -5 : edge.includes('e') ? 'auto' : '50%',
                right: edge.includes('e') ? -5 : 'auto',
                transform: edge.length === 1 ? (edge === 'n' || edge === 's' ? 'translateX(-50%)' : 'translateY(-50%)') : undefined,
              }}
            />
          ))}
          {typeof document !== 'undefined' &&
            createPortal(
              <div
                className="piece-function-bar fixed z-[200] flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-1.5 py-1 shadow-xl backdrop-blur"
                style={{ top: barPos.top, left: barPos.left }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="flex h-8 cursor-grab items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 active:cursor-grabbing"
                  title="Hold and drag onto any section on this page"
                  onPointerDown={beginRelocate}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                  Move
                </div>
                <button
                  type="button"
                  className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  title="Drag the blue handles to resize"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Resize
                </button>
                {component.type === 'text' && (
                  <button
                    type="button"
                    className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setIsEditingText(true);
                      setTimeout(() => contentRef.current?.focus(), 10);
                    }}
                  >
                    <Type className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  title="Delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteComponent(section.id, component.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}
