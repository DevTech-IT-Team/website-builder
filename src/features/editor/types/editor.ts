export type EditorComponentType = 'section' | 'container' | 'heading' | 'text' | 'button' | 'image';

export type StyleMap = Record<string, string | number>;

export type ResponsiveStyles = {
  desktop: StyleMap;
  tablet: StyleMap;
  mobile: StyleMap;
};

export type EditorNode = {
  id: string;
  type: EditorComponentType;
  props: Record<string, unknown>;
  styles: ResponsiveStyles;
  children?: EditorNode[];
};

export type EditorPage = {
  id: string;
  name: string;
  nodes: EditorNode[];
};
