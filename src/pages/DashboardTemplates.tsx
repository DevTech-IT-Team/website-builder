import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowLeft, LayoutTemplate, Search, Trash2, RotateCcw, Building2, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useBuilderStore from '@/store/useBuilderStore';
import { cn } from '@/lib/utils';
import templateApi from '@/api/templates';
import Loading from '@/components/Common/LoadingUI';
import { useToast } from '@/components/ui/use-toast';
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
import TemplateFormDialog from '@/components/dashboard/TemplateFormDialog';
import { DashboardPageShell, dashboardFilterPillClass, dashboardSearchInputClass, dashboardFilterScrollClass, dashboardToolbarClass } from '@/components/dashboard/DashboardPageShell';
import { dashboardHeroPrimaryClass, dashboardHeroSecondaryClass } from '@/components/dashboard/DashboardHeroHeader';
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
  DashboardCardDashed,
  dashboardCardGridClass,
  dashboardCardTagClass,
  dashboardCardTitleClass,
  dashboardCardDescriptionClass,
  formatDashboardCardDate,
  getDashboardPublishStatus,
} from '@/components/dashboard/DashboardCard';

export default function DashboardTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const { toast } = useToast();
  const createWebsite = useBuilderStore(state => state.createWebsite);

  // ─── Auth check ───────────────────────────────────────────────────────────
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdminUser = ['ADMIN', 'SUPER_ADMIN', 'INSTITUTION_ADMIN'].includes(currentUser?.role);

  // ─── State ────────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);

  // Admin create/edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Trash toggle (admin only)
  const [showTrash, setShowTrash] = useState(false);

  // Creating state — tracks which template is being used
  const [creatingId, setCreatingId] = useState<string | null>(null);

  // Scope filter (admin only)
  const [scopeFilter, setScopeFilter] = useState<'all' | 'GLOBAL' | 'INSTITUTION'>('all');

  // Institution filter (super admin only)
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const institutions = useMemo(() => {
    const orgs: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    templates.forEach((t: any) => {
      if (t.institution?.id && !seen.has(t.institution.id)) {
        seen.add(t.institution.id);
        orgs.push({ id: t.institution.id, name: t.institution.name });
      }
    });
    return orgs;
  }, [templates]);
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');

  // ─── Fetch DB templates ───────────────────────────────────────────────────
  const fetchTemplates = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      const res = await templateApi.getWebsiteTemplates({ signal });
      const raw = res.data?.data || res.data || [];

      let flat: any[] = Array.isArray(raw) ? raw : Object.values(raw).flat();

      if (!isAdminUser) {
        flat = flat.filter((t: any) => !t.deletedAt);
      }

      setTemplates(flat);

      const cats = Array.from(new Set(flat.map((t: any) => t.category).filter(Boolean)));
      setCategories(['All', ...(cats as string[])]);
    } catch (err: any) {
      if (err?.name === 'CanceledError' || signal?.aborted) return;
      toast({
        title: 'Failed to load templates',
        description: err?.response?.data?.message || err?.message || 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTemplates(controller.signal);
    return () => controller.abort();
  }, []);

  // ─── Filter + search ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return templates.filter((t: any) => {
      const inTrash = Boolean(t.deletedAt);
      if (showTrash !== inTrash) return false;

      const matchCat = activeCategory === 'All' || t.category === activeCategory;
      const matchSearch = !searchTerm ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchScope = scopeFilter === 'all' || t.scope === scopeFilter;

      const matchInstitution = institutionFilter === 'all' ||
        (institutionFilter === 'none' && !t.institution_id) ||
        t.institution_id === institutionFilter;

      return matchCat && matchSearch && matchScope && matchInstitution;
    });
  }, [templates, activeCategory, searchTerm, showTrash, scopeFilter, institutionFilter]);

  const trashedCount = useMemo(() => templates.filter(t => t.deletedAt).length, [templates]);

  // ─── Use template ─────────────────────────────────────────────────────────
  const handleUseTemplate = async (template: any) => {
    if (creatingId) return;
    const editorTab = window.open('about:blank', '_blank');
    try {
      setCreatingId(template.id);
      const id = await createWebsite(`${template.name} Site`, template.id);
      const builderUrl = `${window.location.origin}/builder/${id}`;
      if (editorTab) {
        editorTab.opener = null;
        editorTab.location.replace(builderUrl);
      } else {
        toast({
          title: 'Allow pop-ups to open the editor',
          description: 'Your site was created. Enable pop-ups for this site, then click Use Template again — or open it from Dashboard.',
        });
      }
    } catch (err: any) {
      editorTab?.close();
      toast({
        title: 'Could not use template',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingId(null);
    }
  };

  // ─── Admin form callbacks ─────────────────────────────────────────────────
  const handleFormSuccess = (result: any, isEdit: boolean) => {
    if (isEdit) {
      setTemplates(prev => prev.map((t: any) => t.id === result.id ? { ...t, ...result } : t));
    } else {
      setTemplates(prev => [result, ...prev]);
      if (result.category && !categories.includes(result.category)) {
        setCategories(prev => [...prev, result.category]);
      }

      navigate(`/template-builder/${result.id}`);
    }
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (template: any) => {
    navigate(`/template-builder/${template.id}`);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget?.id || isDeleting) return;
    try {
      setIsDeleting(true);
      await templateApi.deleteWebsiteTemplate(deleteTarget.id);
      setTemplates(prev => prev.map(t => t.id === deleteTarget.id ? { ...t, deletedAt: new Date().toISOString() } : t));
      toast({ title: 'Template deleted', description: `"${deleteTarget.name}" has been moved to trash.` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: 'Failed to delete template', description: err?.response?.data?.message || err?.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreTemplate = async (template: any) => {
    try {
      await templateApi.restoreWebsiteTemplate(template.id);
      setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, deletedAt: null } : t));
      toast({ title: 'Template restored' });
    } catch (err: any) {
      toast({ title: 'Failed to restore template', description: err?.response?.data?.message || err?.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardPageShell
      basePath={basePath}
      title={showTrash ? 'Templates Trash' : 'Templates'}
      pageLabel="Templates"
      description={
        showTrash
          ? 'Manage and restore deleted templates.'
          : 'Start your next project with a professionally designed, fully customizable template.'
      }
      actions={
        isAdminUser ? (
          <>
            <Button
              variant="outline"
              onClick={() => setShowTrash(!showTrash)}
              className={cn(
                dashboardHeroSecondaryClass,
                showTrash && 'border-rose-400/40 bg-rose-500/20 text-white hover:bg-rose-500/30',
              )}
            >
              <Trash2 className="mr-1.5 h-4 w-4 shrink-0" />
              Trash{trashedCount > 0 && ` (${trashedCount})`}
            </Button>
            {isAdminUser && !showTrash && (
              <Button onClick={handleOpenCreate} className={dashboardHeroPrimaryClass}>
                <Plus className="mr-1.5 h-4 w-4 shrink-0" />
                New Template
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {creatingId && (
        <div className="fixed inset-0 z-50">
          <Loading fullScreen label="Creating your site" />
        </div>
      )}

      {/* Trash banner */}
      {showTrash && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 rounded-lg bg-[#ffdad6]/30 border border-[#ffdad6] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#ffdad6] flex items-center justify-center text-[#93000a]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base font-bold text-[#93000a]">Trash Management</p>
              <p className="text-xs text-[#93000a]/80 font-medium">Viewing deleted templates. Restore items to make them public again.</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-lg border-[#c6c6cd] bg-white text-[#1b1b1d] hover:bg-[#eae7e9] transition-all font-semibold px-6 shadow-sm"
            onClick={() => setShowTrash(false)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      )}

      <div className={dashboardToolbarClass}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#787778]" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={cn(dashboardSearchInputClass, 'h-9 rounded-full pl-9')}
          />
        </div>
        {isAdminUser && (
          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 rounded-full border-[#c6c6cd] bg-white text-[#1b1b1d]">
              <SelectValue placeholder="All Scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="GLOBAL">Global</SelectItem>
              <SelectItem value="INSTITUTION">Institution</SelectItem>
            </SelectContent>
          </Select>
        )}
        {isSuperAdmin && institutions.length > 0 && (
          <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-full border-[#c6c6cd] bg-white text-[#1b1b1d]">
              <Building2 className="w-4 h-4 mr-2 text-[#76777d]" />
              <SelectValue placeholder="All Orgs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              <SelectItem value="none">No Organization</SelectItem>
              {institutions.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className={cn(dashboardFilterScrollClass, 'mb-6 sm:mb-8 no-scrollbar')}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={dashboardFilterPillClass(activeCategory === cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading shimmer */}
      {isLoading ? (
        <Loading label="Loading templates" />
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="h-64 flex flex-col items-center justify-center gap-4 border border-dashed border-[#c6c6cd] rounded-lg bg-[#f6f3f5]">
          <LayoutTemplate className="w-12 h-12 text-[#76777d]" />
          <p className="text-[#45464d] text-sm font-medium text-center px-8">
            {showTrash
              ? 'Trash is empty. No deleted templates.'
              : templates.length === 0
                ? isAdminUser
                  ? 'No templates yet. Click "New Template" to create your first one!'
                  : 'No templates have been created yet. Ask your admin to add some!'
                : 'No templates match your search.'}
          </p>
          {isAdminUser && !showTrash && templates.filter(t => !t.deletedAt).length === 0 && (
            <Button
              onClick={handleOpenCreate}
              className="rounded-lg bg-[#131b2e] text-white px-6 h-10 text-sm font-semibold shadow-md hover:bg-[#252f4a]"
            >
              <Plus className="mr-2 h-4 w-4" /> Create First Template
            </Button>
          )}
        </div>
      ) : (
        /* Templates Grid scaled dynamically for wide screen sizes */
        <div className={dashboardCardGridClass}>
          {filtered.map((template: any) => (
            <DashboardCard
              key={template.id}
              interactive
              onClick={() => {
                if (template.deletedAt) return;
                if (isAdminUser) {
                  handleOpenEdit(template);
                  return;
                }
                void handleUseTemplate(template);
              }}
              className={cn('h-full', showTrash && 'opacity-75')}
            >
              <DashboardCardMedia>
                {template.image ? (
                  <img
                    src={template.image}
                    alt={template.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#eae7e9]">
                    <LayoutTemplate className="w-12 h-12 text-[#76777d]" />
                    <p className="text-xs text-[#76777d] font-medium mt-2">{template.category}</p>
                  </div>
                )}

                {showTrash ? (
                  <DashboardCardBadge position="top-left" className="bg-[#ba1a1a] text-white border-transparent">
                    Deleted
                  </DashboardCardBadge>
                ) : (
                  <DashboardCardBadge position="top-left">
                    {template.category || 'Portfolio'}
                  </DashboardCardBadge>
                )}
              </DashboardCardMedia>

              <DashboardCardBody>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <DashboardCardTitle className="mb-0 line-clamp-2 min-h-[2.75rem]">{template.name}</DashboardCardTitle>
                  {template.scope === 'INSTITUTION' && (
                    <span className={dashboardCardTagClass}>Institution</span>
                  )}
                </div>
                <DashboardCardMeta
                  date={formatDashboardCardDate(
                    template.updatedAt || template.updated_at || template.createdAt || template.created_at
                  )}
                  status={getDashboardPublishStatus({
                    status: template.status,
                    deleted: Boolean(template.deletedAt),
                    isTemplate: true,
                  })}
                />

                <DashboardCardFooter>
                  <div className="flex min-w-0 justify-between gap-1 ">
                    <DashboardCardSecondaryAction
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (showTrash) {
                          void handleRestoreTemplate(template);
                          return;
                        }
                        if (isAdminUser) handleOpenEdit(template);
                        else handleUseTemplate(template);
                      }}
                    >
                      {showTrash ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </>
                      ) : isAdminUser ? (
                        'Configure'
                      ) : (
                        'Preview'
                      )}
                    </DashboardCardSecondaryAction>
                    {isAdminUser && !showTrash && (
                      <button
                        type="button"
                        title="Delete template"
                        aria-label="Delete template"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-[#ba1a1a] transition-colors hover:text-[#93000a]"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(template); }}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <DashboardCardPrimaryAction
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!template.deletedAt) handleUseTemplate(template);
                    }}
                  >
                    Use Template
                  </DashboardCardPrimaryAction>
                </DashboardCardFooter>
              </DashboardCardBody>
            </DashboardCard>
          ))}

          {isAdminUser && !showTrash && (
            <DashboardCardDashed onClick={handleOpenCreate} className="min-h-[380px]">
              <div className="w-16 h-16 rounded-full bg-[#e4e2e4] flex items-center justify-center mb-4 group-hover:bg-[#000000] group-hover:text-white transition-colors text-[#45464d] shadow-sm">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className={cn(dashboardCardTitleClass, 'mb-2')}>Start from Scratch</h3>
              <p className={cn(dashboardCardDescriptionClass, 'text-center max-w-xs mb-0')}>
                Build your vision from the ground up using our blank canvas.
              </p>
            </DashboardCardDashed>
          )}
        </div>
      )}

      {isAdminUser && (
        <TemplateFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editingTemplate={editingTemplate}
          onSuccess={handleFormSuccess}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#0F172A]">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
              Delete template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will move “{deleteTarget?.name}” to trash. You can restore it later from Trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isDeleting} className="mt-0 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteTemplate();
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
    </DashboardPageShell>
  );
}