import { describe, expect, it } from 'vitest';
import { detachMatchingContent, pieceTypeFromElement } from './templatePieces';

describe('template piece detach', () => {
  it('clears a matching headline so the piece can move to another section', () => {
    const result = detachMatchingContent(
      { headline: 'Hello world', subheadline: 'Stay' },
      { html: 'Hello world' }
    );
    expect(result.detached).toBe(true);
    expect(result.content.headline).toBe('');
    expect(result.content.subheadline).toBe('Stay');
  });

  it('clears a matching field inside feature cards', () => {
    const result = detachMatchingContent(
      {
        features: [
          { id: '1', title: 'Fast', description: 'Speed' },
          { id: '2', title: 'Safe', description: 'Lock' },
        ],
      },
      { html: 'Safe' }
    );
    expect(result.detached).toBe(true);
    expect((result.content.features as { title: string }[])[1].title).toBe('');
  });

  it('detects image vs text pieces', () => {
    const image = document.createElement('img');
    expect(pieceTypeFromElement(image)).toBe('image');
    const heading = document.createElement('h1');
    expect(pieceTypeFromElement(heading)).toBe('text');
  });
});
