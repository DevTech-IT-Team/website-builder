import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BuilderProvider } from "@/contexts/BuilderContext";
import useBuilderStore from "@/store/useBuilderStore";
import { useIsCompact } from "@/hooks/use-mobile";
import { EditorToolbar } from "./EditorToolbar";
import { PageManager } from "./PageManager";
import { SiteSettings } from "./SiteSettings";
import { BuilderCanvas } from "@/builder/components/Canvas";
import { CanvasDndProvider } from "@/builder/components/CanvasDnd";
import { CanvasProperties } from "@/builder/components/CanvasProperties";
import { LayersPanel } from "@/builder/components/LayersPanel";
import { ElementsPanel } from "@/builder/components/ElementsPanel";
import { TextFormattingToolbar } from "./TextFormattingToolbar";
import { GuidedTour } from "./GuidedTour";
import { AssetLibraryPanel } from "./AssetLibraryPanel";
import { DesignSystemPanel } from "./DesignSystemPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import Loading from "@/components/Common/LoadingUI";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Layers,
  FileText,
  Plus,
  Settings,
  Image as ImageIcon,
  Palette,
  History,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "add", icon: Plus, label: "Elements" },
  { id: "layers", icon: Layers, label: "Layers" },
  { id: "pages", icon: FileText, label: "Pages" },
  { id: "assets", icon: ImageIcon, label: "Assets" },
  { id: "design", icon: Palette, label: "Design" },
  { id: "history", icon: History, label: "History" },
];

function EditorSidebarPanels({ leftNavTab }: { leftNavTab: string }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
      <div className="h-full min-h-0 overflow-hidden">
        {leftNavTab === "add" && <ElementsPanel />}
        {leftNavTab === "layers" && <LayersPanel />}
        {leftNavTab === "assets" && <AssetLibraryPanel />}
        {leftNavTab === "design" && <DesignSystemPanel />}
        {leftNavTab === "pages" && <PageManager />}
        {leftNavTab === "settings" && <SiteSettings />}
        {leftNavTab === "history" && <VersionHistoryPanel />}
        {leftNavTab === "edit" && <CanvasProperties />}
      </div>
    </div>
  );
}

function NavRailButton({
  id,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  id?: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex w-full flex-col items-center gap-0.5 rounded-md px-0.5 py-1 transition-colors",
        isActive
          ? "bg-white/15 font-semibold text-white"
          : "text-slate-300 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="max-w-full px-0.5 text-center text-[8px] font-medium leading-[1.15] tracking-wide">
        {label}
      </span>
    </button>
  );
}

function EditorLeftSidebar({
  leftNavTab,
  setLeftNavTab,
  onClose,
}: {
  leftNavTab: string;
  setLeftNavTab: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="h-full w-full flex overflow-hidden bg-white">
      <div className="flex w-14 shrink-0 flex-col items-center border-r border-white/10 bg-[#131b2e]">
        <nav className="flex min-h-0 w-full flex-1 flex-col items-center bg-[#0f172a] px-0.5 py-1.5">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="mb-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
          <div className="flex w-full flex-col items-center gap-0 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavRailButton
                key={item.id}
                id={`tour-nav-${item.id}`}
                icon={item.icon}
                label={item.label}
                isActive={leftNavTab === item.id}
                onClick={() => setLeftNavTab(item.id)}
              />
            ))}
          </div>

          <div className="mt-auto w-full pt-1">
            <NavRailButton
              icon={Settings}
              label="Settings"
              isActive={leftNavTab === "settings"}
              onClick={() => setLeftNavTab("settings")}
            />
          </div>
        </nav>
      </div>

      <EditorSidebarPanels leftNavTab={leftNavTab} />
    </div>
  );
}

function EditorContent() {
  const [leftNavTab, setLeftNavTab] = useState("add");
  const store = useBuilderStore();
  const { editor, setTourState, activeWebsiteId, setEditorState, undo, redo, selectNode, deleteCanvasNode, duplicateCanvasNode, copyCanvasNode, pasteCanvasNode } = store;
  const { id } = useParams();
  const isCompact = useIsCompact();

  useEffect(() => {
    setEditorState({ showLeftPanel: !isCompact, showRightPanel: !isCompact });
  }, [isCompact, setEditorState]);

  useEffect(() => {
    if (isCompact && editor.selectedNodeId) {
      setLeftNavTab("edit");
      setEditorState({ showLeftPanel: true });
    }
  }, [editor.selectedNodeId, isCompact, setEditorState]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (editor.selectedNodeId) duplicateCanvasNode(editor.selectedNodeId);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyCanvasNode(editor.selectedNodeId);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteCanvasNode();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && editor.selectedNodeId && editor.selectedKind !== "navbar") {
        event.preventDefault();
        deleteCanvasNode(editor.selectedNodeId);
        return;
      }
      if (event.key === "Escape") {
        selectNode(null);
        if (isCompact) setEditorState({ showLeftPanel: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor.selectedNodeId, editor.selectedKind, isCompact, undo, redo, selectNode, deleteCanvasNode, duplicateCanvasNode, copyCanvasNode, pasteCanvasNode, setEditorState]);

  const showSidebar = !editor.previewMode && editor.showLeftPanel;
  const showRight = !editor.previewMode && editor.showRightPanel && !isCompact;
  const closeSidebar = () => setEditorState({ showLeftPanel: false });

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
      <EditorToolbar
        websiteId={activeWebsiteId || id}
        onTabChange={setLeftNavTab}
      />
      <TextFormattingToolbar />
      <GuidedTour />

      {!editor.tour.isActive && (
        <button
          onClick={() => setTourState({ isActive: true, step: 0, isFinished: false })}
          className="fixed bottom-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-sky-400 text-white rounded-full shadow-lg hover:bg-sky-500 transition-colors"
        >
          ?
        </button>
      )}

      <div className={`relative z-0 flex-1 min-h-0 isolate ${editor.tour.isActive ? "pointer-events-none opacity-90" : ""}`}>
        <CanvasDndProvider>
        <ResizablePanelGroup direction="horizontal" className="h-full relative z-0">
          {!isCompact && showSidebar && (
            <>
              <ResizablePanel
                defaultSize={20}
                minSize={16}
                maxSize={32}
                className="min-w-[16rem] bg-white border-r border-slate-200 flex overflow-hidden"
              >
                <EditorLeftSidebar
                  leftNavTab={leftNavTab}
                  setLeftNavTab={setLeftNavTab}
                />
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-slate-100 hover:bg-[#0F172A]/20 transition-all border-r border-slate-200" />
            </>
          )}
          <ResizablePanel
            defaultSize={editor.previewMode || isCompact ? 100 : showRight ? 56 : 80}
            className="bg-slate-100/30 overflow-hidden flex flex-col relative z-0 isolate min-w-0"
          >
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
            <ErrorBoundary
              fallback={
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-white text-slate-600">
                  <p className="text-sm font-semibold text-slate-900">The canvas failed to load</p>
                  <p className="max-w-sm text-center text-xs text-slate-500">Reload the editor or try selecting another page.</p>
                  <button
                    type="button"
                    className="rounded-full bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white"
                    onClick={() => window.location.reload()}
                  >
                    Reload editor
                  </button>
                </div>
              }
            >
              <BuilderCanvas />
            </ErrorBoundary>
          </ResizablePanel>
          {showRight && (
            <>
              <ResizableHandle className="w-1 bg-slate-100 hover:bg-[#0F172A]/20 transition-all border-l border-slate-200" />
              <ResizablePanel
                defaultSize={24}
                minSize={18}
                maxSize={36}
                className="min-w-[18rem] bg-white border-l border-slate-200 overflow-hidden"
              >
                <CanvasProperties />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {isCompact && showSidebar && (
          <>
            <button
              type="button"
              aria-label="Close sidebar"
              className="absolute inset-0 z-40 bg-slate-900/40"
              onClick={closeSidebar}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Editor sidebar"
              className="absolute z-50 inset-y-0 left-0 w-[min(22.5rem,calc(100vw-2.5rem))] max-w-full bg-white border-r border-slate-200 shadow-[8px_0_24px_-8px_rgba(15,23,42,0.28)] flex overflow-hidden"
            >
              <EditorLeftSidebar
                leftNavTab={leftNavTab}
                setLeftNavTab={setLeftNavTab}
                onClose={closeSidebar}
              />
            </aside>
          </>
        )}
        </CanvasDndProvider>
      </div>
    </div>
  );
}

export function WebsiteEditor({ initialPage }: { initialPage?: any }) {
  const { id } = useParams();
  const store = useBuilderStore();
  const { selectWebsite, activeWebsiteId } = store;

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.style.backgroundColor = "";
    return () => {
      try {
        const saved = localStorage.getItem("buildora-theme");
        if (saved === "dark") document.documentElement.classList.add("dark");
      } catch {
        // theme restore is best-effort
      }
    };
  }, []);

  useEffect(() => {
    if (id) {
      selectWebsite(id);
    }
  }, [id, selectWebsite]);

  if (!activeWebsiteId && id) {
    return <Loading fullScreen label="Loading your project" />;
  }

  return (
    <BuilderProvider initialPage={initialPage}>
      <EditorContent />
    </BuilderProvider>
  );
}
