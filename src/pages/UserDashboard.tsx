import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { DashboardOutletContext } from '@/layouts/DashboardLayout';
import {
    Plus, Globe, Trash2, Search, MessageSquare, Pencil,
    ArrowRight, LayoutTemplate, ListFilter, CheckCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from "@/components/ui/use-toast";
import useBuilderStore from '@/store/useBuilderStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SiteThumbnail } from '@/components/dashboard/SiteThumbnail';
import Loading from '@/components/Common/LoadingUI';
import {
    DashboardHeroHeader,
    dashboardHeroPrimaryClass,
} from '@/components/dashboard/DashboardHeroHeader';
import {
    DashboardCard,
    DashboardCardMedia,
    DashboardCardBody,
    DashboardCardTitle,
    DashboardCardFooter,
    DashboardCardBadge,
    DashboardCardMeta,
    DashboardCardPrimaryAction,
    DashboardCardSecondaryAction,
    dashboardCardGridClass,
    formatDashboardCardDate,
    getDashboardPublishStatus,
} from '@/components/dashboard/DashboardCard';
import { templatesList } from '@/lib/templates';
import templateApi from '@/api/templates';
import { updateUserProfile } from "../api/user";

const WebsiteCard = ({ site, onDelete, onEdit, onViewMessages, dbTemplates = [] }: any) => {
    const activeTemplateId = site.templateId || site.sourceTemplateId || 'blank';
    const localTemplate = templatesList.find((t) => t.id === activeTemplateId);
    const dbTemplate = dbTemplates.find(
        (t: any) => t.id === activeTemplateId || t.id === site.sourceTemplateId
    ) || null;
    const thumbnailImage = localTemplate?.image || dbTemplate?.image || null;
    const rawCategory = dbTemplate?.category || localTemplate?.category;
    const category = rawCategory && rawCategory !== 'All' ? rawCategory : 'Project';
    const projectDate = formatDashboardCardDate(site.lastEdited || site.updated_at || site.created_at);
    const publishStatus = getDashboardPublishStatus({
        status: site.status,
        deleted: site.status?.toLowerCase() === 'deleted',
        publishedUrl: site.publishedUrl,
        publishedVersionId: site.builderMeta?.currentPublishedVersionId,
    });

    return (
        <DashboardCard interactive className="h-full" onClick={onEdit}>
            <DashboardCardMedia>
                {site?.pages?.[0]?.sections?.length > 0 ? (
                    <SiteThumbnail site={site} className="absolute inset-0 w-full h-full" />
                ) : thumbnailImage ? (
                    <img
                        src={thumbnailImage}
                        alt={site.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#eae7e9]">
                        <LayoutTemplate className="w-12 h-12 text-[#76777d]" />
                        <p className="text-xs text-[#76777d] font-medium mt-2">{category}</p>
                    </div>
                )}

                <DashboardCardBadge position="top-left">{category}</DashboardCardBadge>
            </DashboardCardMedia>

            <DashboardCardBody>
                <div className="mb-1 flex items-center justify-between gap-2">
                    <DashboardCardTitle className="mb-0 line-clamp-2 min-h-[2.75rem]">
                        {site.name}
                    </DashboardCardTitle>
                </div>
                <DashboardCardMeta date={projectDate} status={publishStatus} />
                <DashboardCardFooter>
                    <div className="flex min-w-0 items-center gap-1 justify-between border-t border-slate-300 pt-2">
                        <DashboardCardSecondaryAction
                            className="gap-1.5"
                            onClick={(e) => { e.stopPropagation(); onViewMessages(); }}
                        >
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            Messages
                        </DashboardCardSecondaryAction>
                        <button
                            type="button"
                            title="Delete project"
                            aria-label="Delete project"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-[#ba1a1a] transition-colors hover:text-[#93000a]"
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        >
                            <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                    </div>
                </DashboardCardFooter>
            </DashboardCardBody>
        </DashboardCard>
    );
};

const EmptyState = ({ onAction }) => (
    <div className="flex h-[400px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5">
            <Globe className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Your creative journey starts here</h3>
        <p className="mx-auto mt-2 max-w-sm leading-relaxed text-slate-500">
            Every great brand starts with a single page. Build yours with our visual canvas.
        </p>
        <Button size="lg" className="mt-6 gap-2 rounded-full px-8 shadow-lg shadow-primary/20" onClick={onAction}>
            <Plus className="h-5 w-5" /> Create Your First Site
        </Button>
    </div>
);

const FilterEmptyState = ({ filterLabel }: { filterLabel: string }) => (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center sm:min-h-[320px]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#0F172A]">
            <Globe className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-[#0F172A] sm:text-xl">No project available with this filter</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
            There are no {filterLabel} projects to show right now. Try another filter or create a new project.
        </p>
    </div>
);

// ΓöÇΓöÇΓöÇ UserDashboard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const WEBSITE_NAME_MAX_LENGTH = 100;

const UserDashboard = () => {
    const navigate = useNavigate();
    const websites = useBuilderStore((state) => state.websites) ?? [];
    const fetchWebsites = useBuilderStore((state) => state.fetchWebsites);
    const createWebsite = useBuilderStore((state) => state.createWebsite);
    const deleteWebsite = useBuilderStore((state) => state.deleteWebsite);
    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || 'null');
        } catch {
            return null;
        }
    })();
    const {
        isAdmin = false,
        setIsAdmin = () => { },
        userName = 'User',
        setUserName = () => { },
    } = useOutletContext<DashboardOutletContext>() || {};
    const isAdminRole = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'INSTITUTION_ADMIN';
    const [tempUserName, setTempUserName] = useState(user?.name || 'User');
    const [tempUserEmail] = useState(user?.email || '');

    const { toast } = useToast();

    const [newSiteName, setNewSiteName] = useState('');
    const nameExceedsLimit = newSiteName.length > WEBSITE_NAME_MAX_LENGTH;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('blank');
    const [isUserProfileDialogOpen, setIsUserProfileDialogOpen] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [sortBy, setSortBy] = useState('recent');
    const [filterStatus, setFilterStatus] = useState('all');

    // DB templates for New Project dialog
    const [dbTemplates, setDbTemplates] = useState<any[]>([]);
    const [isCreatingSite, setIsCreatingSite] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoadingSites, setIsLoadingSites] = useState(true);

    // Γ£à Listen for userUpdated event (userName itself is kept in sync by DashboardLayout)
    useEffect(() => {
        const handleUserUpdated = (e) => {
            setTempUserName(e.detail.name);
        };
        window.addEventListener("userUpdated", handleUserUpdated);
        return () => window.removeEventListener("userUpdated", handleUserUpdated);
    }, []);

    useEffect(() => {
        let mounted = true;
        setIsLoadingSites(true);
        void fetchWebsites(undefined, isAdmin).finally(() => {
            if (mounted) setIsLoadingSites(false);
        });
        return () => {
            mounted = false;
        };
    }, [isAdmin, fetchWebsites]);

    useEffect(() => {
        templateApi.getWebsiteTemplates()
            .then(res => {
                const raw = res.data?.data || res.data || [];
                const flat: any[] = Array.isArray(raw) ? raw : Object.values(raw).flat();
                setDbTemplates(flat.filter((t: any) => !t.deletedAt));
            })
            .catch(() => setDbTemplates([]));
    }, []);

    const handleProfileSave = async () => {
        try {
            setIsUpdatingProfile(true);
            await updateUserProfile(tempUserName);

            const updatedUser = { ...user, name: tempUserName };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUserName(tempUserName);

            setIsUserProfileDialogOpen(false);
            toast({ title: "Profile updated", description: "Your name has been updated successfully." });
        } catch (error) {
            console.error("Profile update failed:", error);
            toast({
                title: "Update failed",
                description: error?.response?.data?.message || "Failed to update profile. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleDialogClose = (open) => {
        setIsDialogOpen(open);
        if (!open) {
            setNewSiteName('');
            setSelectedTemplate('blank');
        }
    };

    const siteList = Array.isArray(websites) ? websites : [];

    const filteredWebsites = React.useMemo(() => {
        let tempWebsites = siteList.filter((site) =>
            site.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterStatus === 'all') {
            tempWebsites = tempWebsites.filter((site) => site.status?.toLowerCase() !== 'deleted');
        } else {
            tempWebsites = tempWebsites.filter((site) => site.status?.toLowerCase() === filterStatus.toLowerCase());
        }

        if (sortBy === 'recent') {
            tempWebsites.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime());
        } else if (sortBy === 'name') {
            tempWebsites.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        return tempWebsites;
    }, [siteList, searchQuery, sortBy, filterStatus]);

    const handleConfirmDelete = async () => {
        if (!deleteTarget?.id || isDeleting) return;
        try {
            setIsDeleting(true);
            await deleteWebsite(deleteTarget.id);
            toast({ title: 'Project deleted', description: `"${deleteTarget.name}" has been deleted.` });
            setDeleteTarget(null);
        } catch (err: any) {
            toast({
                title: 'Could not delete project',
                description: err?.message || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateSite = async () => {
        if (!newSiteName.trim() || isCreatingSite || nameExceedsLimit) return;
        try {
            setIsCreatingSite(true);
            const id = await createWebsite(newSiteName, selectedTemplate);
            setIsDialogOpen(false);
            setNewSiteName('');
            setSelectedTemplate('blank');
            navigate(`/builder/${id}`);
        } catch (err: any) {
            toast({
                title: 'Could not create site',
                description: err?.message || 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsCreatingSite(false);
            setIsCreatingSite(false);
        }
    };

    return (
        <>
            <DashboardHeroHeader
                title="Dashboard"
                description={`Good day, ${userName.split(' ')[0]}.`}
                actions={
                    <button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className={cn('inline-flex items-center justify-center', dashboardHeroPrimaryClass)}
                    >
                        <Plus className="mr-1.5 h-4 w-4 shrink-0" />
                        New Project
                    </button>
                }
            />
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent
                    className={cn(
                        'flex flex-col gap-0 w-[calc(100vw-1.5rem)] sm:max-w-5xl p-0 overflow-hidden',
                        'max-h-[min(92dvh,44rem)] rounded-2xl sm:rounded-[1.5rem]',
                        'bg-white border-slate-100 shadow-2xl',
                        '[&>button]:right-3 [&>button]:top-3 [&>button]:text-[#0F172A] [&>button]:hover:bg-slate-100',
                    )}
                >
                    <DialogTitle className="sr-only">Create New Website</DialogTitle>
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:flex-row md:overflow-hidden">
                        <div className="flex w-full shrink-0 flex-col border-b border-slate-100 bg-white p-5 pt-12 sm:p-8 sm:pt-12 md:w-[38%] md:border-b-0 md:border-r md:p-10">
                            <div>
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A]/10 text-[#0F172A] sm:mb-6 sm:h-14 sm:w-14">
                                    <LayoutTemplate className="h-5 w-5 sm:h-7 sm:w-7" />
                                </div>
                                <h2 className="mb-2 text-2xl font-black leading-none tracking-tight text-[#0F172A] sm:mb-3 sm:text-[2rem]">
                                    Create a Project
                                </h2>
                                <p className="mb-5 text-sm font-medium leading-relaxed text-slate-500 sm:mb-8">
                                    Give your project a name. Start from a blank canvas, or pick a template.
                                </p>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                                        Project Name
                                    </label>
                                    <div>
                                        <Input
                                            placeholder="e.g., My Awesome Site"
                                            value={newSiteName}
                                            onChange={(e) => setNewSiteName(e.target.value)}
                                            aria-invalid={nameExceedsLimit}
                                            className={cn(
                                                'h-12 rounded-xl border-slate-200 bg-slate-50 px-4 font-medium text-slate-900 shadow-inner transition-all focus:bg-white focus-visible:ring-2 sm:h-14',
                                                nameExceedsLimit
                                                    ? 'border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-400/20'
                                                    : 'focus-visible:border-[#0F172A] focus-visible:ring-[#0F172A]/20',
                                            )}
                                            onKeyDown={(e) => e.key === 'Enter' && !nameExceedsLimit && handleCreateSite()}
                                        />
                                        {nameExceedsLimit && (
                                            <div
                                                role="alert"
                                                className="mt-2 rounded-xl border border-rose-200 bg-white p-3 shadow-lg"
                                            >
                                                <p className="text-sm font-semibold text-rose-700">Invalid data</p>
                                                <p className="mt-1 text-xs text-rose-600">
                                                    name: Name must not exceed 100 characters
                                                </p>
                                                <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                                                    {newSiteName.length}/{WEBSITE_NAME_MAX_LENGTH} characters
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 border-t border-slate-100 pt-5 sm:mt-8 sm:pt-8">
                                <Button
                                    onClick={handleCreateSite}
                                    disabled={!newSiteName.trim() || isCreatingSite || nameExceedsLimit}
                                    className="group/button-create-site flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] text-base font-bold text-white shadow-lg shadow-[#0F172A]/20 transition-all hover:bg-[#1e293b] active:scale-[0.98] sm:h-14 sm:text-lg"
                                >
                                    {isCreatingSite ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" /> Creating...
                                        </>
                                    ) : (
                                        <>
                                            Start Building
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover/button-create-site:translate-x-1" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 bg-dashboard p-5 sm:p-8 md:overflow-y-auto md:overscroll-contain md:p-10">
                            <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
                                <h3 className="text-lg font-bold tracking-tight text-[#0F172A] sm:text-xl">Select a Template</h3>
                                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm sm:px-4 sm:text-xs">
                                    {dbTemplates.length + 1} options
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2 sm:gap-6 sm:pb-8">
                                <div
                                    onClick={() => setSelectedTemplate('blank')}
                                    className={cn(
                                        'group/template-dialog-card relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-[3px] bg-white transition-all duration-300',
                                        selectedTemplate === 'blank'
                                            ? 'scale-[1.01] border-[#0F172A] shadow-[0_10px_40px_rgba(15,23,42,0.12)]'
                                            : 'border-slate-200 opacity-90 hover:border-[#0F172A]/40 hover:opacity-100 hover:shadow-xl',
                                    )}
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[4/3]">
                                        <div className="flex h-full w-full flex-col items-center justify-center bg-white">
                                            <div className="flex h-16 w-12 flex-col overflow-hidden rounded-md border-2 border-dashed border-slate-200 bg-slate-50 sm:h-20 sm:w-14">
                                                <div className="h-2.5 w-full bg-slate-200/80" />
                                                <div className="flex flex-1 items-center justify-center">
                                                    <Plus className="h-4 w-4 text-slate-300 sm:h-5 sm:w-5" />
                                                </div>
                                                <div className="h-2 w-full bg-slate-200/80" />
                                            </div>
                                            <p className="mt-2 text-xs font-medium text-slate-400">Empty canvas</p>
                                        </div>
                                        <AnimatePresence>
                                            {selectedTemplate === 'blank' && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#0F172A] shadow-lg sm:right-4 sm:top-4 sm:h-8 sm:w-8"
                                                >
                                                    <CheckCircle className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="relative z-10 flex items-center gap-3 border-t border-slate-100 bg-white p-4 sm:gap-4 sm:p-6">
                                        <div className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors sm:h-12 sm:w-12',
                                            selectedTemplate === 'blank' ? 'bg-[#0F172A]/10 text-[#0F172A]' : 'bg-slate-50 text-slate-500',
                                        )}>
                                            <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className={cn(
                                                'truncate text-base font-bold leading-tight transition-colors sm:text-lg',
                                                selectedTemplate === 'blank' ? 'text-[#0F172A]' : 'text-slate-700',
                                            )}>
                                                Blank canvas
                                            </h4>
                                            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Start from scratch
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {dbTemplates.map((tpl) => (
                                    <div
                                        key={tpl.id}
                                        onClick={() => setSelectedTemplate(tpl.id)}
                                        className={cn(
                                            'group/template-dialog-card relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-[3px] bg-white transition-all duration-300',
                                            selectedTemplate === tpl.id
                                                ? 'scale-[1.01] border-[#0F172A] shadow-[0_10px_40px_rgba(15,23,42,0.12)]'
                                                : 'border-slate-200 opacity-90 hover:border-[#0F172A]/40 hover:opacity-100 hover:shadow-xl',
                                        )}
                                    >
                                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[4/3]">
                                            {tpl.image ? (
                                                <img
                                                    src={tpl.image}
                                                    alt={tpl.name}
                                                    className={cn(
                                                        'h-full w-full object-cover transition-transform duration-700',
                                                        selectedTemplate === tpl.id ? 'scale-105' : 'group-hover/template-dialog-card:scale-105',
                                                    )}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center bg-[#F4F4F5]">
                                                    <LayoutTemplate className="h-10 w-10 text-slate-300 sm:h-12 sm:w-12" />
                                                    <p className="mt-2 text-xs font-medium text-slate-400">{tpl.category || 'Template'}</p>
                                                </div>
                                            )}
                                            <AnimatePresence>
                                                {selectedTemplate === tpl.id && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#0F172A] shadow-lg sm:right-4 sm:top-4 sm:h-8 sm:w-8"
                                                    >
                                                        <CheckCircle className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <div className="relative z-10 flex items-center gap-3 border-t border-slate-100 bg-white p-4 sm:gap-4 sm:p-6">
                                            <div className={cn(
                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors sm:h-12 sm:w-12',
                                                selectedTemplate === tpl.id ? 'bg-[#0F172A]/10 text-[#0F172A]' : 'bg-slate-50 text-slate-500',
                                            )}>
                                                <LayoutTemplate className="h-5 w-5 sm:h-6 sm:w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={cn(
                                                    'truncate text-base font-bold leading-tight transition-colors sm:text-lg',
                                                    selectedTemplate === tpl.id ? 'text-[#0F172A]' : 'text-slate-700',
                                                )}>
                                                    {tpl.name}
                                                </h4>
                                                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                    {tpl.category || 'Custom'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col gap-3">
                <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search projects..."
                        className="h-11 w-full rounded-full border-slate-200 bg-white pl-10 text-sm shadow-sm focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="group h-11 w-full rounded-full border-slate-200 bg-white px-4 shadow-sm hover:border-[#131924] hover:bg-[#131924] hover:text-white sm:w-[160px] data-[state=open]:border-[#131924] data-[state=open]:bg-[#131924] data-[state=open]:text-white">
                            <ListFilter className="mr-2 h-4 w-4 text-slate-400 group-hover:text-white group-data-[state=open]:text-white" />
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                            <SelectItem value="recent">Recent</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {['all', 'draft', 'published', 'deleted'].map((status) => (
                            <button
                                key={status}
                                type="button"
                                className={cn(
                                    'h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold capitalize sm:h-10 sm:px-4 sm:text-sm',
                                    filterStatus === status
                                        ? 'border-[#131924] bg-[#131924] text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-[#131924] hover:bg-[#131924] hover:text-white',
                                )}
                                onClick={() => setFilterStatus(status)}
                            >
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoadingSites ? (
                <Loading label="Loading websites" />
            ) : siteList.filter((w) => w.status?.toLowerCase() !== 'deleted').length === 0 && filterStatus === 'all' && !searchQuery.trim() ? (
                <EmptyState onAction={() => setIsDialogOpen(true)} />
            ) : filteredWebsites.length === 0 ? (
                <FilterEmptyState
                    filterLabel={
                        searchQuery.trim()
                            ? 'matching'
                            : filterStatus === 'all'
                                ? 'active'
                                : filterStatus
                    }
                />
            ) : (
                <div className={dashboardCardGridClass}>
                    {filteredWebsites.map((site, index) => (
                        <WebsiteCard
                            key={site.id}
                            site={site}
                            index={index}
                            dbTemplates={dbTemplates}
                            onDelete={() => setDeleteTarget(site)}
                            onEdit={() => navigate(`/builder/${site.id}`)}
                            onViewMessages={() => navigate(`/dashboard/messages?websiteId=${site.id}`)}
                        />
                    ))}
                </div>
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
                <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl p-5 sm:p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[#0F172A]">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                            Delete project?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete “{deleteTarget?.name}”. You can restore it later from Deleted if needed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AlertDialogCancel
                            disabled={isDeleting}
                            className="mt-0 w-full hover:border-[#131924] hover:bg-[#131924] hover:text-white sm:w-auto"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleConfirmDelete();
                            }}
                            disabled={isDeleting}
                            className="w-full bg-rose-600 text-white hover:bg-rose-700 sm:w-auto"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export { WebsiteCard, EmptyState };
export default UserDashboard;

