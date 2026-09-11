import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, Maximize2, Trash2, Type } from 'lucide-react';
import useBuilderStore from '@/store/useBuilderStore';
import {
  detachMatchingContent,
  elementOffsetInSection,
  findTemplatePieceTarget,
  pieceMatchFromElement,
  pieceTypeFromElement,
  pointInSection,
} from '@/builder/templatePieces';

function zoomScale() {
  return (useBuilderStore.getState().editor.zoom || 100) / 100;
}

function componentSectionId(componentId: string | null): string | null {
  if (!componentId) return null;
  const page = useBuilderStore.getState().getActivePage();
  return page?.sections.find((section) => (section.components || []).some((item) => item.id === componentId))?.id || null;
}

export function promotePiece(piece: HTMLElement, sectionEl: HTMLElement, sourceSectionId: string): string | null {
  const store = useBuilderStore.getState();
  const page = store.getActivePage();
  const section = page?.sections.find((item) => item.id === sourceSectionId);
  if (!section) return null;
  const match = pieceMatchFromElement(piece);
  const type = pieceTypeFromElement(piece);
  const box = elementOffsetInSection(piece, sectionEl, zoomScale());
  const computed = window.getComputedStyle(piece);
  const detached = detachMatchingContent({ ...(section.content || {}) }, match);
  if (detached.detached) {
    store.updateSection(sourceSectionId, { content: detached.content });
  } else {
    piece.style.visibility = 'hidden';
  }
  const id = store.addComponent(sourceSectionId, {
    type,
    position: { x: box.x, y: box.y },
    style: {
      width: `${Math.round(box.width)}px`,
      height: type === 'text' ? undefined : `${Math.round(box.height)}px`,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      color: computed.color,
      fontFamily: computed.fontFamily,
    },
    content: type === 'image' ? { imageUrl: match.src } : { text: match.html || piece.textContent || '' },
  });
  if (id) {
    store.setEditorState({
      selectedSectionId: sourceSectionId,
      selectedComponentId: id,
      selectedNodeId: id,
      selectedKind: 'element',
      showComponentBar: true,
    });
  }
  return id;
}

type Selection = {
  piece: HTMLElement;
  sectionEl: HTMLElement;
  sectionId: string;
  rect: DOMRect;
};

function lockPieceStyles(piece: HTMLElement) {
  piece.dataset.pieceFocused = 'true';
  piece.style.userSelect = 'none';
  piece.style.webkitUserSelect = 'none';
  piece.style.caretColor = 'transparent';
}

function unlockPieceStyles(piece: HTMLElement) {
  delete piece.dataset.pieceFocused;
  piece.style.userSelect = '';
  piece.style.webkitUserSelect = '';
  piece.style.caretColor = '';
  piece.style.opacity = '';
}

function startPieceMove(
  event: PointerEvent,
  selection: Selection,
  captureEl: HTMLElement,
  onDragging: (active: boolean) => void,
  onPlaced: () => void,
  immediate = false
) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  window.getSelection()?.removeAllRanges();

  const { piece, sectionEl, sectionId } = selection;
  const startPos = elementOffsetInSection(piece, sectionEl, zoomScale());
  const grabX = event.clientX - piece.getBoundingClientRect().left;
  const grabY = event.clientY - piece.getBoundingClientRect().top;

  try {
    captureEl.setPointerCapture(event.pointerId);
  } catch {
    /* capture is best-effort */
  }

  let ghost: HTMLElement | null = null;
  let active = false;
  const previousUserSelect = document.body.style.userSelect;
  const previousCursor = document.body.style.cursor;
  const blockSelect = (selectEvent: Event) => selectEvent.preventDefault();
  document.body.style.userSelect = 'none';
  document.addEventListener('selectstart', blockSelect, true);

  const highlight = (clientX: number, clientY: number) => {
    const over = pointInSection(clientX, clientY, zoomScale());
    document.querySelectorAll('[data-section-id]').forEach((node) => {
      const activeRing = Boolean(over && node.getAttribute('data-section-id') === over.sectionId);
      node.classList.toggle('ring-2', activeRing);
      node.classList.toggle('ring-sky-400', activeRing);
    });
  };

  const activate = () => {
    if (active) return;
    active = true;
    onDragging(true);
    const startRect = piece.getBoundingClientRect();
    ghost = piece.cloneNode(true) as HTMLElement;
    ghost.setAttribute('data-dnd-ignore', 'true');
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${startRect.left}px`,
      top: `${startRect.top}px`,
      width: `${startRect.width}px`,
      margin: '0',
      zIndex: '400',
      pointerEvents: 'none',
      opacity: '0.95',
      userSelect: 'none',
    });
    document.body.appendChild(ghost);
    document.body.style.cursor = 'grabbing';
    piece.style.opacity = '0.2';
  };

  const onMove = (moveEvent: PointerEvent) => {
    moveEvent.preventDefault();
    if (!active && Math.hypot(moveEvent.clientX - event.clientX, moveEvent.clientY - event.clientY) > 3) {
      activate();
    }
    if (!ghost) return;
    ghost.style.left = `${moveEvent.clientX - grabX}px`;
    ghost.style.top = `${moveEvent.clientY - grabY}px`;
    highlight(moveEvent.clientX, moveEvent.clientY);
  };

  const finish = (upEvent: PointerEvent) => {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', finish, true);
    document.removeEventListener('selectstart', blockSelect, true);
    try {
      captureEl.releasePointerCapture(upEvent.pointerId);
    } catch {
      /* already released */
    }
    document.body.style.userSelect = previousUserSelect;
    document.body.style.cursor = previousCursor;
    document.querySelectorAll('[data-section-id]').forEach((node) => node.classList.remove('ring-2', 'ring-sky-400'));
    ghost?.remove();
    piece.style.opacity = '';
    onDragging(false);
    window.getSelection()?.removeAllRanges();
    if (!active) return;

    const zoomNow = zoomScale();
    const over = pointInSection(upEvent.clientX, upEvent.clientY, zoomNow);
    const id = promotePiece(piece, sectionEl, sectionId);
    if (!id) return;
    const current = useBuilderStore.getState();
    const currentSection = componentSectionId(id) || sectionId;
    if (over && over.sectionId !== currentSection) {
      current.moveComponent(currentSection, over.sectionId, id, { x: over.x, y: over.y });
    } else {
      current.updateComponent(
        currentSection,
        id,
        {
          position: {
            x: startPos.x + (upEvent.clientX - event.clientX) / zoomNow,
            y: startPos.y + (upEvent.clientY - event.clientY) / zoomNow,
          },
        },
        { persist: false }
      );
    }
    onPlaced();
  };

  if (immediate) activate();

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', finish, true);
  window.addEventListener('pointercancel', finish, true);
}

export function useTemplatePieceBridge(enabled: boolean) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState(false);
  const selectionRef = useRef<Selection | null>(null);
  selectionRef.current = selection;

  useEffect(() => {
    if (!enabled) {
      if (selectionRef.current) unlockPieceStyles(selectionRef.current.piece);
      setSelection(null);
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const store = useBuilderStore.getState();
      if (store.editor.previewMode) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('.piece-function-bar, .piece-focus-overlay, .floating-component')) return;

      const piece = findTemplatePieceTarget(event.target);
      if (!piece) {
        if (selectionRef.current) unlockPieceStyles(selectionRef.current.piece);
        setSelection(null);
        return;
      }
      const sectionEl = piece.closest('[data-section-id]') as HTMLElement | null;
      if (!sectionEl || sectionEl.dataset.sectionKind !== 'prebuilt') return;
      const sectionId = sectionEl.dataset.sectionId;
      if (!sectionId) return;
      if (piece.isContentEditable && document.activeElement === piece) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.getSelection()?.removeAllRanges();

      if (selectionRef.current && selectionRef.current.piece !== piece) {
        unlockPieceStyles(selectionRef.current.piece);
      }
      lockPieceStyles(piece);
      store.setEditorState({ selectedSectionId: sectionId, selectedComponentId: null, showComponentBar: false });
      const next = { piece, sectionEl, sectionId, rect: piece.getBoundingClientRect() };
      setSelection(next);
      startPieceMove(event, next, piece, setDragging, () => {
        unlockPieceStyles(piece);
        setSelection(null);
      });
    };

    const syncRect = () => {
      setSelection((current) => (current ? { ...current, rect: current.piece.getBoundingClientRect() } : current));
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', syncRect, true);
    window.addEventListener('resize', syncRect);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', syncRect, true);
      window.removeEventListener('resize', syncRect);
    };
  }, [enabled]);

  if (!enabled || !selection) return null;

  return createPortal(
    <LivePieceChrome
      selection={selection}
      dragging={dragging}
      onDragging={setDragging}
      onClose={() => {
        unlockPieceStyles(selection.piece);
        setSelection(null);
      }}
    />,
    document.body
  );
}

function LivePieceChrome({
  selection,
  dragging,
  onDragging,
  onClose,
}: {
  selection: Selection;
  dragging: boolean;
  onDragging: (active: boolean) => void;
  onClose: () => void;
}) {
  const { rect, piece, sectionEl, sectionId } = selection;

  const beginMove = (event: React.PointerEvent<HTMLElement>, immediate = false) => {
    startPieceMove(event.nativeEvent, selection, event.currentTarget, onDragging, onClose, immediate);
  };

  const liftForResize = (event: React.MouseEvent) => {
    event.stopPropagation();
    promotePiece(piece, sectionEl, sectionId);
    onClose();
  };

  const removePiece = (event: React.MouseEvent) => {
    event.stopPropagation();
    const store = useBuilderStore.getState();
    const page = store.getActivePage();
    const section = page?.sections.find((item) => item.id === sectionId);
    if (section) {
      const match = pieceMatchFromElement(piece);
      const detached = detachMatchingContent({ ...(section.content || {}) }, match);
      if (detached.detached) store.updateSection(sectionId, { content: detached.content });
      else piece.remove();
    }
    onClose();
  };

  const editPiece = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (piece.isContentEditable || piece.closest('[contenteditable="true"]')) {
      piece.focus();
    }
  };

  return (
    <>
      <div
        data-dnd-ignore="true"
        className="piece-focus-overlay fixed z-[191] cursor-grab touch-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: Math.max(8, rect.width),
          height: Math.max(8, rect.height),
          visibility: dragging ? 'hidden' : 'visible',
        }}
        onPointerDown={(event) => beginMove(event, true)}
      >
        <div className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-sky-400" />
      </div>
      <div
        className="piece-function-bar fixed z-[200] flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-1.5 py-1 shadow-xl"
        style={{ top: Math.max(12, rect.top - 48), left: rect.left + rect.width / 2, visibility: dragging ? 'hidden' : 'visible' }}
        data-dnd-ignore="true"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          role="button"
          tabIndex={0}
          className="flex h-8 cursor-grab select-none items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 active:cursor-grabbing"
          onPointerDown={(event) => beginMove(event, true)}
        >
          <GripVertical className="h-3.5 w-3.5" />
          Move
        </div>
        <button type="button" className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100" onClick={liftForResize}>
          <Maximize2 className="h-3.5 w-3.5" />
          Resize
        </button>
        <button type="button" className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100" onClick={editPiece}>
          <Type className="h-3.5 w-3.5" />
          Edit
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500" onClick={removePiece}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
