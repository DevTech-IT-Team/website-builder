import { create } from 'zustand';
import { createNode } from '../registry/createNode';
import type { EditorComponentType, EditorNode, EditorPage } from '../types/editor';

type EditorStore = {
  page: EditorPage;
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;
  addNode: (type: EditorComponentType) => string;
  deleteNode: (id: string) => void;
  reorderNodes: (nodes: EditorNode[]) => void;
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  page: {
    id: crypto.randomUUID(),
    name: 'Untitled page',
    nodes: [],
  },
  selectedNodeId: null,

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  addNode: (type) => {
    const node = createNode(type);
    set((state) => ({
      page: { ...state.page, nodes: [...state.page.nodes, node] },
      selectedNodeId: node.id,
    }));
    return node.id;
  },

  deleteNode: (id) => {
    const { selectedNodeId } = get();
    set((state) => ({
      page: { ...state.page, nodes: state.page.nodes.filter((node) => node.id !== id) },
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
    }));
  },

  reorderNodes: (nodes) => {
    set((state) => ({ page: { ...state.page, nodes } }));
  },
}));
