import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Upload, Check, Image as ImageIcon, Video, Monitor, Link as LinkIcon, Trash2, Copy, Loader2, Globe, SlidersHorizontal } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent } from "../components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { DuplicateAssetDialog } from "../components/ui/DuplicateAssetDialog";
import { cn } from '@/lib/utils';
import { useToast } from "../hooks/use-toast";
import useBuilderStore from '../store/useBuilderStore';
import type { Asset } from '../store/useBuilderStore';
import { DashboardPageShell, dashboardFilterPillClass, dashboardSearchInputClass, dashboardFilterScrollClass, dashboardToolbarClass } from '@/components/dashboard/DashboardPageShell';
import { dashboardHeroPrimaryClass, dashboardHeroSecondaryClass } from '@/components/dashboard/DashboardHeroHeader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import assetApi from '@/api/assets';
import Loading from '@/components/Common/LoadingUI';
import {
  filterAssetsVisibleToUsers,
  getUserVisibleAssetIds,
  isAdminGlobalAsset,
  rememberAssetVisibleToUsers,
  setUserVisibleAssetIds,
  canDeleteAsset,
} from '@/lib/assetVisibility';
import {
  DashboardCard,
  DashboardCardMedia,
  DashboardCardBody,
  DashboardCardTitle,
  DashboardCardDescription,
  DashboardCardFooter,
  DashboardCardBadge,
  dashboardCardBadgeClass,
} from '@/components/dashboard/DashboardCard';


export default function DashboardAssets() {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
    const isAdmin = basePath === '/admin';
    const uploadScope = isAdmin ? { scope: 'GLOBAL' as const } : { scope: 'USER' as const };
    const { deleteAsset, fetchAssets, getScopedAssets, uploadAsset, importAssetFromUrl } = useBuilderStore();

    const [isFetching, setIsFetching] = useState(true);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    // duplicate-name conflict state
    const [dupFile, setDupFile] = useState<File | null>(null);
    const [dupConflictName, setDupConflictName] = useState('');

    useEffect(() => {
        setIsFetching(true);
        void Promise.all([fetchAssets(), fetchAssets({ scope: 'GLOBAL' })]).finally(() => setIsFetching(false));
    }, [fetchAssets]);

    const [search, setSearch] = useState('');
    const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [urlName, setUrlName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const allAssets = getScopedAssets();
    const assets = isAdmin ? allAssets : filterAssetsVisibleToUsers(allAssets);

    const filteredMedia = assets.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const [manageOpen, setManageOpen] = useState(false);
    const [draftVisibleIds, setDraftVisibleIds] = useState<Set<string>>(new Set());
    const [savingVisibility, setSavingVisibility] = useState(false);

    const allAssetIds = allAssets.map((asset) => asset.id).join(',');

    useEffect(() => {
        if (!manageOpen) return;
        const saved = getUserVisibleAssetIds();
        setDraftVisibleIds(new Set(saved ?? allAssetIds.split(',').filter(Boolean)));
    }, [manageOpen, allAssetIds]);

    const { toast } = useToast();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (e.target) e.target.value = ''; // reset input immediately so the same file can be re-picked

        // Size guard
        if (file.size > 100 * 1024 * 1024) {
            toast({
                variant: "destructive",
                title: "File too large",
                description: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 100 MB.`,
            });
            return;
        }

        // Duplicate name check (compare base names, case-insensitive)
        const incomingBase = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
        const conflict = assets.find(a => a.name.replace(/\.[^/.]+$/, '').toLowerCase() === incomingBase);
        if (conflict) {
            setDupConflictName(conflict.name);
            setDupFile(file);
            return; // wait for user decision in the dialog
        }

        await doUpload(file);
    };

    /** Performs the actual upload with an optional renamed File object */
    const doUpload = async (file: File) => {
        setUploadingCount(c => c + 1);
        try {
            const asset = await uploadAsset(file, uploadScope);
            if (isAdmin && asset?.id) rememberAssetVisibleToUsers(asset.id);
            toast({ title: "Asset Uploaded", description: "Your asset has been successfully uploaded." });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.response?.data?.message || error.response?.data?.error || "Failed to upload asset.",
            });
        } finally {
            setUploadingCount(c => c - 1);
        }
    };

    const handleDupReplace = async (file: File) => {
        setDupFile(null);
        await doUpload(file);
    };

    const handleDupRename = async (file: File, newName: string) => {
        setDupFile(null);
        const renamed = new File([file], newName, { type: file.type });
        await doUpload(renamed);
    };

    const handleDupCancel = () => setDupFile(null);

    const handleUrlUpload = async () => {
        if (urlInput) {
            setUploadingCount(c => c + 1);
            try {
                const asset = await importAssetFromUrl(urlName || 'Imported Asset', urlInput, uploadScope);
                if (isAdmin && asset?.id) rememberAssetVisibleToUsers(asset.id);
                toast({ title: "Asset Imported", description: "Your asset has been successfully imported." });
                setUrlInput('');
                setUrlName('');
                setIsUrlDialogOpen(false);
            } catch (error: any) {
                toast({ 
                    variant: "destructive", 
                    title: "Import Failed", 
                    description: error.response?.data?.message || error.response?.data?.error || "Failed to import asset." 
                });
            } finally {
                setUploadingCount(c => c - 1);
            }
        }
    };

    const handleCopy = async (id: string, url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id);
            toast({ title: 'Asset link copied!' });
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast({
                variant: 'destructive',
                title: 'Could not copy link',
                description: 'Please try again.',
            });
        }
    };

    const toggleDraftVisible = (id: string, checked: boolean) => {
        setDraftVisibleIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const handleSaveVisibility = async () => {
        const ids = [...draftVisibleIds];
        setSavingVisibility(true);
        setUserVisibleAssetIds(ids);
        try {
            await assetApi.setVisibleAssets(ids);
        } catch {
            // Visibility is stored locally even if the API is unavailable.
        } finally {
            setSavingVisibility(false);
            setManageOpen(false);
            toast({
                title: 'User library updated',
                description: ids.length
                    ? `${ids.length} asset${ids.length === 1 ? '' : 's'} will be visible on the user side.`
                    : 'No assets will be visible on the user side.',
            });
        }
    };

    const handleDelete = async (id: string) => {
        const target = allAssets.find((asset) => asset.id === id);
        if (!target || !canDeleteAsset(target)) {
            toast({
                variant: 'destructive',
                title: 'Cannot delete this asset',
                description: isAdminGlobalAsset(target || {})
                    ? 'Global admin assets cannot be deleted from a user account.'
                    : 'You can only delete assets you uploaded.',
            });
            return;
        }
        setDeletingIds(prev => new Set(prev).add(id));
        try {
            await deleteAsset(id);
            toast({ title: "Asset Deleted", description: "The asset has been removed." });
            setPreviewAsset((current) => (current?.id === id ? null : current));
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: error.response?.data?.message || error.response?.data?.error || "Failed to delete asset.",
            });
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const [activeTab, setActiveTab] = useState('all');

    return (
    <DashboardPageShell
      basePath={basePath}
      title="Assets"
      pageLabel="Assets"
      description="Manage the global asset library outside individual websites."
      actions={
        <>
          {isAdmin && (
            <Popover open={manageOpen} onOpenChange={setManageOpen}>
              <PopoverTrigger asChild>
                <Button type="button" className={dashboardHeroSecondaryClass}>
                  <SlidersHorizontal className="mr-1.5 h-4 w-4 shrink-0" />
                  Manage Assets
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 p-0 shadow-xl"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-[#0F172A]">Visible to users</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Choose which library assets appear on the user dashboard.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#131924] hover:underline"
                    onClick={() => setDraftVisibleIds(new Set(allAssets.map((asset) => asset.id)))}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:underline"
                    onClick={() => setDraftVisibleIds(new Set())}
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto px-2 pb-2">
                  {allAssets.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-slate-500">
                      Upload assets first, then choose which ones users can see.
                    </p>
                  ) : (
                    allAssets.map((asset) => (
                      <label
                        key={asset.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={draftVisibleIds.has(asset.id)}
                          onCheckedChange={(checked) => toggleDraftVisible(asset.id, checked === true)}
                          className="border-[#131924] data-[state=checked]:bg-[#131924] data-[state=checked]:text-white"
                        />
                        {asset.type === 'image' ? (
                          <img src={asset.url} alt="" className="h-8 w-8 shrink-0 rounded object-cover bg-slate-100" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#131924]">
                            <Video className="h-3.5 w-3.5 text-white/70" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1b1b1d]">
                          {asset.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 p-3">
                  <Button
                    type="button"
                    disabled={savingVisibility}
                    onClick={() => void handleSaveVisibility()}
                    className="h-9 w-full rounded-full bg-[#131924] text-sm font-semibold text-white hover:bg-[#202838]"
                  >
                    {savingVisibility ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save visibility'
                    )}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={uploadingCount > 0}
                className={dashboardHeroPrimaryClass}
              >
                {uploadingCount > 0
                  ? <><Loader2 className="mr-1.5 h-4 w-4 shrink-0 animate-spin" />Uploading…</>
                  : <><Upload className="mr-1.5 h-4 w-4 shrink-0" />Add Assets</>
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-lg border-[#c6c6cd] shadow-xl mt-2">
              <DropdownMenuItem
                className="cursor-pointer gap-3 p-3 rounded-lg hover:bg-[#eae7e9] font-medium text-[#1b1b1d]"
                onSelect={() => fileInputRef.current?.click()}
              >
                <Monitor className="w-4 h-4" />
                Upload from Disk
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-3 p-3 rounded-lg hover:bg-[#eae7e9] font-medium text-[#1b1b1d] mt-1"
                onSelect={() => setIsUrlDialogOpen(true)}
              >
                <LinkIcon className="w-4 h-4" />
                Import from URL
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
        </>
      }
    >
            <div className={dashboardToolbarClass}>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#787778]" />
                <Input
                  placeholder="Search assets..."
                  className={cn(dashboardSearchInputClass, 'h-9 rounded-full pl-9')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className={cn(dashboardFilterScrollClass, 'flex-1')}>
              {['all', 'images', 'videos'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={dashboardFilterPillClass(activeTab === tab)}
                >
                  {tab === 'all' ? 'All Assets' : tab === 'images' ? 'Images' : 'Videos'}
                </button>
              ))}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f6f3f5] rounded-full text-[#45464d] border border-[#c6c6cd] font-semibold text-xs uppercase tracking-wider shrink-0 self-start sm:self-auto">
                Total: <span className="text-[#1b1b1d] font-bold">{filteredMedia.length}</span>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="min-h-[400px]">
                   {isFetching ? (
                      <Loading label="Loading assets" />
                   ) : (
                   ['all', 'images', 'videos'].map(tabType => (
                      <TabsContent key={tabType} value={tabType} className="mt-0 outline-none">
                         {filteredMedia.filter(m => tabType === 'all' || m.type === tabType.slice(0, -1)).length === 0 && uploadingCount === 0 ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-[#76777d] gap-4 border border-dashed border-[#c6c6cd] rounded-lg bg-[#f6f3f5]">
                                <div className="w-20 h-20 rounded-lg bg-[#eae7e9] flex items-center justify-center">
                                   {tabType === 'videos' ? <Video className="w-8 h-8 opacity-40" /> : <ImageIcon className="w-8 h-8 opacity-40" />}
                                </div>
                                <div className="text-center">
                                   <p className="text-sm font-bold text-[#1b1b1d]">No {tabType} found</p>
                                   <p className="text-xs text-[#45464d] font-medium mt-1">Try searching another keyword or upload new media</p>
                                </div>
                            </div>
                         ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">

                                {/* ── Upload skeleton placeholders ── */}
                                {uploadingCount > 0 && Array.from({ length: uploadingCount }).map((_, i) => (
                                   <div key={`uploading-${i}`} className="flex flex-col rounded-lg border border-[#c6c6cd] bg-[#fcf8fa] overflow-hidden animate-pulse">
                                      <div className="aspect-square bg-[#eae7e9] flex flex-col items-center justify-center gap-2">
                                         <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                                         <span className="text-[10px] font-semibold text-slate-400">Uploading…</span>
                                      </div>
                                      <div className="space-y-2 p-2.5 sm:p-3">
                                         <div className="h-2.5 w-3/4 rounded-full bg-slate-200" />
                                         <div className="h-2 w-1/2 rounded-full bg-[#F4F4F5]" />
                                      </div>
                                   </div>
                                ))}

                                {filteredMedia.filter(m => tabType === 'all' || m.type === tabType.slice(0, -1)).map((item) => (
                                    <DashboardCard
                                        key={item.id}
                                        interactive
                                        className={cn(
                                            'hover:shadow-md',
                                            deletingIds.has(item.id) && 'opacity-60 scale-[0.97] pointer-events-none'
                                        )}
                                        onClick={() => setPreviewAsset(item)}
                                    >
                                        <DashboardCardMedia aspect className="aspect-square">
                                           {item.type === 'image' ? (
                                               <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                           ) : (
                                               <div className="w-full h-full bg-[#131b2e] flex items-center justify-center">
                                                   <Video className="w-8 h-8 text-white/40" />
                                               </div>
                                           )}

                                           <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
                                              <DashboardCardBadge position="top-left" className="static px-1.5 py-0.5 text-[10px] capitalize">
                                                 {item.type || 'File'}
                                              </DashboardCardBadge>
                                              {(isAdminGlobalAsset(item)) && (
                                              <span className={cn(dashboardCardBadgeClass, 'static inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-[#dedfeb]')}>
                                                 <Globe className="w-2.5 h-2.5" />
                                                 Global
                                              </span>
                                              )}
                                           </div>
                                        </DashboardCardMedia>

                                        <DashboardCardBody className="gap-1 p-2.5 sm:p-3">
                                            <DashboardCardTitle className="mb-0 truncate text-sm font-semibold leading-tight">
                                                {item.name}
                                            </DashboardCardTitle>

                                            <DashboardCardDescription className="mb-0 sm:mb-0 flex-none text-[11px] sm:text-[11px] leading-snug text-[#76777d]">
                                                <span className="uppercase tracking-wider">{item.size}</span>
                                                <span className="mx-1">·</span>
                                                <span>
                                                    {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </DashboardCardDescription>

                                            {deletingIds.has(item.id) ? (
                                                <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-[#c6c6cd] pt-2 text-[#ba1a1a]">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    <span className="text-[11px] font-medium">Deleting…</span>
                                                </div>
                                            ) : (
                                                <DashboardCardFooter
                                                    className="mt-2 flex-row items-center gap-1.5 border-t border-[#c6c6cd] pt-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-[#c6c6cd] bg-white px-2 text-[11px] font-medium text-[#0F172A] hover:bg-[#eae7e9]"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopy(item.id, item.url);
                                                        }}
                                                    >
                                                        {copiedId === item.id ? (
                                                            <>
                                                                <Check className="h-3 w-3" />
                                                                Copied
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-3 w-3" />
                                                                Copy
                                                            </>
                                                        )}
                                                    </button>
                                                    {canDeleteAsset(item) && (
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-rose-100 bg-white px-2 text-[11px] font-medium text-[#ba1a1a] hover:bg-rose-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void handleDelete(item.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Delete
                                                    </button>
                                                    )}
                                                </DashboardCardFooter>
                                            )}
                                        </DashboardCardBody>
                                    </DashboardCard>
                                ))}
                            </div>
                         )}
                      </TabsContent>
                   ))
                   )}
                </div>
            </Tabs>

            <Dialog open={!!previewAsset} onOpenChange={(open) => { if (!open) setPreviewAsset(null); }}>
                <DialogContent
                    className={cn(
                        'flex max-h-[min(92dvh,52rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0',
                        'rounded-2xl border-[#c6c6cd] bg-white shadow-2xl sm:max-w-4xl',
                        '[&>button]:right-3 [&>button]:top-3 [&>button]:text-[#0F172A] [&>button]:hover:bg-slate-100',
                        '[&>button>svg]:mr-0 [&>button>svg]:h-5 [&>button>svg]:w-5',
                    )}
                >
                    <DialogHeader className="shrink-0 border-b border-[#c6c6cd] px-4 py-3 pr-12 sm:px-5 sm:py-4">
                        <DialogTitle className="truncate text-left text-sm font-semibold text-[#0F172A] sm:text-base">
                            {previewAsset?.name || 'Asset preview'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0F172A] p-3 sm:p-6">
                        {previewAsset?.type === 'video' ? (
                            <video
                                key={previewAsset.id}
                                src={previewAsset.url}
                                controls
                                autoPlay
                                className="max-h-[min(58dvh,32rem)] w-full max-w-full rounded-lg bg-black sm:max-h-[min(68dvh,38rem)]"
                            />
                        ) : previewAsset?.url ? (
                            <img
                                src={previewAsset.url}
                                alt={previewAsset.name}
                                className="max-h-[min(58dvh,32rem)] max-w-full rounded-lg object-contain sm:max-h-[min(68dvh,38rem)]"
                            />
                        ) : null}
                    </div>

                    {previewAsset && (
                        <div className="flex shrink-0 flex-col gap-3 border-t border-[#c6c6cd] bg-[#fcf8fa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <p className="min-w-0 truncate text-[11px] text-[#76777d] sm:text-xs">
                                <span className="uppercase tracking-wider">{previewAsset.size || previewAsset.type}</span>
                                <span className="mx-1">·</span>
                                <span>
                                    {new Date(previewAsset.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-[#c6c6cd] bg-white px-3 text-xs font-medium text-[#0F172A] hover:bg-[#eae7e9] sm:flex-none"
                                    onClick={() => handleCopy(previewAsset.id, previewAsset.url)}
                                >
                                    {copiedId === previewAsset.id ? (
                                        <><Check className="h-3.5 w-3.5" /> Copied</>
                                    ) : (
                                        <><Copy className="h-3.5 w-3.5" /> Copy</>
                                    )}
                                </button>
                                {canDeleteAsset(previewAsset) && (
                                <button
                                    type="button"
                                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-rose-100 bg-white px-3 text-xs font-medium text-[#ba1a1a] hover:bg-rose-50 sm:flex-none"
                                    onClick={() => void handleDelete(previewAsset.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-lg p-0 overflow-hidden border-[#c6c6cd] shadow-2xl">
                    <div className="p-8 pb-4">
                       <DialogHeader>
                           <DialogTitle className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-[#F4F4F5] text-[#0F172A] flex items-center justify-center">
                                 <LinkIcon className="w-5 h-5" />
                              </div>
                              Import via URL
                           </DialogTitle>
                       </DialogHeader>
                       <div className="grid gap-6 py-8">
                           <div className="grid gap-3">
                               <Label htmlFor="url-name" className="text-[11px] font-black text-[#787778] uppercase tracking-[2px] ml-1">Asset Name</Label>
                               <Input
                                   id="url-name"
                                   placeholder="E.g. Brand Logo, Background Video..."
                                   value={urlName}
                                   onChange={(e) => setUrlName(e.target.value)}
                                   className="h-12 rounded-2xl bg-[#F4F4F5] border-2 border-[#E8E8E8] focus:bg-white text-sm font-medium focus-visible:ring-[#0F172A]/15 transition-all"
                               />
                           </div>
                           <div className="grid gap-3">
                               <Label htmlFor="url" className="text-[11px] font-black text-[#787778] uppercase tracking-[2px] ml-1">Media Source URL</Label>
                               <Input
                                   id="url"
                                   placeholder="https://images.unsplash.com/..."
                                   value={urlInput}
                                   onChange={(e) => setUrlInput(e.target.value)}
                                   className="h-12 rounded-2xl bg-[#F4F4F5] border-2 border-[#E8E8E8] focus:bg-white text-sm font-medium focus-visible:ring-[#0F172A]/15 transition-all"
                               />
                               <p className="text-[10px] text-[#747781] font-medium ml-1">Supports direct image and video links (jpg, png, mp4, etc.)</p>
                           </div>
                       </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-200/60">
                        <Button variant="ghost" onClick={() => setIsUrlDialogOpen(false)} className="rounded-xl font-black text-slate-500 text-xs px-6 h-11 tracking-widest uppercase hover:bg-slate-100">Cancel</Button>
                        <Button onClick={handleUrlUpload} disabled={!urlInput} className="rounded-lg font-semibold text-sm px-8 h-11 bg-[#131b2e] hover:bg-[#252f4a]">Import Asset</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <DuplicateAssetDialog
                file={dupFile}
                conflictingName={dupConflictName}
                onReplace={handleDupReplace}
                onRename={handleDupRename}
                onCancel={handleDupCancel}
            />
    </DashboardPageShell>
  );
}