import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Copy, Trash2, ChevronUp, GripVertical, EyeOff, Lock, Unlock } from 'lucide-react';
import { NavbarPreview } from '@/components/preview/NavbarPreview';
import { FooterPreview } from '@/components/preview/FooterPreview';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { sanitizeHTML } from '@/utils/sanitize';
import useBuilderStore from '@/store/useBuilderStore';
import { cn } from '@/lib/utils';
import { normalizePageSections } from '@/builder/adapter';
import { DEVICE_WIDTHS, type CanvasContainer, type CanvasElement, type CanvasSection, type DeviceId, type NodeKind } from '@/builder/types';
import { resolveStyles, stylesToCss } from '@/builder/styles';
import { sortByOrder } from '@/builder/tree';
import { canvasDragId, canvasHitId, ELEMENT_ACCEPTS, type CanvasDragData } from '@/builder/dnd';
import { DropZone } from './DropZone';
import { CanvasElementView } from './CanvasPrimitives';
import { useTemplatePieceBridge } from '@/components/sections/TemplatePieceBridge';

function useIsSelected(id: string) {
  return useBuilderStore((state) => state.editor.selectedNodeId === id);
}

function chromeColor(kind: NodeKind) {
  if (kind === 'section') return 'bg-blue-600';
  if (kind === 'container') return 'bg-violet-600';
  return 'bg-sky-600';
}

function NodeFrame({
  id,
  kind,
  name,
  type,
  hidden,
  locked,
  previewMode,
  children,
  className,
  style,
  onSelectParent,
  parentId,
  index,
  pageId,
  dragDisabled,
  dragHandleOnly,
}: {
  id: string;
  kind: NodeKind;
  name: string;
  type?: string;
  hidden?: boolean;
  locked?: boolean;
  previewMode: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onSelectParent?: () => void;
  parentId?: string;
  index?: number;
  pageId?: string;
  dragDisabled?: boolean;
  dragHandleOnly?: boolean;
}) {
  const selected = useIsSelected(id);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const deleteCanvasNode = useBuilderStore((state) => state.deleteCanvasNode);
  const duplicateCanvasNode = useBuilderStore((state) => state.duplicateCanvasNode);
  const updateCanvasNode = useBuilderStore((state) => state.updateCanvasNode);
  const dragData = {
    source: 'canvas' as const,
    nodeId: id,
    kind,
    type: type || kind,
    name,
    parentId,
    index,
    pageId,
    locked,
  } satisfies CanvasDragData;
  const cannotDrag = previewMode || locked || dragDisabled;
  const { attributes, listeners, setNodeRef: setDragRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: canvasDragId(kind, id),
    data: dragData,
    disabled: cannotDrag,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: canvasHitId(kind, id),
    data: dragData,
    disabled: previewMode || isDragging,
  });

  return (
    <div
      ref={setDropRef}
      data-canvas-node={id}
      data-canvas-kind={kind}
      data-canvas-name={name}
      className={cn(
        'canvas-node group/node relative',
        !cannotDrag && 'cursor-grab active:cursor-grabbing',
        selected && !previewMode && 'is-selected',
        hidden && 'opacity-40',
        isDragging && 'opacity-40',
        isOver && !isDragging && !previewMode && 'ring-2 ring-sky-400 ring-offset-2',
        className
      )}
      style={style}
      onClick={(event) => {
        if (previewMode) return;
        event.stopPropagation();
        selectNode(id, kind);
      }}
    >
      {!cannotDrag && (
        <div
          ref={setActivatorNodeRef}
          className="absolute left-0 top-0 z-[60] flex h-full w-6 cursor-grab items-start justify-center hover:bg-sky-500/10 active:cursor-grabbing"
          title="Drag to move"
          aria-label={`Move ${name}`}
          style={{ touchAction: 'none' }}
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="mt-2 h-4 w-4 text-slate-500" />
        </div>
      )}
      <div
        ref={setDragRef}
        style={{ touchAction: cannotDrag ? undefined : 'none' }}
        {...(!cannotDrag && !dragHandleOnly ? listeners : {})}
      >
      {!previewMode && (
        <div
          className={cn(
            'canvas-node-label absolute left-7 top-1 z-30 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white',
            chromeColor(kind),
            selected ? 'opacity-100' : 'opacity-0 group-hover/node:opacity-100',
          )}
        >
          <span>{name}</span>
          {locked && <Lock className="h-3 w-3 opacity-80" />}
          {selected && (
            <span className="ml-1 flex items-center gap-0.5" data-dnd-ignore="true" onPointerDown={(event) => event.stopPropagation()}>
              {onSelectParent && (
                <button type="button" className="rounded p-0.5 hover:bg-white/20" aria-label="Select parent" title="Select parent" onClick={(event) => { event.stopPropagation(); onSelectParent(); }}>
                  <ChevronUp className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                className="rounded p-0.5 hover:bg-white/20"
                aria-label={locked ? `Unlock ${name}` : `Lock ${name}`}
                title={locked ? 'Unlock' : 'Lock'}
                onClick={(event) => {
                  event.stopPropagation();
                  updateCanvasNode(id, { locked: !locked });
                }}
              >
                {locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </button>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-white/20"
                aria-label={`Hide ${name}`}
                title="Hide"
                onClick={(event) => {
                  event.stopPropagation();
                  updateCanvasNode(id, kind === 'section' ? { visible: false } : { visibility: { desktop: false, tablet: false, mobile: false } });
                }}
              >
                <EyeOff className="h-3 w-3" />
              </button>
              <button type="button" className="rounded p-0.5 hover:bg-white/20" aria-label={`Duplicate ${name}`} title="Duplicate" disabled={locked} onClick={(event) => { event.stopPropagation(); if (!locked) duplicateCanvasNode(id); }}>
                <Copy className="h-3 w-3" />
              </button>
              <button type="button" className="rounded p-0.5 hover:bg-white/20" aria-label={`Delete ${name}`} title="Delete" disabled={locked} onClick={(event) => { event.stopPropagation(); if (!locked) deleteCanvasNode(id); }}>
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
      {children}
      </div>
    </div>
  );
}

const CanvasElementNode = memo(function CanvasElementNode({
  element,
  device,
  previewMode,
  onSelectParent,
  parentId,
  index,
}: {
  element: CanvasElement;
  device: DeviceId;
  previewMode: boolean;
  onSelectParent: () => void;
  parentId: string;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const updateCanvasNode = useBuilderStore((state) => state.updateCanvasNode);
  const visible = element.visibility?.[device] !== false;
  if (!visible && previewMode) return null;
  const css = stylesToCss(resolveStyles(element.styles, element.responsiveStyles, device));
  return (
    <NodeFrame
      id={element.id}
      kind="element"
      type={element.type}
      name={element.name || element.type}
      hidden={!visible}
      locked={element.locked}
      previewMode={previewMode}
      onSelectParent={onSelectParent}
      parentId={parentId}
      index={index}
      dragDisabled={editing}
    >
      <div
        onDoubleClick={(event) => {
          if (previewMode || element.locked || element.type !== 'text') return;
          event.stopPropagation();
          setEditing(true);
        }}
      >
        <CanvasElementView
          element={element}
          css={css}
          editing={editing}
          onSaveText={(html) => {
            updateCanvasNode(element.id, { content: { ...element.content, text: html } });
            setEditing(false);
          }}
          onCancelEdit={() => setEditing(false)}
        />
      </div>
    </NodeFrame>
  );
});

const CanvasContainerNode = memo(function CanvasContainerNode({
  container,
  device,
  previewMode,
  onSelectParent,
  parentId,
  index,
}: {
  container: CanvasContainer;
  device: DeviceId;
  previewMode: boolean;
  onSelectParent: () => void;
  parentId: string;
  index: number;
}) {
  const visible = container.visibility?.[device] !== false;
  if (!visible && previewMode) return null;
  const css = stylesToCss(resolveStyles(container.styles, container.responsiveStyles, device));
  const children = sortByOrder(container.children || []);

  return (
    <NodeFrame
      id={container.id}
      kind="container"
      type="container"
      name={container.name || 'Container'}
      hidden={!visible}
      locked={container.locked}
      previewMode={previewMode}
      onSelectParent={onSelectParent}
      parentId={parentId}
      index={index}
      style={css}
    >
      {!previewMode && children.length === 0 && (
        <DropZone parentId={container.id} parentKind="container" index={0} edge="inside" accepts={ELEMENT_ACCEPTS} empty />
      )}
      {children.map((element, elementIndex) => (
        <div key={element.id}>
          {!previewMode && (
            <DropZone parentId={container.id} parentKind="container" index={elementIndex} edge="before" accepts={ELEMENT_ACCEPTS} />
          )}
          <CanvasElementNode
            element={element}
            device={device}
            previewMode={previewMode}
            parentId={container.id}
            index={elementIndex}
            onSelectParent={() => useBuilderStore.getState().selectNode(container.id, 'container')}
          />
        </div>
      ))}
      {!previewMode && children.length > 0 && (
        <DropZone parentId={container.id} parentKind="container" index={children.length} edge="before" accepts={ELEMENT_ACCEPTS} />
      )}
    </NodeFrame>
  );
});

const CanvasSectionNode = memo(function CanvasSectionNode({
  section,
  index,
  device,
  previewMode,
  isAlternate,
  pageId,
}: {
  section: CanvasSection;
  index: number;
  device: DeviceId;
  previewMode: boolean;
  isAlternate: boolean;
  pageId: string;
}) {
  const selectNode = useBuilderStore((state) => state.selectNode);
  const updateSection = useBuilderStore((state) => state.updateSection);
  const visible = section.visible !== false && section.visibility?.[device] !== false;
  if (!visible && previewMode) return null;
  const css = stylesToCss(resolveStyles(section.styles, section.responsiveStyles, device));
  const isCanvas = section.kind === 'canvas' && (section.children || []).length > 0;
  const containers = sortByOrder(section.children || []);

  return (
    <NodeFrame
      id={section.id}
      kind="section"
      type={section.type}
      name={section.name || section.type}
      hidden={!visible}
      locked={section.locked}
      previewMode={previewMode}
      parentId={pageId}
      index={index}
      pageId={pageId}
      dragHandleOnly={!isCanvas}
      style={isCanvas ? css : undefined}
    >
      {isCanvas ? (
        <>
          {containers.map((container, containerIndex) => (
            <div key={container.id}>
              {!previewMode && (
                <DropZone parentId={section.id} parentKind="section" index={containerIndex} edge="before" accepts={['container']} />
              )}
              <CanvasContainerNode
                container={container}
                device={device}
                previewMode={previewMode}
                parentId={section.id}
                index={containerIndex}
                onSelectParent={() => selectNode(section.id, 'section')}
              />
            </div>
          ))}
          {!previewMode && (
            <DropZone parentId={section.id} parentKind="section" index={containers.length} edge="before" accepts={['container']} />
          )}
        </>
      ) : (
        <SectionRenderer
          section={section}
          idx={index}
          isAlternate={isAlternate}
          isSelected={false}
          isEditing={!previewMode}
          onContentChange={(field, value) => {
            updateSection(section.id, { content: { ...section.content, [field]: value } });
          }}
        />
      )}
    </NodeFrame>
  );
});

export function BuilderCanvas() {
  const page = useBuilderStore((state) => state.getActivePage());
  const editor = useBuilderStore((state) => state.editor);
  const pieceChrome = useTemplatePieceBridge(!editor.previewMode);
  const updateNavbar = useBuilderStore((state) => state.updateNavbar);
  const updateFooter = useBuilderStore((state) => state.updateFooter);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const setZoom = useBuilderStore((state) => state.setZoom);
  const addCanvasSection = useBuilderStore((state) => state.addCanvasSection);
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const zoomAnchorRef = useRef<{ canvasX: number; canvasY: number; clientX: number; clientY: number } | null>(null);
  const gestureStartZoomRef = useRef(100);
  const [contentHeight, setContentHeight] = useState(800);

  const sections = useMemo(
    () => (page ? normalizePageSections(page.sections, page.id) : []),
    [page]
  );

  useEffect(() => {
    if (scrollRef.current && page?.id) scrollRef.current.scrollTo({ top: 0 });
  }, [page?.id]);

  useLayoutEffect(() => {
    if (!page?.id) return;

    const applyFit = () => {
      const node = scrollRef.current;
      if (!node) return;
      const width = node.clientWidth;
      if (width < 80) return;
      const frame = DEVICE_WIDTHS[useBuilderStore.getState().editor.device] || DEVICE_WIDTHS.desktop;
      const next = Math.max(25, Math.min(100, Math.floor(((width - 64) / frame) * 100)));
      const current = useBuilderStore.getState().editor.zoom || 100;
      if (Math.abs(current - next) >= 1) {
        useBuilderStore.getState().setZoom(next);
      }
    };

    applyFit();
    const frame = requestAnimationFrame(applyFit);
    const timeout = window.setTimeout(applyFit, 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [page?.id, editor.device]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setContentHeight(height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [page?.id, editor.device]);

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    const scroller = scrollRef.current;
    const scaler = scalerRef.current;
    if (!anchor || !scroller || !scaler) return;
    zoomAnchorRef.current = null;
    const nextZoom = (editor.zoom || 100) / 100;
    const nextRect = scaler.getBoundingClientRect();
    scroller.scrollLeft += nextRect.left + anchor.canvasX * nextZoom - anchor.clientX;
    scroller.scrollTop += nextRect.top + anchor.canvasY * nextZoom - anchor.clientY;
  }, [editor.zoom]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const applyZoom = (nextPercent: number, clientX: number, clientY: number) => {
      const current = useBuilderStore.getState().editor.zoom || 100;
      const next = Math.max(25, Math.min(200, nextPercent));
      if (Math.abs(next - current) < 0.05) return;

      const scaler = scalerRef.current;
      const oldZoom = current / 100;
      if (scaler) {
        const rect = scaler.getBoundingClientRect();
        zoomAnchorRef.current = {
          canvasX: (clientX - rect.left) / oldZoom,
          canvasY: (clientY - rect.top) / oldZoom,
          clientX,
          clientY,
        };
      }
      useBuilderStore.getState().setZoom(next);
    };

    const onWheel = (event: WheelEvent) => {
      const isPinchOrModifier = event.ctrlKey || event.metaKey;
      if (!isPinchOrModifier) return;
      event.preventDefault();

      const current = useBuilderStore.getState().editor.zoom || 100;
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 800 : event.deltaY;
      applyZoom(current * Math.exp(-pixels * 0.0015), event.clientX, event.clientY);
    };

    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartZoomRef.current = useBuilderStore.getState().editor.zoom || 100;
    };

    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale;
      if (!scale) return;
      const gesture = event as Event & { clientX?: number; clientY?: number };
      applyZoom(
        gestureStartZoomRef.current * scale,
        gesture.clientX ?? 0,
        gesture.clientY ?? 0
      );
    };

    scroller.addEventListener('wheel', onWheel, { passive: false, capture: true });
    scroller.addEventListener('gesturestart', onGestureStart as EventListener, { passive: false });
    scroller.addEventListener('gesturechange', onGestureChange as EventListener, { passive: false });
    return () => {
      scroller.removeEventListener('wheel', onWheel, { capture: true });
      scroller.removeEventListener('gesturestart', onGestureStart as EventListener);
      scroller.removeEventListener('gesturechange', onGestureChange as EventListener);
    };
  }, [page?.id]);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white">
        <p className="text-slate-400">Select a page to start editing</p>
      </div>
    );
  }

  const zoom = (editor.zoom || 100) / 100;
  const frameWidth = DEVICE_WIDTHS[editor.device] || DEVICE_WIDTHS.desktop;
  const scaledWidth = frameWidth * zoom;
  const scaledHeight = contentHeight * zoom;
  const globalStyles = page.globalStyles || {};
  const previewMode = editor.previewMode;

  const fitCanvas = () => {
    const width = scrollRef.current?.clientWidth || frameWidth;
    const next = Math.floor(((width - 64) / frameWidth) * 100);
    setZoom(Math.max(25, Math.min(100, next)));
  };

  return (
    <>
    {pieceChrome}
    <div
      ref={scrollRef}
      id="tour-canvas"
      className={cn('relative z-0 isolate h-full w-full overflow-auto bg-[hsl(var(--builder-panel))]', previewMode && 'is-preview')}
      onClick={() => {
        if (!previewMode) selectNode(null);
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: sanitizeHTML(`
        #canvas-root {
          --theme-primary: ${globalStyles.primaryColor || '#3b82f6'};
          --theme-secondary: ${globalStyles.secondaryColor || '#8b5cf6'};
          --theme-accent: ${globalStyles.accentColor || '#06b6d4'};
          --theme-bg: ${globalStyles.backgroundColor || '#ffffff'};
          --theme-text: ${globalStyles.textColor || '#0f172a'};
          --theme-bg-alt: ${globalStyles.alternateBackground || '#f8fafc'};
          --theme-text-alt: ${globalStyles.alternateTextColor || '#0f172a'};
          --radius: ${globalStyles.borderRadius || '12px'};
          --shadow: ${globalStyles.shadows === 'pronounced' ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' : globalStyles.shadows === 'subtle' ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : 'none'};
          --animation-speed: ${globalStyles.animations ? '0.3s' : '0s'};
        }
        .canvas-edit:not(.is-preview) [data-canvas-node]:hover:not(:has([data-canvas-node]:hover)):not(.is-selected) {
          outline: 1px dashed #38bdf8;
          outline-offset: 2px;
        }
        .canvas-edit:not(.is-preview) [data-canvas-node]:hover:not(:has([data-canvas-node]:hover)):not(.is-selected) > .canvas-node-label {
          opacity: 1;
        }
        .canvas-edit:not(.is-preview) [data-canvas-node].is-selected {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
        .canvas-edit:not(.is-preview) [data-canvas-kind="container"].is-selected { outline-color: #7c3aed; }
        .canvas-edit:not(.is-preview) [data-canvas-kind="element"].is-selected { outline-color: #0284c7; }
        .canvas-edit:not(.is-preview) [data-canvas-kind="navbar"].is-selected,
        .canvas-edit:not(.is-preview) [data-canvas-kind="footer"].is-selected { outline-color: #0f172a; }
      `),
        }}
      />

      <div
        className="flex justify-center px-4 py-6"
        style={{ minWidth: `max(100%, ${scaledWidth + 48}px)` }}
      >
        <div
          ref={scalerRef}
          className="relative shrink-0"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            overflow: previewMode ? 'clip' : 'visible',
            overflowClipMargin: '32px',
          }}
        >
          <div
            id="canvas-root"
            ref={frameRef}
            className={cn(
              'canvas-edit light-canvas absolute left-0 top-0 rounded-xl bg-white shadow-elevated',
              previewMode ? 'is-preview overflow-x-hidden' : 'overflow-visible',
            )}
            style={{
              width: frameWidth,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              backgroundColor: globalStyles.backgroundColor || '#ffffff',
            }}
            data-fit-canvas="true"
          >
            <div
              data-canvas-node="navbar"
              data-canvas-kind="navbar"
              className="canvas-node"
              onClick={(event) => {
                if (previewMode) return;
                event.stopPropagation();
                selectNode('navbar', 'navbar');
              }}
            >
              <NavbarPreview config={page.navbar} isEditing={!previewMode} onUpdate={updateNavbar} />
            </div>

            {sortByOrder(sections).map((section, index) => (
              <div key={section.id}>
                {!previewMode && (
                  <DropZone parentId={page.id} parentKind="page" index={index} edge="before" accepts={['section']} />
                )}
                <CanvasSectionNode
                  section={section}
                  index={index}
                  pageId={page.id}
                  device={editor.device || 'desktop'}
                  previewMode={previewMode}
                  isAlternate={index % 2 === 0}
                />
              </div>
            ))}
            {!previewMode && sections.length > 0 && (
              <DropZone parentId={page.id} parentKind="page" index={sections.length} edge="before" accepts={['section']} />
            )}

            {sections.length === 0 && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center px-8 py-16 text-slate-500">
                {!previewMode && (
                  <div className="mb-6 w-full max-w-lg">
                    <DropZone parentId={page.id} parentKind="page" index={0} edge="inside" accepts={['section']} empty label="Drop a section or element here" />
                  </div>
                )}
                <p className="text-lg font-semibold text-slate-800">Start building your website</p>
                <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
                  Add a section or drag an element onto the canvas.
                </p>
                {!previewMode && (
                  <button
                    type="button"
                    className="mt-5 rounded-full bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                    onClick={(event) => {
                      event.stopPropagation();
                      addCanvasSection();
                    }}
                  >
                    Add Section
                  </button>
                )}
              </div>
            )}

            {page.footer && (
            <div
              data-canvas-node="footer"
              data-canvas-kind="footer"
              className="canvas-node"
              onClick={(event) => {
                if (previewMode) return;
                event.stopPropagation();
                selectNode('footer', 'footer');
              }}
            >
              <FooterPreview config={page.footer} isEditing={!previewMode} onUpdate={updateFooter} />
            </div>
            )}
          </div>
        </div>
      </div>
      <button type="button" className="hidden" data-canvas-fit onClick={fitCanvas} aria-hidden />
    </div>
    </>
  );
}
