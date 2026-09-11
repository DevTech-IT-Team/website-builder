import { describe, expect, it } from 'vitest';
import { canAcceptChild, cloneNode, collectAllIds, findNode, insertElement, insertSection, moveNode, removeNode, validateMove } from './tree';
import { applyDuplicate, applyMove, copyNodeToClipboard, pasteClipboard } from './documentOps';
import { createCanvasSection, createTextElement, createButtonElement, createContainer } from './defaults';
import { insertContainer } from './tree';
import type { CanvasSection } from './types';
import { parseDragId, resolveDropAction } from './dnd';

function fourSections(pageId = 'page-1'): CanvasSection[] {
  return ['A', 'B', 'C', 'D'].map((name, index) => {
    const section = createCanvasSection(pageId, index, name);
    return { ...section, name };
  });
}

describe('canvas tree', () => {
  it('enforces parent-child relationships', () => {
    expect(canAcceptChild('page', 'section')).toBe(true);
    expect(canAcceptChild('section', 'container')).toBe(true);
    expect(canAcceptChild('container', 'text')).toBe(true);
    expect(canAcceptChild('container', 'section')).toBe(false);
    expect(canAcceptChild('element', 'text')).toBe(false);
  });

  it('inserts, finds, and moves elements by id', () => {
    const pageId = 'page-1';
    const section = createCanvasSection(pageId, 0);
    const container = section.children[0];
    let sections: CanvasSection[] = [section];
    const text = createTextElement(container.id, 0);
    sections = insertElement(sections, container.id, text, 0);

    const found = findNode(sections, text.id);
    expect(found?.kind).toBe('element');
    expect(found?.container?.id).toBe(container.id);

    const extra = createCanvasSection(pageId, 1);
    sections = insertSection(sections, extra, 1);
    sections = moveNode(sections, section.id, { parentId: pageId, parentKind: 'page', index: 2 });
    expect(sections[1].id).toBe(section.id);

    sections = removeNode(sections, text.id);
    expect(findNode(sections, text.id)).toBeNull();
  });

  it('reorders sections and keeps order values normalized', () => {
    const pageId = 'page-1';
    let sections = fourSections(pageId);
    const pricing = sections[2];
    sections = moveNode(sections, pricing.id, { parentId: pageId, parentKind: 'page', index: 1 });
    expect(sections.map((section) => section.name)).toEqual(['A', 'C', 'B', 'D']);
    expect(sections.map((section) => section.order)).toEqual([0, 1, 2, 3]);
    expect(sections.every((section) => section.parentId === pageId)).toBe(true);
  });

  it('moves a node after a later sibling without losing index', () => {
    const pageId = 'page-1';
    let sections = fourSections(pageId);
    const b = sections[1];
    sections = moveNode(sections, b.id, { parentId: pageId, parentKind: 'page', index: 4 });
    expect(sections.map((section) => section.name)).toEqual(['A', 'C', 'D', 'B']);
  });

  it('moves containers within a section', () => {
    const pageId = 'page-1';
    const section = createCanvasSection(pageId, 0);
    const second = createContainer(section.id, 1);
    let sections = insertContainer([section], section.id, second, 1);
    const firstId = sections[0].children[0].id;
    const secondId = sections[0].children[1].id;
    sections = moveNode(sections, secondId, { parentId: section.id, parentKind: 'section', index: 0 });
    expect(sections[0].children.map((container) => container.id)).toEqual([secondId, firstId]);
    expect(sections[0].children.map((container) => container.order)).toEqual([0, 1]);
    expect(sections[0].children[0].parentId).toBe(section.id);
  });

  it('moves elements between containers', () => {
    const pageId = 'page-1';
    const section = createCanvasSection(pageId, 0);
    const extra = createContainer(section.id, 1);
    let sections = insertContainer([section], section.id, extra, 1);
    const source = sections[0].children[0];
    const target = sections[0].children[1];
    const button = createButtonElement(source.id, 0);
    sections = insertElement(sections, source.id, button, 0);
    sections = moveNode(sections, button.id, { parentId: target.id, parentKind: 'container', index: 0 });
    expect(findNode(sections, button.id)?.container?.id).toBe(target.id);
    expect(sections[0].children[0].children.find((element) => element.id === button.id)).toBeUndefined();
    expect(sections[0].children[1].children[0].parentId).toBe(target.id);
  });

  it('rejects invalid moves', () => {
    const pageId = 'page-1';
    const section = createCanvasSection(pageId, 0);
    const text = createTextElement(section.children[0].id, 0);
    let sections = insertElement([section], section.children[0].id, text, 0);
    const extra = createCanvasSection(pageId, 1);
    sections = insertSection(sections, extra, 1);

    expect(validateMove(sections, text.id, { parentId: extra.id, parentKind: 'section', index: 0 })).toBe(false);
    expect(validateMove(sections, section.id, { parentId: extra.children[0].id, parentKind: 'container', index: 0 })).toBe(false);
    expect(validateMove(sections, section.id, { parentId: section.id, parentKind: 'page', index: 0 })).toBe(false);
    expect(validateMove(sections, section.id, { parentId: section.children[0].id, parentKind: 'container', index: 0 })).toBe(false);
    expect(validateMove(sections, section.children[0].id, { parentId: text.id, parentKind: 'element', index: 0 })).toBe(false);
    expect(moveNode(sections, text.id, { parentId: extra.id, parentKind: 'section', index: 0 })).toBe(sections);
  });

  it('clones trees with unique ids and rewritten parent ids', () => {
    const pageId = 'page-1';
    const section = createCanvasSection(pageId, 0);
    const text = createTextElement(section.children[0].id, 0);
    text.content = { text: 'Hello', nested: { a: 1 } } as Record<string, unknown>;
    const sections = insertElement([section], section.children[0].id, text, 0);
    const cloned = cloneNode(sections, section.id, pageId);
    expect(cloned).not.toBeNull();
    const ids = collectAllIds(cloned!.sections);
    expect(new Set(ids).size).toBe(ids.length);
    const copy = cloned!.sections[1];
    expect(copy.id).not.toBe(section.id);
    expect(copy.parentId).toBe(pageId);
    expect(copy.children[0].id).not.toBe(section.children[0].id);
    expect(copy.children[0].parentId).toBe(copy.id);
    expect(copy.children[0].children[0].parentId).toBe(copy.children[0].id);
    expect(copy.children[0].children[0].content).toEqual(text.content);
    copy.children[0].children[0].content.nested = { a: 2 };
    expect((text.content as { nested: { a: number } }).nested.a).toBe(1);
  });
});

describe('document ops', () => {
  it('applyMove uses after-edge indexes and skips invalid work', () => {
    const page = { id: 'page-1', sections: fourSections('page-1') };
    const moved = applyMove(page, page.sections[1].id, {
      parentId: 'page-1',
      parentKind: 'page',
      index: 3,
      edge: 'after',
      accepts: ['section'],
    });
    expect(moved?.map((section) => section.name)).toEqual(['A', 'C', 'D', 'B']);
    expect(applyMove(page, page.sections[0].id, {
      parentId: page.sections[0].children[0].id,
      parentKind: 'container',
      index: 0,
      edge: 'inside',
      accepts: [],
    })).toBeNull();
  });

  it('duplicates and pastes with new ids', () => {
    const section = createCanvasSection('page-1', 0);
    const page = { id: 'page-1', sections: [section] };
    const duplicated = applyDuplicate(page, section.id);
    expect(duplicated).not.toBeNull();
    expect(collectAllIds(duplicated!.sections).filter((id, index, ids) => ids.indexOf(id) !== index)).toEqual([]);
    const clipboard = copyNodeToClipboard({ id: 'page-1', sections: duplicated!.sections }, section.id);
    expect(clipboard?.kind).toBe('section');
    const pasted = pasteClipboard({ id: 'page-1', sections: duplicated!.sections }, clipboard!, section.id);
    expect(pasted).not.toBeNull();
    expect(new Set(collectAllIds(pasted!.sections)).size).toBe(collectAllIds(pasted!.sections).length);
  });
});

describe('dnd ids', () => {
  it('parses drag ids and resolves palette/canvas drops', () => {
    expect(parseDragId('drop:container:abc:2:before')).toEqual({
      origin: 'drop',
      parentKind: 'container',
      parentId: 'abc',
      index: 2,
      edge: 'before',
    });
    const palette = resolveDropAction(
      'palette:element:text',
      'drop:container:box:0:inside',
      { source: 'palette', itemKind: 'element', catalogId: 'text', name: 'Text', elementType: 'text' },
      { type: 'dropzone', target: { parentId: 'box', parentKind: 'container', index: 0, edge: 'inside', accepts: ['text'] } }
    );
    expect(palette).toMatchObject({ type: 'palette', target: { parentId: 'box', parentKind: 'container' } });
    const move = resolveDropAction(
      'node:element:el-1',
      'drop:container:box:1:before',
      { source: 'canvas', nodeId: 'el-1', kind: 'element', type: 'text', name: 'Text' },
      { type: 'dropzone', target: { parentId: 'box', parentKind: 'container', index: 1, edge: 'before', accepts: ['text'] } }
    );
    expect(move).toMatchObject({ type: 'move', nodeId: 'el-1', target: { parentId: 'box', index: 1, edge: 'before' } });
    const overHit = resolveDropAction(
      'node:element:el-1',
      'hit:element:el-2',
      { source: 'canvas', nodeId: 'el-1', kind: 'element', type: 'text', name: 'Text', parentId: 'box', index: 0 },
      { source: 'canvas', nodeId: 'el-2', kind: 'element', type: 'text', name: 'Text', parentId: 'box', index: 1 }
    );
    expect(overHit).toMatchObject({ type: 'move', nodeId: 'el-1', target: { parentId: 'box', index: 1, edge: 'after' } });
  });
});
