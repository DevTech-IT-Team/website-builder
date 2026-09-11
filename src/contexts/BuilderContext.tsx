import React, { createContext, useContext, useMemo } from 'react';
import useBuilderStore from '@/store/useBuilderStore';
import { v4 as uuidv4 } from 'uuid';

const BuilderContext = createContext(undefined);

export function BuilderProvider({ children, initialPage }: any) {
  const store = useBuilderStore();
  const activePage = store.getActivePage();
  const activeWebsite = store.getActiveWebsite();

  const selectedSection = store.editor.selectedSectionId && activePage
    ? activePage.sections.find((s) => s.id === store.editor.selectedSectionId) ?? null
    : null;

  const selectedComponent = store.editor.selectedComponentId && selectedSection
    ? selectedSection.components.find((c) => c.id === store.editor.selectedComponentId) ?? null
    : null;

  const value = useMemo(() => ({
    state: {
      activeWebsite,
      page: activePage,
      editor: store.editor,
      history: store.history,
      historyIndex: store.historyIndex,
    },
    selectSection: store.selectSection,
    selectComponent: store.selectComponent,
    addSection: store.addSection,
    updateSection: store.updateSection,
    toggleSectionVisibility: (id) => {
      const section = activePage?.sections?.find(s => s.id === id);
      if (section) {
        store.updateSection(id, { visible: !section.visible });
      }
    },
    updateSectionContent: (id, content) => store.updateSection(id, { content }),
    deleteSection: store.deleteSection,
    updateNavbar: store.updateNavbar,
    updateFooter: store.updateFooter,
    updatePageSEO: store.updatePageSEO,
    duplicateSection: (id) => {
      const section = activePage?.sections?.find(s => s.id === id);
      if (section) {
        store.addSection({ ...section, id: uuidv4(), name: `${section.name} (Copy)` });
      }
    },
    reorderSections: store.reorderSections,
    updateSectionStyles: (id, styleUpdates) => {
      const section = activePage?.sections?.find(s => s.id === id);
      if (section) {
        store.updateSection(id, { styles: { ...section.styles, ...styleUpdates } });
      }
    },
    setEditMode: (mode) => store.setEditorState({ editMode: mode }),
    setPreviewMode: (enabled) => store.setEditorState({ previewMode: enabled }),
    setLeftPanelVisible: (visible) => store.setEditorState({ showLeftPanel: visible }),
    setRightPanelVisible: (visible) => store.setEditorState({ showRightPanel: visible }),
    addComponent: store.addComponent,
    updateComponent: store.updateComponent,
    deleteComponent: store.deleteComponent,
    moveComponent: store.moveComponent,
    undo: store.undo,
    redo: store.redo,
    canUndo: store.historyIndex > 0,
    canRedo: store.historyIndex < store.history.length - 1,
    selectedSection,
    selectedComponent,
    pages: activeWebsite?.pages || [],
    setActivePage: store.setActivePage,
    createPage: (page) => store.addPage(page),
    addPage: (page) => store.addPage(page),
    duplicatePage: store.duplicatePage,
    deletePage: store.deletePage,
    updatePageName: (slug, name) => store.updateCurrentPage({ name }),
    updateCurrentPage: store.updateCurrentPage,
    updateAllPagesGlobalStyles: store.updateAllPagesGlobalStyles,
    applyPaletteToAllPages: store.applyPaletteToAllPages,
    applyFXToAllPages: store.applyFXToAllPages,
  }), [store, activePage, activeWebsite, selectedSection, selectedComponent]);

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}