import React, { useState, useCallback, useEffect } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import useBuilderStore from '@/store/useBuilderStore';
import {
    Settings,
    Globe,
    Shield,
    Zap,
    Smartphone,
    Palette,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Copy,
    Trash2,
    RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import websiteApi from '@/api/website';

export function SiteSettings() {
    const { state } = useBuilder();
    const { activeWebsite } = state;
    const store = useBuilderStore();
    const { toast } = useToast();

    const [projectName, setProjectName] = useState(activeWebsite?.name || '');
    const [customDomain, setCustomDomain] = useState('');
    const [lazyLoading, setLazyLoading] = useState(true);
    const [assetOptimization, setAssetOptimization] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [domains, setDomains] = useState<any[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isVerifying, setIsVerifying] = useState<string | null>(null);

    // Load domains on mount
    useEffect(() => {
        if (!activeWebsite) return;
        websiteApi.getDomains(activeWebsite.id)
            .then((res: any) => setDomains(res.data?.domains || res.data || []))
            .catch(() => { });
    }, [activeWebsite]);

    const handleConnectDomain = useCallback(async () => {
        if (!activeWebsite || !customDomain.trim()) return;
        const domain = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
        if (!domain.includes('.') || domain.length < 4) {
            toast({ title: 'Invalid domain', description: 'Enter a valid domain like mysite.com', variant: 'destructive' });
            return;
        }
        setIsConnecting(true);
        try {
            const isSubdomain = domain.endsWith('.buildora.lmsathena.com');
            const res = isSubdomain
                ? await websiteApi.addSubdomain(activeWebsite.id, domain.replace('.buildora.lmsathena.com', ''))
                : await websiteApi.addDomain(activeWebsite.id, domain);

            const newDomain = res.data?.domain || res.data;
            setDomains(prev => {
                const filtered = prev.filter((d: any) => d.domain !== domain);
                return [newDomain, ...filtered];
            });
            setCustomDomain('');
            toast({ title: 'Domain added', description: 'Configure your DNS records below to activate it.' });
        } catch (err: any) {
            toast({ title: 'Error', description: err.response?.data?.error || 'Failed to add domain', variant: 'destructive' });
        } finally {
            setIsConnecting(false);
        }
    }, [activeWebsite, customDomain, toast]);

    const handleVerifyDomain = useCallback(async (domainId: string, domainName: string) => {
        if (!activeWebsite) return;
        setIsVerifying(domainName);
        try {
            const res = await websiteApi.verifyDomain(domainId);
            const result = res.data;
            setDomains(prev => prev.map((d: any) => {
                if (d.id !== domainId) return d;
                if (result.verified) {
                    return result.domain || { ...d, status: 'ACTIVE', dns_records: { ...d.dns_records, verified: true } };
                }
                return {
                    ...d,
                    status: 'PENDING',
                    dns_records: {
                        ...d.dns_records,
                        validation: result.dnsValidationRecords || d.dns_records?.validation
                    }
                };
            }));
            toast({
                title: result.verified ? 'Domain verified!' : 'DNS not ready yet',
                description: result.verified ? 'Your custom domain is now active.' : 'DNS records haven\'t propagated yet. This can take up to 48 hours.',
                variant: result.verified ? 'default' : 'destructive',
            });
        } catch {
            toast({ title: 'Verification failed', description: 'Could not check DNS records.', variant: 'destructive' });
        } finally {
            setIsVerifying(null);
        }
    }, [activeWebsite, toast]);

    const handleRemoveDomain = useCallback(async (domainId: string) => {
        if (!activeWebsite) return;
        try {
            await websiteApi.removeDomain(domainId);
            setDomains(prev => prev.filter((d: any) => d.id !== domainId));
            toast({ title: 'Domain removed' });
        } catch {
            toast({ title: 'Error', description: 'Failed to remove domain', variant: 'destructive' });
        }
    }, [activeWebsite, toast]);

    const handleSave = useCallback(async () => {
        if (!activeWebsite) return;
        setIsSaving(true);
        try {
            if (projectName && projectName !== activeWebsite.name) {
                await store.updateWebsite(activeWebsite.id, { name: projectName });
            }
            toast({ title: 'Settings saved', description: 'Your site settings have been updated.' });
        } catch (err) {
            console.error('Failed to save settings:', err);
            toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [activeWebsite, projectName, store, toast]);

    if (!activeWebsite) return null;

    const sectionLabelClass = 'text-[10px] font-bold uppercase tracking-widest text-slate-400';
    const fieldLabelClass = 'text-xs font-bold text-white';
    const inputClass =
        'h-10 text-xs rounded-xl border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/30';
    const cardClass = 'rounded-xl border border-white/10 bg-white/10';
    const ghostIconClass = 'h-7 w-7 p-0 text-white/70 hover:bg-white/10 hover:text-white';
    const switchClass =
        'data-[state=checked]:bg-white data-[state=unchecked]:bg-white/20 [&>span]:bg-white data-[state=checked]:[&>span]:bg-[#0F172A]';

    return (
        <div className="relative h-full flex flex-col overflow-hidden bg-[#0F172A] text-white animate-in fade-in duration-300">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] origin-bottom-right skew-x-[-18deg] bg-white/[0.06]" />

            <div className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
                <h2 className="text-sm font-semibold tracking-tight text-white">Site Settings</h2>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white">
                    <Settings className="h-3.5 w-3.5" />
                </div>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
                <div className="space-y-4 p-3">
                    {/* General Section */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 px-0.5">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <h3 className={sectionLabelClass}>General</h3>
                        </div>

                        <div className={cn(cardClass, 'space-y-3 p-3')}>
                            <div className="space-y-2">
                                <Label className={fieldLabelClass}>Project Name</Label>
                                <Input
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className={fieldLabelClass}>Custom Domain</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="mysite.com"
                                        value={customDomain}
                                        onChange={(e) => setCustomDomain(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleConnectDomain()}
                                        className={cn(inputClass, 'flex-1')}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-10 rounded-xl px-4 text-xs font-bold bg-white text-[#0F172A] hover:bg-slate-100"
                                        onClick={handleConnectDomain}
                                        disabled={isConnecting || !customDomain.trim()}
                                    >
                                        {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Connect'}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-white/60">Add your domain purchased from any registrar (GoDaddy, Namecheap, Squarespace, etc.)</p>
                            </div>

                            {/* Connected Domains List */}
                            {domains.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    <Label className={fieldLabelClass}>Connected Domains</Label>
                                    {domains.map((d: any) => (
                                        <div key={d.domain} className="space-y-2 rounded-lg border border-white/10 bg-white/[0.06] p-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {d.status === 'ACTIVE' ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                    ) : (
                                                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                                    )}
                                                    <span className="text-xs font-semibold text-white">{d.domain}</span>
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${d.status === 'ACTIVE' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
                                                        }`}>
                                                        {d.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {d.type === 'CUSTOM' && d.status !== 'ACTIVE' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={ghostIconClass}
                                                            onClick={() => handleVerifyDomain(d.id, d.domain)}
                                                            disabled={isVerifying === d.domain}
                                                        >
                                                            {isVerifying === d.domain ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <RefreshCw className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-rose-400 hover:bg-white/10 hover:text-rose-300"
                                                        onClick={() => handleRemoveDomain(d.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* DNS Instructions for pending custom domains */}
                                            {d.type === 'CUSTOM' && d.status !== 'ACTIVE' && d.dns_records?.validation && d.dns_records.validation.length > 0 && (
                                                <div className="mt-2 rounded-lg border border-white/10 bg-[#0F172A]/60 p-2.5">
                                                    <p className="mb-2 text-[10px] font-bold text-slate-300">
                                                        Go to your domain registrar's DNS settings and add these records:
                                                    </p>
                                                    <div className="space-y-1.5">
                                                        {d.dns_records.validation.map((record: any, index: number) => (
                                                            <div key={index} className="mb-2 flex flex-col gap-1 border-b border-white/10 pb-2 text-[10px] last:mb-0 last:border-0 last:pb-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="w-12 flex-shrink-0 text-white/50"><strong>Type</strong></span>
                                                                    <code className="rounded border border-white/15 bg-white/10 px-1 py-0.5 font-bold text-white">{record.type}</code>
                                                                </div>
                                                                <div className="flex items-center justify-between group">
                                                                    <span className="w-12 flex-shrink-0 text-white/50"><strong>Name</strong></span>
                                                                    <div className="flex items-center justify-end overflow-hidden">
                                                                        <code className="mr-1 max-w-[150px] truncate rounded border border-white/15 bg-white/10 px-1 py-0.5 text-slate-200" title={record.name}>{record.name}</code>
                                                                        <Button variant="ghost" size="sm" className="h-5 w-5 shrink-0 p-0 text-white/70 hover:bg-white/10 hover:text-white"
                                                                            onClick={() => { navigator.clipboard.writeText(record.name); toast({ title: 'Name Copied!' }); }}>
                                                                            <Copy className="w-2.5 h-2.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between group">
                                                                    <span className="w-12 flex-shrink-0 text-white/50"><strong>Value</strong></span>
                                                                    <div className="flex items-center justify-end overflow-hidden">
                                                                        <code className="mr-1 max-w-[150px] truncate rounded border border-white/15 bg-white/10 px-1 py-0.5 text-slate-200" title={record.value}>{record.value}</code>
                                                                        <Button variant="ghost" size="sm" className="h-5 w-5 shrink-0 p-0 text-white/70 hover:bg-white/10 hover:text-white"
                                                                            onClick={() => { navigator.clipboard.writeText(record.value); toast({ title: 'Value Copied!' }); }}>
                                                                            <Copy className="w-2.5 h-2.5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="mt-2 text-[9px] text-white/50">
                                                        DNS propagation can take up to 48 hours. Click the refresh button above to check.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SEO & Performance */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 px-0.5">
                            <Zap className="h-3.5 w-3.5 text-slate-400" />
                            <h3 className={sectionLabelClass}>Performance</h3>
                        </div>

                        <div className="space-y-2">
                            <div className={cn(cardClass, 'flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-white/15')}>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white">Lazy Loading</p>
                                    <p className="min-w-0 text-[10px] text-white/60">Load images as they enter the viewport</p>
                                </div>
                                <Switch className={switchClass} checked={lazyLoading} onCheckedChange={setLazyLoading} />
                            </div>
                            <div className={cn(cardClass, 'flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-white/15')}>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white">Asset Optimization</p>
                                    <p className="min-w-0 text-[10px] text-white/60">Compress images and minify code</p>
                                </div>
                                <Switch className={switchClass} checked={assetOptimization} onCheckedChange={setAssetOptimization} />
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 px-0.5">
                            <Shield className="h-3.5 w-3.5 text-slate-400" />
                            <h3 className={sectionLabelClass}>Security</h3>
                        </div>

                        <div className={cn(cardClass, 'flex gap-2.5 p-3')}>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white">SSL certificate active</p>
                                <p className="text-[10px] font-medium leading-relaxed text-white/60">
                                    Your site is automatically protected with a 256-bit SSL encryption.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 border-t border-white/10 bg-[#0F172A] px-3 py-3">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-9 w-full rounded-xl bg-white text-xs font-bold text-[#0F172A] shadow-none hover:bg-slate-100"
                >
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
