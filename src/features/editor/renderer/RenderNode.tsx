import type { CSSProperties } from 'react';
import type { EditorNode } from '../types/editor';

function desktopStyles(node: EditorNode): CSSProperties {
  return node.styles.desktop as CSSProperties;
}

export function RenderNode({ node }: { node: EditorNode }) {
  const style = desktopStyles(node);

  switch (node.type) {
    case 'section':
      return (
        <section style={style} data-editor-type="section">
          {(node.children || []).map((child) => (
            <RenderNode key={child.id} node={child} />
          ))}
        </section>
      );
    case 'container':
      return (
        <div style={style} data-editor-type="container">
          {(node.children || []).map((child) => (
            <RenderNode key={child.id} node={child} />
          ))}
        </div>
      );
    case 'heading': {
      const Tag = (node.props.tag as 'h1' | 'h2' | 'h3') || 'h2';
      return <Tag style={style}>{String(node.props.text || '')}</Tag>;
    }
    case 'text':
      return <p style={style}>{String(node.props.text || '')}</p>;
    case 'button':
      return (
        <button type="button" style={style}>
          {String(node.props.label || 'Button')}
        </button>
      );
    case 'image':
      return (
        <img
          src={String(node.props.src || '')}
          alt={String(node.props.alt || '')}
          style={style}
          draggable={false}
        />
      );
    default:
      return null;
  }
}
