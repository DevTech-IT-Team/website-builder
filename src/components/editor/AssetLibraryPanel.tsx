import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Image as ImageIcon, Video, Monitor, Link as LinkIcon, Plus, Globe, X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import useBuilderStore from '@/store/useBuilderStore';
import type { Asset } from '@/store/useBuilderStore';
import { useToast } from '@/hooks/use-toast';
import { DuplicateAssetDialog } from '@/components/ui/DuplicateAssetDialog';
import { isAdminGlobalAsset, isAssetVisibleToUsers, canDeleteAsset } from '@/lib/assetVisibility';

// ── Shared card used in every tab grid ─────────────────────────────────────
interface AssetCardProps {
    item: Asset;
    copiedId: string | null;
    activeWebsiteId: string | null;
    onCopy: (id: string, url: string) => void;
    onDelete: (id: string) => void;
    onPreview: (item: Asset) => void;
}

function AssetCard({ item, copiedId, onCopy, onDelete, onPreview }: AssetCardProps) {
    const isGlobal = isAdminGlobalAsset(item);
    const canDelete = canDeleteAsset(item);
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onPreview(item)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPreview(item);
                }
            }}
            className="group relative aspect-square rounded-xl border border-slate-100 overflow-hidden bg-slate-50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
            {item.type === 'image' ? (
                <img src={item.url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <Video className="w-6 h-6 text-white/50" />
                </div>
            )}

            {isGlobal && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-amber-400/90 text-amber-900 text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    <Globe className="w-2.5 h-2.5" />
                    Global
                </div>
            )}

            {canDelete && (
                <button
                    type="button"
                    aria-label="Delete asset"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-white text-red-500 items-center justify-center hidden group-hover:flex shadow-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}

            <div className="absolute inset-x-0 bottom-0 p-2 pointer-events-none">
                <p className="text-[9px] text-white truncate font-medium drop-shadow-sm group-hover:opacity-0">{item.name}</p>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    size="sm"
                    className="h-7 text-[10px] w-full font-medium bg-[#0F172A] hover:bg-[#0F172A] text-white"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopy(item.id, item.url);
                    }}
                >
                    {copiedId === item.id ? 'Copied!' : 'Copy Link'}
                </Button>
            </div>
        </div>
    );
}

export function AssetLibraryPanel() {
    const { activeWebsiteId, deleteAsset, fetchAssets, getScopedAssets, uploadAsset, importAssetFromUrl } = useBuilderStore();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [urlName, setUrlName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // duplicate-name conflict state
    const [dupFile, setDupFile] = useState<File | null>(null);
    const [dupConflictName, setDupConflictName] = useState('');
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

    useEffect(() => {
        if (!activeWebsiteId) {
            return;
        }
        // Fetch both website-scoped assets AND global (dashboard) assets in parallel
        void fetchAssets({ websiteId: activeWebsiteId });
        void fetchAssets();
        void fetchAssets({ scope: 'GLOBAL' });
    }, [activeWebsiteId, fetchAssets]);

    const assets = activeWebsiteId ? getScopedAssets(activeWebsiteId) : [];
    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    })();
    const isAdminUser = ['ADMIN', 'SUPER_ADMIN', 'INSTITUTION_ADMIN'].includes(user?.role);
    const visibleAssets = isAdminUser
        ? assets
        : assets.filter((item) => item.websiteId === activeWebsiteId || item.scope === 'WEBSITE' || isAdminGlobalAsset(item) || isAssetVisibleToUsers(item.id, item));

    const handleDeleteLibraryAsset = (id: string) => {
        const item = assets.find((asset) => asset.id === id);
        if (!activeWebsiteId || !item || !canDeleteAsset(item)) return;
        void deleteAsset(id, { websiteId: activeWebsiteId });
    };

    const filteredMedia = visibleAssets.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeWebsiteId) return;

        if (e.target) e.target.value = '';

        // Size guard
        if (file.size > 100 * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "File too large",
                description: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 100 MB.`,
            });
            return;
        }

        // Duplicate name check
        const incomingBase = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
        const conflict = assets.find(a => a.name.replace(/\.[^/.]+$/, '').toLowerCase() === incomingBase);
        if (conflict) {
            setDupConflictName(conflict.name);
            setDupFile(file);
            return;
        }

        await doUpload(file);
    };

    const doUpload = async (file: File) => {
        if (!activeWebsiteId) return;
        try {
            await uploadAsset(file, { websiteId: activeWebsiteId });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.response?.data?.message || error.response?.data?.error || "Failed to upload asset.",
            });
        }
    };

    const handleDupReplace = async (file: File) => {
        setDupFile(null);
        await doUpload(file);
    };

    const handleDupRename = async (file: File, newName: string) => {
        setDupFile(null);
        await doUpload(new File([file], newName, { type: file.type }));
    };

    const handleDupCancel = () => setDupFile(null);

    const handleUrlUpload = async () => {
        if (urlInput && activeWebsiteId) {
            await importAssetFromUrl(urlName || 'Imported Asset', urlInput, { websiteId: activeWebsiteId });
            setUrlInput('');
            setUrlName('');
            setIsUrlDialogOpen(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        // Could add a toast notification here
    };

    const handleCopy = (id: string, url: string) => {
        copyToClipboard(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    useEffect(() => {
        if (!previewAsset) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPreviewAsset(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [previewAsset]);

    return (
        <div className="h-full flex flex-col bg-white animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Asset Library</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">This website + global assets</p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 shadow-sm transition-all">
                                <Plus className="w-4 h-4 text-primary" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => fileInputRef.current?.click()}>
                                <Monitor className="w-4 h-4" /> From Disk
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => setIsUrlDialogOpen(true)}>
                                <LinkIcon className="w-4 h-4" /> From URL
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleUpload}
                        accept="image/*,video/*"
                    />
                </div>
            </div>

            <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                        placeholder="Search assets..."
                        className="pl-9 h-9 text-xs bg-slate-50 border-slate-100 focus:bg-white transition-all rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
                <div className="bg-white px-3 border-b border-slate-100">
                    <TabsList className="bg-transparent h-10 gap-4">
                        <TabsTrigger value="all" className="text-[11px] font-bold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] rounded-none px-0">All</TabsTrigger>
                        <TabsTrigger value="images" className="text-[11px] font-bold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] rounded-none px-0">Images</TabsTrigger>
                        <TabsTrigger value="videos" className="text-[11px] font-bold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] rounded-none px-0">Videos</TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4">
                        <TabsContent value="all" className="mt-0 outline-none">
                            {filteredMedia.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 opacity-20" />
                                    </div>
                                    <p className="text-[11px] font-medium italic">No assets found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredMedia.map((item) => (
                                        <AssetCard
                                            key={item.id}
                                            item={item}
                                            copiedId={copiedId}
                                            activeWebsiteId={activeWebsiteId}
                                            onCopy={handleCopy}
                                            onDelete={handleDeleteLibraryAsset}
                                            onPreview={setPreviewAsset}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="images" className="mt-0 outline-none">
                            {filteredMedia.filter(item => item.type === 'image').length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 opacity-20" />
                                    </div>
                                    <p className="text-[11px] font-medium italic">No images found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredMedia.filter(item => item.type === 'image').map((item) => (
                                        <AssetCard
                                            key={item.id}
                                            item={item}
                                            copiedId={copiedId}
                                            activeWebsiteId={activeWebsiteId}
                                            onCopy={handleCopy}
                                            onDelete={handleDeleteLibraryAsset}
                                            onPreview={setPreviewAsset}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="videos" className="mt-0 outline-none">
                            {filteredMedia.filter(item => item.type === 'video').length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                        <Video className="w-6 h-6 opacity-20" />
                                    </div>
                                    <p className="text-[11px] font-medium italic">No videos found</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredMedia.filter(item => item.type === 'video').map((item) => (
                                        <AssetCard
                                            key={item.id}
                                            item={item}
                                            copiedId={copiedId}
                                            activeWebsiteId={activeWebsiteId}
                                            onCopy={handleCopy}
                                            onDelete={handleDeleteLibraryAsset}
                                            onPreview={setPreviewAsset}
                                        />
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </ScrollArea>
            </Tabs>

            {/* URL Upload Dialog */}
            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Import via URL</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-3">
                            <Label htmlFor="url-name" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Asset Name</Label>
                            <Input
                                id="url-name"
                                placeholder="E.g. Logo, Banner Image..."
                                value={urlName}
                                onChange={(e) => setUrlName(e.target.value)}
                                className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:bg-white text-sm"
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="url" className="text-xs font-bold text-slate-600 uppercase tracking-wider">Image or Video URL</Label>
                            <Input
                                id="url"
                                placeholder="https://example.com/image.png"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                className="h-11 rounded-xl bg-slate-50 border-slate-100 focus:bg-white text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsUrlDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={handleUrlUpload} disabled={!urlInput} className="rounded-xl font-bold shadow-lg shadow-primary/20">Import Asset</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate name conflict dialog */}
            <DuplicateAssetDialog
                file={dupFile}
                conflictingName={dupConflictName}
                onReplace={handleDupReplace}
                onRename={handleDupRename}
                onCancel={handleDupCancel}
            />

            {previewAsset && createPortal(
                <div
                    className="fixed inset-0 z-[200] bg-[#0F172A]/85"
                    onClick={() => setPreviewAsset(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={previewAsset.name}
                >
                    <button
                        type="button"
                        aria-label="Close preview"
                        onClick={() => setPreviewAsset(null)}
                        className="absolute top-4 right-4 z-[201] w-9 h-9 rounded-lg bg-white text-[#0F172A] flex items-center justify-center shadow-md"
                    >
                        <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10 pointer-events-none">
                        {previewAsset.type === 'video' ? (
                            <video
                                src={previewAsset.url}
                                controls
                                autoPlay
                                onClick={(e) => e.stopPropagation()}
                                className="pointer-events-auto max-w-full max-h-full w-auto h-auto object-contain rounded-lg bg-black"
                            />
                        ) : (
                            <img
                                src={previewAsset.url}
                                alt={previewAsset.name}
                                onClick={(e) => e.stopPropagation()}
                                className="pointer-events-auto max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                            />
                        )}
                    </div>
                    <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-white/80 truncate max-w-[90vw] px-4 text-center">
                        {previewAsset.name}
                    </p>
                </div>,
                document.body
            )}
        </div>
    );
}


