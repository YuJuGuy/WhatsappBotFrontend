'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Megaphone,
    Loader2,
    Plus,
    Trash2,
    Upload,
    FileSpreadsheet,
    Users,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Eye,
    MessageSquareText,
    Layers,
    Smartphone,
    X,
} from 'lucide-react';

// ── Types ────────────────────────────────────────
interface Campaign {
    id: number;
    name: string;
    description: string | null;
    status: string;
    template_id: number | null;
    template_group_id: number | null;
    use_group: boolean;
    sender_phone_ids: number[];
    phone_column: string;
    variable_mapping: Record<string, string>;
    scheduled_at: string | null;
    created_at: string;
    recipient_count: number;
}

interface CampaignRecipient {
    id: number;
    phone_number: string;
    row_data: Record<string, string>;
}

interface TemplateItem {
    id: number;
    name: string;
    body: string;
}

interface TemplateGroup {
    id: number;
    name: string;
    description: string | null;
    templates: TemplateItem[];
}

interface PhoneInfo {
    id: number;
    name: string;
    number: string | null;
    status: string | null;
}

interface PhoneGroup {
    id: number;
    name: string;
    phones: PhoneInfo[];
}

// ── Status Helpers ───────────────────────────────
function getStatusConfig(status: string) {
    switch (status) {
        case 'active':
            return { label: 'نشطة', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
        case 'paused':
            return { label: 'متوقفة', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
        case 'completed':
            return { label: 'مكتملة', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
        case 'draft':
        default:
            return { label: 'مسودة', color: 'bg-secondary text-muted-foreground border-border' };
    }
}

// ── Main Page ────────────────────────────────────
export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Data for creation form
    const [templates, setTemplates] = useState<TemplateItem[]>([]);
    const [templateGroups, setTemplateGroups] = useState<TemplateGroup[]>([]);
    const [phones, setPhones] = useState<PhoneInfo[]>([]);
    const [phoneGroups, setPhoneGroups] = useState<PhoneGroup[]>([]);

    // Create dialog
    const [createOpen, setCreateOpen] = useState(false);
    const [createStep, setCreateStep] = useState(0); // 0=basic, 1=template, 2=senders, 3=file+mapping
    const [saving, setSaving] = useState(false);
    const [createError, setCreateError] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [useGroup, setUseGroup] = useState(false);
    const [templateId, setTemplateId] = useState<number | null>(null);
    const [templateGroupId, setTemplateGroupId] = useState<number | null>(null);
    const [selectedPhoneIds, setSelectedPhoneIds] = useState<number[]>([]);
    const [selectedPhoneGroupIds, setSelectedPhoneGroupIds] = useState<number[]>([]);
    const [scheduledAt, setScheduledAt] = useState('');

    // File & mapping
    const [xlsxFile, setXlsxFile] = useState<File | null>(null);
    const [xlsxWorkbook, setXlsxWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [xlsxColumns, setXlsxColumns] = useState<string[]>([]);
    const [phoneColumn, setPhoneColumn] = useState('');
    const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
    const [detectedVars, setDetectedVars] = useState<string[]>([]);

    // Detail view
    const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
    const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [detailTemplateBody, setDetailTemplateBody] = useState('');
    const [showCount, setShowCount] = useState(10);

    // Delete confirmation
    const [deleteDialog, setDeleteDialog] = useState<{ id: number; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Fetch Data ───────────────────────────────
    const fetchCampaigns = useCallback(async () => {
        try {
            const { data } = await api.get('/api/campaigns/');
            setCampaigns(data);
        } catch (err) { console.error('Failed to fetch campaigns:', err); }
    }, []);

    const fetchFormData = useCallback(async () => {
        try {
            const [tRes, tgRes, pRes, pgRes] = await Promise.all([
                api.get('/api/templates/'),
                api.get('/api/templates/groups/'),
                api.get('/api/phone/'),
                api.get('/api/phone/groups/'),
            ]);
            setTemplates(tRes.data);
            setTemplateGroups(tgRes.data);
            setPhones(pRes.data);
            setPhoneGroups(pgRes.data);
        } catch (err) { console.error('Failed to fetch form data:', err); }
    }, []);

    useEffect(() => {
        Promise.all([fetchCampaigns(), fetchFormData()]).finally(() => setLoading(false));
    }, [fetchCampaigns, fetchFormData]);

    // ── Template variable extraction ─────────────
    const extractVariables = useCallback((body: string): string[] => {
        const matches = body.match(/\{\{(\w+)\}\}/g);
        if (!matches) return [];
        return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
    }, []);

    // Update detected vars when template selection changes
    useEffect(() => {
        let vars: string[] = [];
        if (useGroup && templateGroupId) {
            const group = templateGroups.find(g => g.id === templateGroupId);
            if (group) {
                group.templates.forEach(t => {
                    vars.push(...extractVariables(t.body));
                });
                vars = [...new Set(vars)];
            }
        } else if (!useGroup && templateId) {
            const tpl = templates.find(t => t.id === templateId);
            if (tpl) vars = extractVariables(tpl.body);
        }
        setDetectedVars(vars);
        const newMapping: Record<string, string> = {};
        vars.forEach(v => { newMapping[v] = variableMapping[v] || ''; });
        setVariableMapping(newMapping);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useGroup, templateId, templateGroupId, templates, templateGroups, extractVariables]);

    // ── XLSX handling ────────────────────────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setXlsxFile(file);
        setXlsxWorkbook(null);
        setSheetNames([]);
        setSelectedSheet('');
        setXlsxColumns([]);
        setPhoneColumn('');
        setVariableMapping(prev => {
            const reset: Record<string, string> = {};
            Object.keys(prev).forEach(k => { reset[k] = ''; });
            return reset;
        });

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                setXlsxWorkbook(workbook);
                setSheetNames(workbook.SheetNames);

                // If only one sheet, select it automatically
                if (workbook.SheetNames.length === 1) {
                    setSelectedSheet(workbook.SheetNames[0]);
                }
            } catch {
                setCreateError('فشل في قراءة الملف');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Parse columns when sheet changes
    useEffect(() => {
        if (!xlsxWorkbook || !selectedSheet) return;

        const sheet = xlsxWorkbook.Sheets[selectedSheet];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        if (jsonData.length > 0) {
            const headers = jsonData[0].map(h => String(h || '').trim()).filter(Boolean);
            setXlsxColumns(headers);
        } else {
            setXlsxColumns([]);
        }
    }, [xlsxWorkbook, selectedSheet]);

    // Auto-map variables
    useEffect(() => {
        if (detectedVars.length > 0 && xlsxColumns.length > 0) {
            setVariableMapping(prev => {
                const next = { ...prev };
                let changed = false;
                detectedVars.forEach(v => {
                    if (!next[v]) {
                        // Find column with matching name (case-insensitive, ignore spaces)
                        const vNormalized = v.toLowerCase().replace(/\s+/g, '');
                        const match = xlsxColumns.find(c => c.toLowerCase().replace(/\s+/g, '') === vNormalized);
                        if (match) {
                            next[v] = match;
                            changed = true;
                        }
                    }
                });
                return changed ? next : prev;
            });

            // Auto-detect phone column if not set
            if (!phoneColumn) {
                const phoneCol = xlsxColumns.find(c =>
                    ['phone'].some(k => c.toLowerCase().includes(k))
                );
                if (phoneCol) setPhoneColumn(phoneCol);
            }
        }
    }, [detectedVars, xlsxColumns, phoneColumn]);

    // ── Create Campaign ──────────────────────────
    const resetForm = () => {
        setName('');
        setDescription('');
        setUseGroup(false);
        setTemplateId(null);
        setTemplateGroupId(null);
        setSelectedPhoneIds([]);
        setSelectedPhoneGroupIds([]);
        setScheduledAt('');
        setXlsxFile(null);
        setXlsxWorkbook(null);
        setSheetNames([]);
        setSelectedSheet('');
        setXlsxColumns([]);
        setPhoneColumn('');
        setVariableMapping({});
        setDetectedVars([]);
        setCreateStep(0);
        setCreateError('');
    };

    const openCreate = () => {
        resetForm();
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        setSaving(true);
        setCreateError('');
        try {
            const campaignData = {
                name,
                description: description || null,
                template_id: !useGroup ? templateId : null,
                template_group_id: useGroup ? templateGroupId : null,
                use_group: useGroup,
                phone_ids: selectedPhoneIds.length > 0 ? selectedPhoneIds : null,
                phone_group_ids: selectedPhoneGroupIds.length > 0 ? selectedPhoneGroupIds : null,
                phone_column: phoneColumn,
                variable_mapping: variableMapping,
                scheduled_at: scheduledAt,
                sheet_name: selectedSheet,
            };

            const formData = new FormData();
            formData.append('campaign_data', JSON.stringify(campaignData));
            formData.append('file', xlsxFile!);

            await api.post('/api/campaigns/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            await fetchCampaigns();
            setCreateOpen(false);
            resetForm();
        } catch (err: any) {
            setCreateError(err.response?.data?.detail || 'فشل في إنشاء الحملة');
        } finally {
            setSaving(false);
        }
    };

    // ── Render message for a recipient ───────────
    const renderMessage = (recipient: CampaignRecipient, templateBody: string, mapping: Record<string, string>): string => {
        let msg = templateBody;
        for (const [varName, colName] of Object.entries(mapping)) {
            msg = msg.replaceAll(`{{${varName}}}`, recipient.row_data[colName] || '');
        }
        return msg;
    };

    // ── View Campaign ────────────────────────────
    const openCampaignDetail = async (campaign: Campaign) => {
        setViewCampaign(campaign);
        setLoadingRecipients(true);
        setShowCount(10);
        setDetailTemplateBody('');
        try {
            // Fetch recipients + template body in parallel
            const recipientPromise = api.get(`/api/campaigns/${campaign.id}/recipients`);
            let bodyPromise: Promise<string>;

            if (campaign.use_group && campaign.template_group_id) {
                // For groups, fetch the group and use the first template's body as preview
                bodyPromise = api.get(`/api/templates/groups/${campaign.template_group_id}`)
                    .then(r => r.data.templates?.[0]?.body || '');
            } else if (!campaign.use_group && campaign.template_id) {
                bodyPromise = api.get(`/api/templates/${campaign.template_id}`)
                    .then(r => r.data.body || '');
            } else {
                bodyPromise = Promise.resolve('');
            }

            const [recRes, body] = await Promise.all([recipientPromise, bodyPromise]);
            setRecipients(recRes.data);
            setDetailTemplateBody(body);
        } catch (err) { console.error('Failed to fetch recipients/template:', err); }
        finally { setLoadingRecipients(false); }
    };

    // ── Delete Campaign ──────────────────────────
    const deleteCampaign = async (id: number) => {
        setDeleting(true);
        try {
            await api.delete(`/api/campaigns/${id}`);
            await fetchCampaigns();
            setDeleteDialog(null);
        } catch (err) { console.error('Failed to delete campaign:', err); }
        finally { setDeleting(false); }
    };

    // ── Step validation ──────────────────────────
    const canGoNext = () => {
        switch (createStep) {
            case 0: return name.trim().length > 0 && scheduledAt.length > 0;
            case 1: return useGroup ? !!templateGroupId : !!templateId;
            case 2: return selectedPhoneIds.length > 0 || selectedPhoneGroupIds.length > 0;
            case 3: {
                if (!xlsxFile || !phoneColumn) return false;
                if (detectedVars.length > 0) {
                    return detectedVars.every(v => variableMapping[v]);
                }
                return true;
            }
            default: return false;
        }
    };

    // ── Toggle helpers ───────────────────────────
    const togglePhone = (id: number) => {
        setSelectedPhoneIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const togglePhoneGroup = (id: number) => {
        setSelectedPhoneGroupIds(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    // ── Loading ──────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <Megaphone className="w-6 h-6" />
                    الحملات
                </h1>
                <p className="mt-1 text-muted-foreground">
                    إنشاء وإدارة حملات الرسائل
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                    {campaigns.length} حملة
                </p>
                <Button onClick={openCreate} className="bg-white text-gray-900 hover:bg-gray-100 gap-2">
                    <Plus className="w-4 h-4" />
                    حملة جديدة
                </Button>
            </div>

            {/* Campaign List */}
            {campaigns.length === 0 ? (
                <Card className="bg-card border-border border-dashed">
                    <CardContent className="py-12 text-center">
                        <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground mb-2">لا توجد حملات بعد</p>
                        <p className="text-sm text-muted-foreground/70">أنشئ حملة جديدة لبدء إرسال الرسائل</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {campaigns.map(c => {
                        const statusCfg = getStatusConfig(c.status);
                        return (
                            <Card key={c.id} className="bg-card border-border group hover:border-white/20 transition-all duration-200">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary border border-border shrink-0">
                                                <Megaphone className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="text-base text-white truncate">{c.name}</CardTitle>
                                                {c.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openCampaignDetail(c)}>
                                                <Eye className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteDialog({ id: c.id, name: c.name })}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                                                {statusCfg.label}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs gap-1">
                                                <Users className="w-3 h-3" />
                                                {c.recipient_count}
                                            </Badge>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground/50">
                                            {new Date(c.created_at).toLocaleDateString('ar')}
                                        </span>
                                    </div>
                                    {c.scheduled_at && (
                                        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            مجدولة: {new Date(c.scheduled_at).toLocaleString('ar')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ═══ Create Campaign Dialog ═══ */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">حملة جديدة</DialogTitle>
                        <DialogDescription>
                            {['المعلومات الأساسية', 'اختيار القالب', 'أرقام الإرسال', 'الملف والمتغيرات'][createStep]}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step indicators */}
                    <div className="flex items-center gap-2 mb-4">
                        {[0, 1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${s <= createStep ? 'bg-white' : 'bg-secondary'}`}
                            />
                        ))}
                    </div>

                    {/* Step 0: Basic Info */}
                    {createStep === 0 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white">اسم الحملة</Label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="مثال: حملة رمضان"
                                    className="bg-secondary border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">الوصف (اختياري)</Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="وصف الحملة..."
                                    className="bg-secondary border-border min-h-[80px] resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">موعد الإرسال</Label>
                                <Input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={e => setScheduledAt(e.target.value)}
                                    className="bg-secondary border-border"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 1: Template Selection */}
                    {createStep === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/40 border border-border">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input
                                        type="radio"
                                        checked={!useGroup}
                                        onChange={() => { setUseGroup(false); setTemplateGroupId(null); }}
                                        className="accent-white"
                                    />
                                    <MessageSquareText className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-white">قالب واحد</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input
                                        type="radio"
                                        checked={useGroup}
                                        onChange={() => { setUseGroup(true); setTemplateId(null); }}
                                        className="accent-white"
                                    />
                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-white">مجموعة قوالب</span>
                                </label>
                            </div>

                            {!useGroup ? (
                                <div className="space-y-2">
                                    <Label className="text-white">اختر القالب</Label>
                                    {templates.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/60 py-4 text-center">لا توجد قوالب. أنشئ قالب أولاً.</p>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 space-y-1">
                                            {templates.map(t => (
                                                <label
                                                    key={t.id}
                                                    className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${templateId === t.id ? 'bg-white/10 border border-white/20' : 'hover:bg-secondary/60 border border-transparent'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        checked={templateId === t.id}
                                                        onChange={() => setTemplateId(t.id)}
                                                        className="accent-white mt-1"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-white font-medium">{t.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-white">اختر مجموعة القوالب</Label>
                                    {templateGroups.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/60 py-4 text-center">لا توجد مجموعات. أنشئ مجموعة أولاً.</p>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 space-y-1">
                                            {templateGroups.map(g => (
                                                <label
                                                    key={g.id}
                                                    className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${templateGroupId === g.id ? 'bg-white/10 border border-white/20' : 'hover:bg-secondary/60 border border-transparent'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        checked={templateGroupId === g.id}
                                                        onChange={() => setTemplateGroupId(g.id)}
                                                        className="accent-white mt-1"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-white font-medium">{g.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{g.templates.length} قالب</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {detectedVars.length > 0 && (
                                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                                    <p className="text-xs text-muted-foreground mb-2">المتغيرات المكتشفة:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {detectedVars.map(v => (
                                            <Badge key={v} variant="secondary" className="text-xs font-mono">{`{{${v}}}`}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Sender Phones */}
                    {createStep === 2 && (
                        <div className="space-y-4">
                            {/* Individual phones */}
                            {phones.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-white flex items-center gap-2">
                                        <Smartphone className="w-4 h-4" />
                                        أرقام فردية
                                    </Label>
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 space-y-1">
                                        {phones.map(p => (
                                            <label key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer">
                                                <Checkbox
                                                    checked={selectedPhoneIds.includes(p.id)}
                                                    onCheckedChange={() => togglePhone(p.id)}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-white truncate">{p.name}</p>
                                                    {p.number && <p className="text-xs text-muted-foreground font-mono" dir="ltr">{p.number}</p>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Phone groups */}
                            {phoneGroups.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-white flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        مجموعات الأرقام
                                    </Label>
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 space-y-1">
                                        {phoneGroups.map(g => (
                                            <label key={g.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer">
                                                <Checkbox
                                                    checked={selectedPhoneGroupIds.includes(g.id)}
                                                    onCheckedChange={() => togglePhoneGroup(g.id)}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-white truncate">{g.name}</p>
                                                    <p className="text-xs text-muted-foreground">{g.phones.length} رقم</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                {selectedPhoneIds.length} رقم فردي + {selectedPhoneGroupIds.length} مجموعة محددة
                            </p>
                        </div>
                    )}

                    {/* Step 3: File & Mapping */}
                    {createStep === 3 && (
                        <div className="space-y-4">
                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label className="text-white">ملف المستلمين (XLSX)</Label>
                                {!xlsxFile ? (
                                    <label className="flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed border-border bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors">
                                        <Upload className="w-8 h-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">اضغط لاختيار ملف XLSX</span>
                                        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
                                        <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-white truncate">{xlsxFile.name}</p>
                                            <p className="text-xs text-muted-foreground">{xlsxColumns.length} عمود</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-400 shrink-0"
                                            onClick={() => {
                                                setXlsxFile(null);
                                                setXlsxWorkbook(null);
                                                setSheetNames([]);
                                                setSelectedSheet('');
                                                setXlsxColumns([]);
                                                setPhoneColumn('');
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Sheet Selection */}
                            {sheetNames.length > 1 && (
                                <div className="space-y-2">
                                    <Label className="text-white">اختر ورقة العمل (Sheet)</Label>
                                    <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                                        <SelectTrigger className="bg-secondary border-border">
                                            <SelectValue placeholder="اختر الورقة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sheetNames.map(name => (
                                                <SelectItem key={name} value={name}>{name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Phone Column */}
                            {xlsxColumns.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-white">عمود أرقام المستلمين</Label>
                                    <Select value={phoneColumn} onValueChange={setPhoneColumn}>
                                        <SelectTrigger className="bg-secondary border-border">
                                            <SelectValue placeholder="اختر العمود" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {xlsxColumns.map(col => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Variable Mapping */}
                            {detectedVars.length > 0 && xlsxColumns.length > 0 && (
                                <div className="space-y-3">
                                    <Label className="text-white">ربط المتغيرات بالأعمدة</Label>
                                    <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
                                        {detectedVars.map(v => (
                                            <div key={v} className="flex items-center gap-3">
                                                <Badge variant="secondary" className="text-xs font-mono shrink-0 min-w-[100px] justify-center">
                                                    {`{{${v}}}`}
                                                </Badge>
                                                <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <Select
                                                    value={variableMapping[v] || ''}
                                                    onValueChange={(val) => setVariableMapping(prev => ({ ...prev, [v]: val }))}
                                                >
                                                    <SelectTrigger className="bg-secondary border-border flex-1">
                                                        <SelectValue placeholder="اختر العمود" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {xlsxColumns.map(col => (
                                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {createError && (
                        <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{createError}</p>
                    )}

                    {/* Footer */}
                    <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
                        {createStep > 0 && (
                            <Button variant="outline" onClick={() => setCreateStep(s => s - 1)} className="border-border gap-1">
                                <ChevronRight className="w-4 h-4" />
                                السابق
                            </Button>
                        )}
                        <div className="flex-1" />
                        <Button variant="outline" onClick={() => setCreateOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        {createStep < 3 ? (
                            <Button
                                onClick={() => setCreateStep(s => s + 1)}
                                disabled={!canGoNext()}
                                className="bg-white text-gray-900 hover:bg-gray-100 gap-1"
                            >
                                التالي
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleCreate}
                                disabled={saving || !canGoNext()}
                                className="bg-white text-gray-900 hover:bg-gray-100 gap-1"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                إنشاء الحملة
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Campaign Detail Dialog ═══ */}
            <Dialog open={!!viewCampaign} onOpenChange={() => setViewCampaign(null)}>
                <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
                    {viewCampaign && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-white flex items-center gap-2">
                                    <Megaphone className="w-5 h-5" />
                                    {viewCampaign.name}
                                </DialogTitle>
                                <DialogDescription>{viewCampaign.description || 'بدون وصف'}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                                        <p className="text-xs text-muted-foreground">الحالة</p>
                                        <Badge variant="outline" className={`text-xs mt-1 ${getStatusConfig(viewCampaign.status).color}`}>
                                            {getStatusConfig(viewCampaign.status).label}
                                        </Badge>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                                        <p className="text-xs text-muted-foreground">المستلمين</p>
                                        <p className="text-lg font-semibold text-white mt-1">{viewCampaign.recipient_count}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                                        <p className="text-xs text-muted-foreground">أرقام الإرسال</p>
                                        <p className="text-lg font-semibold text-white mt-1">{viewCampaign.sender_phone_ids.length}</p>
                                    </div>
                                </div>

                                {/* Recipients */}
                                <div className="space-y-2">
                                    <Label className="text-white">المستلمون</Label>
                                    {loadingRecipients ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : recipients.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مستلمون</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {recipients.slice(0, showCount).map((r, i) => {
                                                const msg = detailTemplateBody && viewCampaign
                                                    ? renderMessage(r, detailTemplateBody, viewCampaign.variable_mapping)
                                                    : null;
                                                return (
                                                    <div key={r.id} className="group p-4 rounded-xl bg-card border border-border/40 hover:border-white/10 transition-colors">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50 text-[10px] text-muted-foreground font-mono">
                                                                    {i + 1}
                                                                </span>
                                                                <span className="text-sm font-semibold text-white tracking-wide font-mono opacity-90" dir="ltr">
                                                                    {r.phone_number}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {msg ? (
                                                            <div className="relative bg-secondary/30 rounded-2xl rounded-tr-sm p-3.5 border border-white/5">
                                                                <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-sans" dir="auto">
                                                                    {msg}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                                                <p className="text-xs text-red-400/60 italic flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                                                                    لا يمكن معاينة الرسالة (القالب غير موجود)
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {recipients.length > showCount && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full py-6 text-muted-foreground hover:text-white border border-dashed border-border hover:border-white/20 hover:bg-secondary/20"
                                                    onClick={() => setShowCount(c => c + 10)}
                                                >
                                                    عرض {recipients.length - showCount} مستلم إضافي
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═══ Delete Confirmation ═══ */}
            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="bg-card border-border sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">تأكيد الحذف</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف الحملة{' '}
                            <span className="text-white font-medium">&quot;{deleteDialog?.name}&quot;</span>؟
                            <span className="block mt-1 text-xs">سيتم حذف الحملة وجميع المستلمين</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteDialog(null)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteDialog && deleteCampaign(deleteDialog.id)}
                            disabled={deleting}
                        >
                            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            حذف
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
