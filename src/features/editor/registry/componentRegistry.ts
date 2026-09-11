import type { EditorComponentType, EditorNode, ResponsiveStyles } from '../types/editor';

export type RegistryEntry = {
  type: EditorComponentType;
  label: string;
  defaultProps: Record<string, unknown>;
  defaultStyles: ResponsiveStyles;
  defaultChildren?: EditorNode[];
};

export const componentRegistry: Record<EditorComponentType, RegistryEntry> = {
  section: {
    type: 'section',
    label: 'Section',
    defaultProps: { name: 'Section' },
    defaultStyles: {
      desktop: { width: '100%', padding: '48px 32px', backgroundColor: '#ffffff' },
      tablet: { padding: '36px 24px' },
      mobile: { padding: '28px 16px' },
    },
  },
  container: {
    type: 'container',
    label: 'Container',
    defaultProps: { name: 'Container' },
    defaultStyles: {
      desktop: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1120px', margin: '0 auto', width: '100%' },
      tablet: { gap: '14px' },
      mobile: { gap: '12px' },
    },
  },
  heading: {
    type: 'heading',
    label: 'Heading',
    defaultProps: { text: 'New heading', tag: 'h2' },
    defaultStyles: {
      desktop: { fontSize: '36px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, margin: 0 },
      tablet: { fontSize: '30px' },
      mobile: { fontSize: '24px' },
    },
  },
  text: {
    type: 'text',
    label: 'Text',
    defaultProps: { text: 'Add your paragraph here.' },
    defaultStyles: {
      desktop: { fontSize: '16px', color: '#334155', lineHeight: 1.6, margin: 0 },
      tablet: { fontSize: '15px' },
      mobile: { fontSize: '14px' },
    },
  },
  button: {
    type: 'button',
    label: 'Button',
    defaultProps: { label: 'Click me', href: '#' },
    defaultStyles: {
      desktop: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 20px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        borderRadius: '10px',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
      },
      tablet: { padding: '11px 18px' },
      mobile: { padding: '10px 16px' },
    },
  },
  image: {
    type: 'image',
    label: 'Image',
    defaultProps: {
      src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      alt: 'Placeholder image',
    },
    defaultStyles: {
      desktop: { width: '100%', maxWidth: '480px', borderRadius: '12px', display: 'block' },
      tablet: { maxWidth: '100%' },
      mobile: { maxWidth: '100%' },
    },
  },
};

export const registryList = Object.values(componentRegistry);
