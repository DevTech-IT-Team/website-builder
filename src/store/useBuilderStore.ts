import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist } from 'zustand/middleware';
import {
    getBlankPage,
    getBusinessPage,
    getPortfolioPage,
    getEcommercePage,
    getConsultantPage,
    getAgenciesPage,
    getCoachPage
} from '@/lib/defaultPageData';
import { builderWebsiteToTemplatePayload, templateToBuilderWebsite } from '@/lib/templateBuilder';
import type { DeviceId, DropTarget, ElementType, NodeKind, SaveStatus } from '@/builder/types';
import type { PaletteDragData } from '@/builder/dnd';
import {
    addContainerToPage,
    addElementToPage,
    addItemAtDropTarget,
    addPrebuiltAtDropTarget,
    addSectionToPage,
    applyDelete,
    applyDuplicate,
    applyMove,
    applyNodePatch,
    applyStylePatch,
    copyNodeToClipboard,
    normalizeActiveSections,
    pasteClipboard,
    type CanvasClipboard,
} from '@/builder/documentOps';
import { findNode } from '@/builder/tree';

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 800;
const MAX_HISTORY = 50;

const TEMPLATE_MAP: Record<string, () => any> = {
    blank: getBlankPage,
    business: getBusinessPage,
    portfolio: getPortfolioPage,
    ecommerce: getEcommercePage,
    consultant: getConsultantPage,
    agencies: getAgenciesPage,
    coaching: getCoachPage,
};

export interface Asset {
    id: string;
    name: string;
    type: 'image' | 'video' | 'file';
    url: string;
    size?: string;
    date: string;
    scope?: 'GLOBAL' | 'WEBSITE' | 'USER';
    websiteId?: string;
    isGlobal?: boolean;
    ownerId?: string;
    ownerName?: string;
}

type AssetScope = {
    websiteId?: string;
    scope?: 'GLOBAL' | 'WEBSITE' | 'USER';
};

function normalizeAsset(raw: any, uploadScope: AssetScope = {}): Asset {
    const asset: Asset = {
        id: raw.id,
        name: raw.name,
        type: raw.type,
        url: raw.url,
        size: raw.size,
        date: raw.date ?? raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
        scope: typeof raw.scope === 'string' ? raw.scope.toUpperCase() : raw.scope,
        websiteId: raw.websiteId ?? raw.website_id,
        isGlobal: raw.isGlobal ?? raw.is_global ?? raw.global,
        ownerId: raw.ownerId ?? raw.owner_id ?? raw.user_id ?? raw.created_by ?? raw.uploaded_by,
        ownerName: raw.ownerName ?? raw.owner_name,
    };

    if (uploadScope.scope === 'GLOBAL') {
        return { ...asset, scope: 'GLOBAL', isGlobal: true, websiteId: undefined };
    }

    if (uploadScope.scope === 'USER') {
        return { ...asset, scope: 'USER', isGlobal: false };
    }

    if (uploadScope.websiteId) {
        return { ...asset, scope: 'WEBSITE', websiteId: uploadScope.websiteId, isGlobal: false };
    }

    if (asset.scope === 'USER') {
        return { ...asset, scope: 'USER', isGlobal: false };
    }

    if (asset.scope === 'GLOBAL' || asset.isGlobal) {
        return { ...asset, scope: 'GLOBAL', isGlobal: true };
    }

    return asset;
}

function attachCurrentOwner(asset: Asset): Asset {
    if (asset.ownerId) return asset;
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user?.id) {
            return { ...asset, ownerId: user.id, ownerName: asset.ownerName ?? user.name };
        }
    } catch {
        /* ignore */
    }
    return asset;
}

export interface Page {
    id: string;
    name: string;
    slug: string;
    sections: any[];
    meta: { title: string; description: string };
    navbar: any;
    footer: any;
    globalStyles: any;
}

export interface Website {
    id: string;
    name: string;
    lastEdited: string;
    status: 'Draft' | 'Published' | 'DELETED';
    pages: Page[];
    activePageId: string | null;
    templateId?: string;
    publishedUrl?: string;
    customDomain?: string;
    subdomain?: string;
    builderMeta?: any;
    sourceTemplateId?: string;
    institution?: any;
    institution_id?: string;
    owner_id?: string;
    settings?: any;
}

export interface EditorState {
    selectedSectionId: string | null;
    selectedComponentId: string | null;
    selectedNodeId: string | null;
    selectedKind: NodeKind | null;
    hoveredNodeId: string | null;
    editMode: 'content' | 'style';
    isDragging: boolean;
    zoom: number;
    device: DeviceId;
    showGrid: boolean;
    previewMode: boolean;
    showLeftPanel: boolean;
    showRightPanel: boolean;
    saveStatus: SaveStatus;
    dropTarget: DropTarget | null;
    showComponentBar: boolean;
    tour: {
        isActive: boolean;
        step: number;
        isFinished: boolean;
    };
}

export interface TemplateEditorState {
    id: string;
    name: string;
    description: string;
    category: string;
    image?: string | null;
    scope?: 'GLOBAL' | 'INSTITUTION';
}

export interface BuilderStore {
    websites: Website[];
    activeWebsiteId: string | null;
    activePageId: string | null;
    editor: EditorState;
    globalAssets: Asset[];
    websiteAssetsByWebsiteId: Record<string, Asset[]>;
    history: Page[][];
    historyIndex: number;
    templateEditor: TemplateEditorState | null;
    clipboard: CanvasClipboard | null;

    setWebsites: (websites: Website[]) => void;
    startTemplateEditing: (template: any) => void;
    stopTemplateEditing: () => void;
    fetchWebsites: (institutionId?: string, isAdmin?: boolean) => Promise<void>;
    fetchAssets: (scope?: AssetScope) => Promise<void>;
    createWebsite: (name: string, template?: string, institutionId?: string) => Promise<string>;
    updateWebsite: (id: string, updates: Partial<Website>) => Promise<void>;
    selectWebsite: (id: string) => Promise<void>;
    deleteWebsite: (id: string) => Promise<void>;
    restoreWebsite: (id: string) => Promise<void>;
    setActivePage: (pageId: string) => void;
    addPage: (pageData: Partial<Page>) => void;
    renamePage: (pageId: string, name: string) => void;
    setHomePage: (pageId: string) => void;
    duplicatePage: (pageId: string) => void;
    deletePage: (pageId: string) => void;
    saveActiveWebsite: () => Promise<void>;
    updatePageSEO: (pageId: string, seoUpdates: Partial<{ title: string; description: string }>) => void;
    updateWebsitePages: (newPages: Page[]) => void;
    addSection: (section: any, index?: number) => void;
    updateSection: (sectionId: string, updates: any) => void;
    deleteSection: (sectionId: string) => void;
    reorderSections: (ids: string[]) => void;
    addComponent: (sectionId: string, component: any) => string | null;
    updateComponent: (sectionId: string, componentId: string, updates: any, options?: { persist?: boolean }) => void;
    deleteComponent: (sectionId: string, componentId: string) => void;
    moveComponent: (fromSectionId: string, toSectionId: string, componentId: string, position?: { x: number; y: number }) => void;
    addAsset: (asset: Omit<Asset, 'id' | 'date'>) => void;
    uploadAsset: (file: File, scope?: AssetScope) => Promise<Asset>;
    importAssetFromUrl: (name: string, url: string, scope?: AssetScope) => Promise<Asset>;
    deleteAsset: (id: string, scope?: AssetScope) => Promise<void>;
    getScopedAssets: (websiteId?: string) => Asset[];
    getActiveWebsite: () => Website | undefined;
    getActivePage: () => Page | null;
    updateCurrentPage: (updates: Partial<Page>) => void;
    updateAllPagesGlobalStyles: (globalStyles: Record<string, any>) => void;
    applyPaletteToAllPages: (palette: { primary: string; secondary: string; accent: string; background: string; text: string; alternate: string; alternateText: string; name: string }) => void;
    applyFXToAllPages: (fx: { radius: string; shadow: string; animation: string; glass?: boolean }) => void;
    updateNavbar: (updates: any) => void;
    updateFooter: (updates: any) => void;
    setEditorState: (updates: Partial<EditorState>) => void;
    setTourState: (updates: Partial<EditorState['tour']>) => void;
    selectSection: (id: string | null) => void;
    selectComponent: (id: string | null) => void;
    selectNode: (id: string | null, kind?: NodeKind | null) => void;
    setDevice: (device: DeviceId) => void;
    setZoom: (zoom: number) => void;
    setSaveStatus: (status: SaveStatus) => void;
    setDropTarget: (target: DropTarget | null) => void;
    addCanvasElement: (type: ElementType) => string | null;
    addCanvasContainer: () => string | null;
    addCanvasSection: (section?: Record<string, unknown>) => string | null;
    updateCanvasNode: (id: string, patch: Record<string, unknown>) => void;
    updateCanvasStyles: (id: string, patch: Record<string, unknown>) => void;
    deleteCanvasNode: (id: string) => void;
    duplicateCanvasNode: (id: string) => string | null;
    moveCanvasNode: (id: string, target: DropTarget) => void;
    addPaletteItem: (item: PaletteDragData, target: DropTarget | null, prebuilt?: Record<string, unknown>) => string | null;
    copyCanvasNode: (id?: string | null) => void;
    pasteCanvasNode: () => string | null;
    undo: () => void;
    redo: () => void;
}

const useBuilderStore = create<BuilderStore>()(
    persist(
        (set, get) => ({
            // State
            websites: [],
            activeWebsiteId: null,
            activePageId: null,
            editor: {
                selectedSectionId: null,
                selectedComponentId: null,
                selectedNodeId: null,
                selectedKind: null,
                hoveredNodeId: null,
                editMode: 'content',
                isDragging: false,
                zoom: 100,
                device: 'desktop',
                showGrid: false,
                previewMode: false,
                showLeftPanel: true,
                showRightPanel: true,
                saveStatus: 'idle',
                dropTarget: null,
                showComponentBar: false,
                tour: {
                    isActive: false,
                    step: 0,
                    isFinished: false,
                },
            },
            globalAssets: [],
            websiteAssetsByWebsiteId: {},
            history: [],
            historyIndex: -1,
            templateEditor: null,
            clipboard: null,

            // Actions
            setWebsites: (websites) => set({ websites }),

            startTemplateEditing: (template) => {
                const templateWebsite = templateToBuilderWebsite(template);
                set((state) => ({
                    websites: [
                        ...state.websites.filter((website) => website.id !== templateWebsite.id),
                        templateWebsite,
                    ],
                    activeWebsiteId: templateWebsite.id,
                    activePageId: templateWebsite.activePageId,
                    history: [templateWebsite.pages],
                    historyIndex: 0,
                    templateEditor: {
                        id: template.id,
                        name: template.name,
                        description: template.description || '',
                        category: template.category || 'General',
                        image: template.image || null,
                        scope: template.scope,
                    },
                    editor: {
                        ...state.editor,
                        selectedSectionId: null,
                        selectedComponentId: null,
                        selectedNodeId: null,
                        selectedKind: null,
                        showLeftPanel: true,
                        showRightPanel: true,
                        previewMode: false,
                        saveStatus: 'idle',
                        device: 'desktop',
                        zoom: 100,
                        showComponentBar: false,
                    }
                }));
            },

            stopTemplateEditing: () => set({ templateEditor: null }),

            fetchAssets: async (scope = {}) => {
                try {
                    const { default: assetApi } = await import('../api/assets');
                    const response = await assetApi.listAssets(scope);
                    const assets = (response.data.assets || []).map((raw: any) => normalizeAsset(raw, scope));

                    if (scope.websiteId) {
                        set((state) => ({
                            websiteAssetsByWebsiteId: {
                                ...state.websiteAssetsByWebsiteId,
                                [scope.websiteId as string]: assets,
                            }
                        }));
                        return;
                    }

                    set((state) => {
                        const byId = new Map(state.globalAssets.map((asset) => [asset.id, asset]));
                        assets.forEach((asset: Asset) => {
                            const prev = byId.get(asset.id);
                            if (prev && (prev.scope === 'USER' || (!prev.isGlobal && prev.ownerId))) {
                                byId.set(asset.id, {
                                    ...asset,
                                    scope: 'USER',
                                    isGlobal: false,
                                    ownerId: prev.ownerId ?? asset.ownerId,
                                    ownerName: prev.ownerName ?? asset.ownerName,
                                });
                                return;
                            }
                            byId.set(asset.id, asset);
                        });
                        return { globalAssets: Array.from(byId.values()) };
                    });
                } catch (error) {
                    console.error('Failed to fetch assets from backend:', error);
                }
            },

            fetchWebsites: async (institutionId?: string, isAdmin = false) => {
                try {
                    const { default: websiteApi } = await import('../api/website');
                    let response;
                    
                    if (isAdmin) {
                        response = await websiteApi.getWebsitesAll(institutionId ? { institution_id: institutionId } : undefined);
                    } else {
                        response = await websiteApi.getWebsites(institutionId ? { institution_id: institutionId } : undefined);
                    }
                    
                    const rawWebsites = (response.data && response.data.websites) || [];
                    const websitesFromBackend = Array.isArray(rawWebsites) ? rawWebsites : (rawWebsites.websites || []);
                    
                    const existingById = new Map(get().websites.map((site) => [site.id, site]));
                    const mapWebsite = (w: any) => {
                        const mapped = {
                            id: w.id,
                            name: w.name,
                            status: w.status,
                            lastEdited: w.updated_at || w.created_at,
                            pages: w.content?.pages || [],
                            activePageId: w.content?.activePageId || null,
                            templateId: w.content?.templateId || 'blank',
                            publishedUrl: w.content?.builderMeta?.publishedUrl || undefined,
                            subdomain: w.content?.builderMeta?.subdomain || undefined,
                            customDomain: w.content?.builderMeta?.customDomain || undefined,
                            builderMeta: w.content?.builderMeta || undefined,
                            sourceTemplateId: w.source_template_id || w.content?.sourceTemplateId || undefined,
                            institution: w.institution,
                            institution_id: w.institution_id,
                            owner_id: w.owner_id,
                            settings: w.settings
                        };
                        const existing = existingById.get(w.id);
                        if (existing?.pages?.length) {
                            return {
                                ...mapped,
                                pages: existing.pages,
                                activePageId: existing.activePageId || mapped.activePageId,
                                templateId: existing.templateId || mapped.templateId,
                                builderMeta: existing.builderMeta || mapped.builderMeta,
                            };
                        }
                        return mapped;
                    };

                    const activeWebsites = websitesFromBackend.map(mapWebsite);

                    // Also fetch deleted websites so the Deleted tab stays populated
                    let deletedWebsites: any[] = [];
                    try {
                        const deletedResponse = await websiteApi.getWebsites(
                            Object.assign(
                                institutionId ? { institution_id: institutionId } : {},
                                { status: 'DELETED' }
                            )
                        );
                        const rawDeleted = (deletedResponse.data && deletedResponse.data.websites) || [];
                        const deletedFromBackend = Array.isArray(rawDeleted) ? rawDeleted : (rawDeleted.websites || []);
                        deletedWebsites = deletedFromBackend.map(mapWebsite);
                    } catch {
                        // If the backend doesn't support status filter, just continue without deleted
                    }

                    // Merge: active + deleted, deduplicated by id
                    const deletedIds = new Set(deletedWebsites.map((w: any) => w.id));
                    const merged = [
                        ...activeWebsites.filter((w: any) => !deletedIds.has(w.id)),
                        ...deletedWebsites,
                    ];
                    existingById.forEach((site) => {
                        if (!merged.some((item) => item.id === site.id)) {
                            merged.push(site);
                        }
                    });

                    if (merged.length === 0 && existingById.size > 0) {
                        return;
                    }

                    set({ websites: merged });
                } catch (error) {
                    console.error("Failed to fetch websites from backend:", error);
                }
            },

            createWebsite: async (name, template = 'blank', institutionId?: string) => {
                const isLocalTemplate = Boolean(TEMPLATE_MAP[template]);
                const templateFn = TEMPLATE_MAP[template] || TEMPLATE_MAP.blank;
                const homePage = templateFn();
                const initialContent = {
                    pages: [homePage],
                    activePageId: homePage.id,
                    templateId: template
                };
                const createPayload: Record<string, unknown> = {
                    name,
                    ...(institutionId ? { institution_id: institutionId } : {})
                };

                if (isLocalTemplate) {
                    createPayload.content = initialContent;
                } else {
                    createPayload.template_id = template;
                }

                try {
                    const { default: websiteApi } = await import('../api/website');
                    const response = await websiteApi.createWebsite(createPayload);
                    
                    const w = response.data.website;
                    const backendPages = w.content?.pages;
                    const localPages = Array.isArray(backendPages) && backendPages.length > 0
                        ? backendPages
                        : initialContent.pages;
                    const newWebsite: Website = {
                        id: w.id,
                        name: w.name,
                        lastEdited: w.updated_at || w.created_at,
                        status: w.status,
                        pages: localPages,
                        activePageId: w.content?.activePageId || initialContent.activePageId,
                        templateId: w.content?.templateId || initialContent.templateId,
                        builderMeta: w.content?.builderMeta,
                        sourceTemplateId: w.source_template_id || w.content?.sourceTemplateId || undefined
                    };

                    set((state) => ({
                        websites: [...state.websites, newWebsite],
                        activeWebsiteId: w.id,
                        activePageId: newWebsite.activePageId,
                        history: [newWebsite.pages],
                        historyIndex: 0,
                        editor: {
                            ...state.editor,
                            tour: {
                                isActive: true,
                                step: 0,
                                isFinished: false,
                            }
                        }
                    }));
                    return w.id;
                } catch (error) {
                    console.error("Failed to create website on backend:", error);
                    throw error;
                }
            },

            updateWebsite: async (id, updates) => {
                set((state) => ({
                    websites: state.websites.map(w => w.id === id ? { ...w, ...updates } : w)
                }));
                // PATCH /websites/:id disabled — keep canvas changes local only.
                // if (updates.pages || updates.activePageId || updates.name || updates.status) {
                //     const { default: websiteApi } = await import('../api/website');
                //     await websiteApi.updateWebsite(id, { ... });
                // }
            },

            saveActiveWebsite: async () => {
                // Autosave API is off until canvas move/resize is finished.
                // Do not PATCH /websites/:id and do not flip saveStatus (avoids extra renders mid-drag).
            },

            selectWebsite: async (id) => {
                const website = get().websites.find(w => w.id === id);
                // GET /websites/:id is disabled. Opening a project uses the local store
                // so a stale or empty API payload cannot overwrite canvas changes.
                // const { default: websiteApi } = await import('../api/website');
                // const response = await websiteApi.getWebsiteById(id);
                if (website) {
                    set({
                        activeWebsiteId: id,
                        activePageId: website.activePageId || website.pages[0]?.id,
                        history: [website.pages],
                        historyIndex: 0
                    });
                } else {
                    set({ templateEditor: null });
                }
            },

            deleteWebsite: async (id: string) => {
                try {
                    const { default: websiteApi } = await import('../api/website');
                    await websiteApi.deleteWebsite(id);
                    set((state) => {
                        const website = state.websites.find(w => w.id === id);
                        if (website && website.status !== 'DELETED') {
                            return {
                                websites: state.websites.map(w => w.id === id ? { ...w, status: 'DELETED' } : w),
                                activeWebsiteId: state.activeWebsiteId === id ? null : state.activeWebsiteId
                            };
                        }
                        // If it's already DELETED, it means we are hard-deleting it
                        return {
                            websites: state.websites.filter(w => w.id !== id),
                            activeWebsiteId: state.activeWebsiteId === id ? null : state.activeWebsiteId
                        };
                    });
                } catch (error) {
                    console.error("Failed to delete website from backend:", error);
                }
            },

            restoreWebsite: async (id: string) => {
                try {
                    const { default: websiteApi } = await import('../api/website');
                    await websiteApi.restoreWebsite(id);
                    set((state) => ({
                        websites: state.websites.map(w => w.id === id ? { ...w, status: 'Draft' } : w),
                    }));
                } catch (error) {
                    console.error("Failed to restore website from backend:", error);
                    throw error;
                }
            },

            setActivePage: (pageId) => set({ activePageId: pageId }),

            addPage: (pageData) => {
                const { activeWebsiteId, websites } = get();
                if (!activeWebsiteId) return;

                const website = websites.find(w => w.id === activeWebsiteId);
                if (!website) return;

                const newPage: Page = {
                    id: uuidv4(),
                    name: pageData.name || 'New Page',
                    slug: pageData.slug || '/new-page',
                    sections: pageData.sections || [],
                    meta: {
                        title: pageData.name || 'New Page',
                        description: ''
                    },
                    navbar: website.pages[0].navbar,
                    footer: website.pages[0].footer,
                    globalStyles: website.pages[0].globalStyles,
                };

                const newPages = [...website.pages, newPage];
                get().updateWebsitePages(newPages);
                set({ activePageId: newPage.id });
                get().saveActiveWebsite();
            },

            renamePage: (pageId, name) => {
                const website = get().getActiveWebsite();
                if (!website || !name.trim()) return;
                const slug = `/${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
                const newPages = website.pages.map((page) => {
                    if (page.id !== pageId) return page;
                    return {
                        ...page,
                        name: name.trim(),
                        slug: page.slug === '/' ? '/' : slug,
                        meta: { ...page.meta, title: name.trim() },
                    };
                });
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            setHomePage: (pageId) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const nextHome = website.pages.find((page) => page.id === pageId);
                if (!nextHome) return;
                const previousHome = website.pages.find((page) => page.slug === '/');
                const newPages = website.pages.map((page) => {
                    if (page.id === pageId) return { ...page, slug: '/' };
                    if (previousHome && page.id === previousHome.id) {
                        const fallback = `/${page.name.toLowerCase().replace(/\s+/g, '-') || 'home'}`;
                        return { ...page, slug: fallback === '/' ? '/home' : fallback };
                    }
                    return page;
                });
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            duplicatePage: (pageId) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const page = website.pages.find(p => p.id === pageId);
                if (!page) return;

                const newPage = {
                    ...page,
                    id: uuidv4(),
                    name: `${page.name} (Copy)`,
                    slug: `${page.slug}-copy`,
                };

                get().updateWebsitePages([...website.pages, newPage]);
                get().saveActiveWebsite();
            },

            deletePage: (pageId) => {
                const website = get().getActiveWebsite();
                if (!website || website.pages.length <= 1) return;

                const newPages = website.pages.filter(p => p.id !== pageId);
                const nextActiveId = website.activePageId === pageId ? newPages[0].id : website.activePageId;

                set((state) => ({
                    activePageId: nextActiveId,
                    websites: state.websites.map(w =>
                        w.id === state.activeWebsiteId ? { ...w, pages: newPages, activePageId: nextActiveId } : w
                    )
                }));
                get().saveActiveWebsite();
            },

            updatePageSEO: (pageId, seoUpdates) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const newPages = website.pages.map(p =>
                    p.id === pageId ? { ...p, meta: { ...p.meta, ...seoUpdates } } : p
                );
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            updateWebsitePages: (newPages) => {
                const { activeWebsiteId, history, historyIndex } = get();
                if (!activeWebsiteId) return;

                let newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(newPages);
                if (newHistory.length > MAX_HISTORY) {
                    newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
                }

                set((state) => ({
                    websites: state.websites.map(w =>
                        w.id === activeWebsiteId ? { ...w, pages: newPages, lastEdited: new Date().toISOString() } : w
                    ),
                    history: newHistory,
                    historyIndex: newHistory.length - 1
                }));
            },

            addSection: (section, index) => {
                const page = get().getActivePage();
                if (!page) return;

                const newSections = [...page.sections];
                const targetIndex = index ?? newSections.length;
                newSections.splice(targetIndex, 0, section);

                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
            },

            updateSection: (sectionId, updates) => {
                const page = get().getActivePage();
                if (!page) return;

                const newSections = page.sections.map(s =>
                    s.id === sectionId ? { ...s, ...updates } : s
                );

                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
            },

            deleteSection: (sectionId) => {
                const page = get().getActivePage();
                if (!page) return;

                const newSections = page.sections.filter(s => s.id !== sectionId);
                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
            },

            reorderSections: (ids) => {
                const page = get().getActivePage();
                if (!page) return;

                const sectionMap = new Map(page.sections.map(s => [s.id, s]));
                const seen = new Set<string>();
                const ordered = ids
                    .map((id) => sectionMap.get(id))
                    .filter((section): section is NonNullable<typeof section> => {
                        if (!section || seen.has(section.id)) return false;
                        seen.add(section.id);
                        return true;
                    });
                const rest = page.sections.filter((section) => !seen.has(section.id));
                const newSections = [...ordered, ...rest].map((section, index) => ({
                    ...section,
                    order: index,
                }));

                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
            },

            addComponent: (sectionId, component) => {
                const page = get().getActivePage();
                if (!page) return null;
                const id = component.id || uuidv4();

                const newSections = page.sections.map(s => {
                    if (s.id === sectionId) {
                        return {
                            ...s,
                            components: [...(s.components || []), {
                                ...component,
                                id,
                                position: component.position || { x: 0, y: 0 },
                                style: component.style || {}
                            }]
                        };
                    }
                    return s;
                });

                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
                return id;
            },

            updateComponent: (sectionId, componentId, updates, options) => {
                const page = get().getActivePage();
                if (!page) return;

                const newSections = page.sections.map(s => {
                    if (s.id === sectionId) {
                        return {
                            ...s,
                            components: (s.components || []).map(c =>
                                c.id === componentId ? { ...c, ...updates } : c
                            )
                        };
                    }
                    return s;
                });

                get().updateCurrentPage({ sections: newSections });
                if (options?.persist !== false) get().saveActiveWebsite();
            },

            deleteComponent: (sectionId, componentId) => {
                const page = get().getActivePage();
                if (!page) return;

                const newSections = page.sections.map(s => {
                    if (s.id === sectionId) {
                        return {
                            ...s,
                            components: (s.components || []).filter(c => c.id !== componentId)
                        };
                    }
                    return s;
                });

                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
            },

            moveComponent: (fromSectionId, toSectionId, componentId, position) => {
                const page = get().getActivePage();
                if (!page) return;
                if (fromSectionId === toSectionId) {
                    if (position) get().updateComponent(fromSectionId, componentId, { position });
                    return;
                }

                let moved: Record<string, unknown> | null = null;
                const stripped = page.sections.map((section) => {
                    if (section.id !== fromSectionId) return section;
                    const components = section.components || [];
                    moved = components.find((component) => component.id === componentId) || null;
                    return { ...section, components: components.filter((component) => component.id !== componentId) };
                });
                if (!moved) return;

                const newSections = stripped.map((section) => {
                    if (section.id !== toSectionId) return section;
                    return {
                        ...section,
                        components: [
                            ...(section.components || []),
                            { ...moved, position: position || moved.position },
                        ],
                    };
                });

                get().updateCurrentPage({ sections: newSections });
                get().saveActiveWebsite();
                get().selectSection(toSectionId);
                get().selectComponent(componentId);
            },

            addAsset: (asset) => set((state) => ({
                globalAssets: [
                    {
                        ...asset,
                        id: uuidv4(),
                        date: new Date().toISOString(),
                        size: asset.size || '0.5 MB'
                    },
                    ...state.globalAssets
                ]
            })),

            uploadAsset: async (file, scope = {}) => {
                try {
                    const { default: assetApi } = await import('../api/assets');
                    const response = await assetApi.uploadAsset(file, scope);
                    const asset = attachCurrentOwner(normalizeAsset(response.data.asset, scope));

                    if (scope.websiteId) {
                        set((state) => ({
                            websiteAssetsByWebsiteId: {
                                ...state.websiteAssetsByWebsiteId,
                                [scope.websiteId as string]: [
                                    asset,
                                    ...(state.websiteAssetsByWebsiteId[scope.websiteId as string] || []),
                                ],
                            }
                        }));
                        return asset;
                    }

                    set((state) => ({ globalAssets: [asset, ...state.globalAssets.filter((item) => item.id !== asset.id)] }));
                    return asset;
                } catch (error) {
                    console.error('Failed to upload asset:', error);
                    throw error;
                }
            },

            importAssetFromUrl: async (name, url, scope = {}) => {
                try {
                    const { default: assetApi } = await import('../api/assets');
                    const response = await assetApi.importAssetFromUrl({ name, url }, scope);
                    const asset = attachCurrentOwner(normalizeAsset(response.data.asset, scope));

                    if (scope.websiteId) {
                        set((state) => ({
                            websiteAssetsByWebsiteId: {
                                ...state.websiteAssetsByWebsiteId,
                                [scope.websiteId as string]: [
                                    asset,
                                    ...(state.websiteAssetsByWebsiteId[scope.websiteId as string] || []),
                                ],
                            }
                        }));
                        return asset;
                    }

                    set((state) => ({ globalAssets: [asset, ...state.globalAssets.filter((item) => item.id !== asset.id)] }));
                    return asset;
                } catch (error) {
                    console.error('Failed to import asset from URL:', error);
                    throw error;
                }
            },

            deleteAsset: async (id, scope = {}) => {
                try {
                    const { default: assetApi } = await import('../api/assets');
                    await assetApi.deleteAsset(id, scope);

                    if (scope.websiteId) {
                        set((state) => ({
                            websiteAssetsByWebsiteId: {
                                ...state.websiteAssetsByWebsiteId,
                                [scope.websiteId as string]: (state.websiteAssetsByWebsiteId[scope.websiteId as string] || []).filter(a => a.id !== id),
                            }
                        }));
                        return;
                    }

                    set((state) => ({ globalAssets: state.globalAssets.filter(a => a.id !== id) }));
                } catch (error) {
                    console.error('Failed to delete asset:', error);
                    throw error;
                }
            },

            getScopedAssets: (websiteId) => {
                const { globalAssets, websiteAssetsByWebsiteId } = get();
                if (websiteId) {
                    const websiteAssets = websiteAssetsByWebsiteId[websiteId] || [];
                    // Merge global assets in, deduplicating by id (website-scoped take priority)
                    const websiteIds = new Set(websiteAssets.map((a) => a.id));
                    const merged = [...websiteAssets, ...globalAssets.filter((a) => !websiteIds.has(a.id))];
                    return merged;
                }
                return globalAssets;
            },

            getActiveWebsite: () => {
                const { websites, activeWebsiteId } = get();
                return websites.find(w => w.id === activeWebsiteId);
            },

            getActivePage: () => {
                const website = get().getActiveWebsite();
                if (!website) return null;
                return website.pages.find(p => p.id === get().activePageId) || website.pages[0];
            },

            updateCurrentPage: (updates) => {
                const website = get().getActiveWebsite();
                const activePageId = get().activePageId;
                if (!website || !activePageId) return;

                const newPages = website.pages.map(p =>
                    p.id === activePageId ? { ...p, ...updates } : p
                );

                get().updateWebsitePages(newPages);
            },

            updateAllPagesGlobalStyles: (globalStyles) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const newPages = website.pages.map(p => ({ ...p, globalStyles: { ...(p.globalStyles || {}), ...globalStyles } }));
                get().updateWebsitePages(newPages);
            },

            applyPaletteToAllPages: (palette) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const clearSectionColors = (s: any) => ({
                    ...s,
                    styles: {
                        ...s.styles,
                        backgroundColor: undefined,
                        backgroundGradient: undefined,
                        headingColor: undefined,
                        paragraphColor: undefined,
                        buttonPrimaryBg: undefined,
                        buttonPrimaryText: undefined,
                        buttonSecondaryBg: undefined,
                        buttonSecondaryText: undefined,
                        useGradient: false
                    }
                });
                const newPages = website.pages.map(p => ({
                    ...p,
                    globalStyles: {
                        ...(p.globalStyles || {}),
                        primaryColor: palette.primary,
                        secondaryColor: palette.secondary,
                        accentColor: palette.accent,
                        backgroundColor: palette.background,
                        textColor: palette.text,
                        alternateBackground: palette.alternate,
                        alternateTextColor: palette.alternateText,
                        selectedPalette: palette.name
                    },
                    sections: (p.sections || []).map(clearSectionColors),
                    navbar: { ...(p.navbar || {}), styles: { ...((p.navbar as any)?.styles || {}), backgroundColor: undefined, textColor: undefined } },
                    footer: { ...(p.footer || {}), styles: { ...((p.footer as any)?.styles || {}), backgroundColor: undefined, textColor: undefined } }
                }));
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            applyFXToAllPages: (fx) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const clearSectionFX = (s: any) => ({
                    ...s,
                    styles: { ...s.styles, borderRadius: undefined, shadows: undefined }
                });
                const newPages = website.pages.map(p => ({
                    ...p,
                    globalStyles: {
                        ...(p.globalStyles || {}),
                        borderRadius: fx.radius,
                        shadows: fx.shadow,
                        animations: fx.animation,
                        glassmorphism: fx.glass || false
                    },
                    sections: (p.sections || []).map(clearSectionFX)
                }));
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            updateNavbar: (updates) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const newPages = website.pages.map(p => ({
                    ...p,
                    navbar: { ...(p.navbar || {}), ...updates }
                }));
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            updateFooter: (updates) => {
                const website = get().getActiveWebsite();
                if (!website) return;
                const newPages = website.pages.map(p => ({
                    ...p,
                    footer: { ...(p.footer || {}), ...updates }
                }));
                get().updateWebsitePages(newPages);
                get().saveActiveWebsite();
            },

            setEditorState: (updates) => set((state) => ({
                editor: { ...state.editor, ...updates }
            })),

            setTourState: (updates) => set((state) => ({
                editor: {
                    ...state.editor,
                    tour: { ...state.editor.tour, ...updates }
                }
            })),

            selectSection: (id) => set((state) => ({
                editor: {
                    ...state.editor,
                    selectedSectionId: id,
                    selectedComponentId: null,
                    selectedNodeId: id,
                    selectedKind: id ? 'section' : null,
                    showComponentBar: false,
                    showRightPanel: id ? true : state.editor.showRightPanel,
                }
            })),

            selectComponent: (id) => set((state) => ({
                editor: {
                    ...state.editor,
                    selectedComponentId: id,
                    selectedNodeId: id,
                    selectedKind: id ? 'element' : state.editor.selectedKind,
                    showComponentBar: id ? state.editor.showComponentBar : false,
                    showRightPanel: !!id || state.editor.showRightPanel,
                }
            })),

            selectNode: (id, kind = null) => set((state) => {
                const page = get().getActivePage();
                const location = page ? findNode(page.sections || [], id) : null;
                const resolvedKind = kind || location?.kind || null;
                return {
                    editor: {
                        ...state.editor,
                        selectedNodeId: id,
                        selectedKind: id ? resolvedKind : null,
                        selectedSectionId: resolvedKind === 'section'
                            ? id
                            : location?.section?.id || (resolvedKind === 'navbar' || resolvedKind === 'footer' ? null : state.editor.selectedSectionId),
                        selectedComponentId: location?.isFloating ? id : null,
                        showRightPanel: true,
                    }
                };
            }),

            setDevice: (device) => set((state) => ({
                editor: { ...state.editor, device }
            })),

            setZoom: (zoom) => set((state) => ({
                editor: { ...state.editor, zoom: Math.max(25, Math.min(200, zoom)) }
            })),

            setSaveStatus: (status) => set((state) => ({
                editor: { ...state.editor, saveStatus: status }
            })),

            setDropTarget: (target) => set((state) => ({
                editor: { ...state.editor, dropTarget: target }
            })),

            addCanvasElement: (type) => {
                const page = get().getActivePage();
                if (!page) return null;
                const result = addElementToPage(page, get().editor.selectedNodeId, type);
                get().updateCurrentPage({ sections: result.sections });
                get().saveActiveWebsite();
                get().selectNode(result.selectId, result.selectKind);
                return result.selectId;
            },

            addCanvasContainer: () => {
                const page = get().getActivePage();
                if (!page) return null;
                const result = addContainerToPage(page, get().editor.selectedNodeId);
                get().updateCurrentPage({ sections: result.sections });
                get().saveActiveWebsite();
                get().selectNode(result.selectId, result.selectKind);
                return result.selectId;
            },

            addCanvasSection: (section) => {
                const page = get().getActivePage();
                if (!page) return null;
                const result = addSectionToPage(page, get().editor.selectedNodeId, section);
                get().updateCurrentPage({ sections: result.sections });
                get().saveActiveWebsite();
                get().selectNode(result.selectId, result.selectKind);
                return result.selectId;
            },

            updateCanvasNode: (id, patch) => {
                const page = get().getActivePage();
                if (!page) return;
                const found = findNode(normalizeActiveSections(page), id);
                if (found?.node.locked && !('locked' in patch) && !('visible' in patch) && !('visibility' in patch)) return;
                get().updateCurrentPage({ sections: applyNodePatch(page, id, patch) });
                get().saveActiveWebsite();
            },

            updateCanvasStyles: (id, patch) => {
                const page = get().getActivePage();
                if (!page) return;
                const found = findNode(normalizeActiveSections(page), id);
                if (found?.node.locked) return;
                get().updateCurrentPage({ sections: applyStylePatch(page, id, get().editor.device, patch) });
                get().saveActiveWebsite();
            },

            deleteCanvasNode: (id) => {
                if (id === 'footer') {
                    const website = get().getActiveWebsite();
                    if (!website) return;
                    get().updateWebsitePages(website.pages.map((page) => ({ ...page, footer: null })));
                    get().saveActiveWebsite();
                    get().selectNode(null);
                    return;
                }
                const page = get().getActivePage();
                if (!page) return;
                const found = findNode(normalizeActiveSections(page), id);
                if (found?.node.locked) return;
                const next = applyDelete(page, id);
                if (!next) return;
                const parentId = found?.kind === 'element' ? found.container?.id : found?.kind === 'container' ? found.section?.id : null;
                const parentKind = found?.kind === 'element' ? 'container' as const : found?.kind === 'container' ? 'section' as const : null;
                get().updateCurrentPage({ sections: next });
                get().saveActiveWebsite();
                if (parentId && parentKind) {
                    get().selectNode(parentId, parentKind);
                } else {
                    set((state) => ({
                        editor: {
                            ...state.editor,
                            selectedNodeId: null,
                            selectedKind: null,
                            selectedSectionId: state.editor.selectedSectionId === id ? null : state.editor.selectedSectionId,
                            selectedComponentId: state.editor.selectedComponentId === id ? null : state.editor.selectedComponentId,
                        }
                    }));
                }
            },

            duplicateCanvasNode: (id) => {
                const page = get().getActivePage();
                if (!page) return null;
                const found = findNode(normalizeActiveSections(page), id);
                if (found?.node.locked) return null;
                const result = applyDuplicate(page, id);
                if (!result) return null;
                get().updateCurrentPage({ sections: result.sections });
                get().saveActiveWebsite();
                get().selectNode(result.newId);
                return result.newId;
            },

            moveCanvasNode: (id, target) => {
                const page = get().getActivePage();
                if (!page) return;
                const next = applyMove(page, id, target);
                if (!next) return;
                get().updateCurrentPage({ sections: next });
                get().saveActiveWebsite();
            },

            addPaletteItem: (item, target, prebuilt) => {
                const page = get().getActivePage();
                if (!page) return null;
                const result = prebuilt
                    ? addPrebuiltAtDropTarget(page, prebuilt, target)
                    : addItemAtDropTarget(page, item, target);
                get().updateCurrentPage({ sections: result.sections });
                get().saveActiveWebsite();
                get().selectNode(result.selectId, result.selectKind);
                return result.selectId;
            },

            copyCanvasNode: (id) => {
                const page = get().getActivePage();
                const nodeId = id || get().editor.selectedNodeId;
                if (!page || !nodeId) return;
                const clipboard = copyNodeToClipboard(page, nodeId);
                if (clipboard) set({ clipboard });
            },

            pasteCanvasNode: () => {
                const page = get().getActivePage();
                const clipboard = get().clipboard;
                if (!page || !clipboard) return null;
                const result = pasteClipboard(page, clipboard, get().editor.selectedNodeId);
                if (!result) return null;
                get().updateCurrentPage({ sections: result.sections });
                get().saveActiveWebsite();
                get().selectNode(result.selectId, result.selectKind);
                return result.selectId;
            },

            undo: () => {
                const { history, historyIndex, activeWebsiteId } = get();
                if (historyIndex <= 0) return;

                const prevPages = history[historyIndex - 1];
                set((state) => ({
                    historyIndex: historyIndex - 1,
                    websites: state.websites.map(w =>
                        w.id === activeWebsiteId ? { ...w, pages: prevPages } : w
                    )
                }));
                get().saveActiveWebsite();
            },

            redo: () => {
                const { history, historyIndex, activeWebsiteId } = get();
                if (historyIndex >= history.length - 1) return;

                const nextPages = history[historyIndex + 1];
                set((state) => ({
                    historyIndex: historyIndex + 1,
                    websites: state.websites.map(w =>
                        w.id === activeWebsiteId ? { ...w, pages: nextPages } : w
                    )
                }));
            }
        }),
        {
            name: 'website-builder-storage',
            partialize: (state) => ({
                websites: state.websites,
                activeWebsiteId: state.activeWebsiteId,
                activePageId: state.activePageId,
                globalAssets: state.globalAssets,
                websiteAssetsByWebsiteId: state.websiteAssetsByWebsiteId,
            }),
        }
    )
);

export default useBuilderStore;
