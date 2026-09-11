export type TemplatePieceType = 'text' | 'image' | 'button';

export type TemplatePieceMatch = {
  html?: string;
  src?: string;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function stringsMatch(value: string, match: TemplatePieceMatch): boolean {
  if (match.src && value === match.src) return true;
  if (!match.html) return false;
  if (value === match.html) return true;
  const a = stripHtml(value);
  const b = stripHtml(match.html);
  return Boolean(a) && a === b;
}

export function detachMatchingContent(
  content: Record<string, unknown>,
  match: TemplatePieceMatch
): { content: Record<string, unknown>; detached: boolean } {
  const next: Record<string, unknown> = { ...content };

  for (const key of Object.keys(next)) {
    const value = next[key];
    if (typeof value === 'string' && stringsMatch(value, match)) {
      next[key] = '';
      return { content: next, detached: true };
    }
    if (Array.isArray(value)) {
      let detached = false;
      const mapped = value.map((item) => {
        if (detached || !item || typeof item !== 'object') return item;
        const inner = detachMatchingContent(item as Record<string, unknown>, match);
        if (inner.detached) {
          detached = true;
          return inner.content;
        }
        return item;
      });
      if (detached) {
        next[key] = mapped;
        return { content: next, detached: true };
      }
    } else if (value && typeof value === 'object') {
      const inner = detachMatchingContent(value as Record<string, unknown>, match);
      if (inner.detached) {
        next[key] = inner.content;
        return { content: next, detached: true };
      }
    }
  }

  return { content: next, detached: false };
}

export function pieceTypeFromElement(element: HTMLElement): TemplatePieceType {
  if (element.tagName === 'IMG' || element.closest('img')) return 'image';
  if (element.closest('button, a[class*="btn"], a[class*="rounded"]')) return 'button';
  return 'text';
}

export function pieceMatchFromElement(element: HTMLElement): TemplatePieceMatch {
  const image = (element.tagName === 'IMG' ? element : element.querySelector('img')) as HTMLImageElement | null;
  if (image?.src) return { src: image.src, html: image.alt || '' };
  return { html: element.innerHTML || element.textContent || '' };
}

const NAMED_PIECE_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,img,button,a,li,blockquote,figcaption,label';
const BLOCK_PIECE_SELECTOR = 'div,span,article,figure,header,aside';

function isChrome(node: Element): boolean {
  return Boolean(
    node.closest(
      'svg, path, .floating-component, .piece-function-bar, .piece-focus-overlay, .comp-toolbar, [data-dnd-ignore="true"], [data-canvas-kind="navbar"], [data-canvas-kind="footer"]'
    )
  );
}

function isUsableNamedPiece(element: HTMLElement): boolean {
  if (element.tagName === 'IMG') return true;
  const text = (element.textContent || '').trim();
  const html = (element.innerHTML || '').trim();
  if (html.startsWith('<svg') || (text.length < 2 && !element.querySelector('img'))) return false;
  return true;
}

function isUsableBlockPiece(element: HTMLElement): boolean {
  const section = element.closest('[data-section-id]');
  if (!section || element === section || element.hasAttribute('data-section-id')) return false;
  if ((element.textContent || '').trim().length < 2 && !element.querySelector('img')) return false;
  const box = element.getBoundingClientRect();
  const sectionBox = section.getBoundingClientRect();
  if (box.height < 16 || box.width < 16) return false;
  if (box.height > sectionBox.height * 0.72) return false;
  if (element.children.length > 10) return false;
  return true;
}

export function findTemplatePieceTarget(eventTarget: EventTarget | null): HTMLElement | null {
  if (!(eventTarget instanceof Element) || isChrome(eventTarget)) return null;

  let node: HTMLElement | null = eventTarget instanceof HTMLElement ? eventTarget : eventTarget.parentElement;
  while (node && !node.hasAttribute('data-section-id')) {
    if (node.matches(NAMED_PIECE_SELECTOR) && isUsableNamedPiece(node)) return node;
    node = node.parentElement;
  }

  node = eventTarget instanceof HTMLElement ? eventTarget : eventTarget.parentElement;
  while (node && !node.hasAttribute('data-section-id')) {
    if (node.matches(BLOCK_PIECE_SELECTOR) && isUsableBlockPiece(node)) return node;
    node = node.parentElement;
  }

  return null;
}

export function isJunkFloatingComponent(component: { type?: string; content?: { text?: string } }): boolean {
  const text = String(component.content?.text || '').trim();
  return text.startsWith('<svg') || text.startsWith('<span class') || text.includes('xmlns="http://www.w3.org/2000/svg"');
}

export function pointInSection(clientX: number, clientY: number, zoom = 1): { sectionId: string; x: number; y: number } | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  let host = stack.find((node) => {
    if (!(node instanceof HTMLElement) || !node.dataset.sectionId) return false;
    if (node.closest('.floating-component, .piece-function-bar')) return false;
    return true;
  }) as HTMLElement | undefined;

  if (!host) {
    const sections = document.querySelectorAll<HTMLElement>('[data-section-id]');
    host = Array.from(sections).find((node) => {
      const box = node.getBoundingClientRect();
      return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
    });
  }

  if (!host?.dataset.sectionId) return null;
  const rect = host.getBoundingClientRect();
  const scale = zoom || 1;
  return {
    sectionId: host.dataset.sectionId,
    x: Math.max(0, (clientX - rect.left) / scale),
    y: Math.max(0, (clientY - rect.top) / scale),
  };
}

export function elementOffsetInSection(element: HTMLElement, sectionEl: HTMLElement, zoom = 1): { x: number; y: number; width: number; height: number } {
  const piece = element.getBoundingClientRect();
  const section = sectionEl.getBoundingClientRect();
  const scale = zoom || 1;
  return {
    x: (piece.left - section.left) / scale,
    y: (piece.top - section.top) / scale,
    width: Math.max(40, piece.width / scale),
    height: Math.max(24, piece.height / scale),
  };
}
