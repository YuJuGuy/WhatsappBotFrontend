'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    FileText,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    FolderOpen,
    ChevronDown,
    ChevronUp,
    MessageSquareText,
    Layers,
    Variable,
} from 'lucide-react';

// ── Types ────────────────────────────────────────
interface Template {
    id: number;
    name: string;
    body: string;
}

interface TemplateGroup {
    id: number;
    name: string;
    description: string | null;
    templates: Template[];
}

// ── Variable-Highlighted Preview ─────────────────
function HighlightedBody({ body }: { body: string }) {
    const parts = body.split(/(\{\{\w+\}\})/g);
    return (
        <div className="bg-secondary/40 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-hidden relative" dir="ltr">
            {parts.map((part, i) =>
                /\{\{\w+\}\}/.test(part) ? (
                    <span key={i} className="bg-violet-500/25 text-violet-300 rounded px-1 py-0.5 font-mono text-xs">
                        {part}
                    </span>
                ) : (
                    <span key={i} className="text-muted-foreground">{part}</span>
                )
            )}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
        </div>
    );
}

// ── Main Page ────────────────────────────────────
export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [groups, setGroups] = useState<TemplateGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Template dialog state
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateForm, setTemplateForm] = useState({ name: '', body: '' });
    const [savingTemplate, setSavingTemplate] = useState(false);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    // Variable insertion dialog
    const [varDialogOpen, setVarDialogOpen] = useState(false);
    const [varName, setVarName] = useState('');

    // Group dialog state
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<TemplateGroup | null>(null);
    const [groupForm, setGroupForm] = useState({ name: '', description: '', template_ids: [] as number[] });
    const [savingGroup, setSavingGroup] = useState(false);

    // Expanded groups
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    // Delete confirmation
    const [deleteDialog, setDeleteDialog] = useState<{ type: 'template' | 'group'; id: number; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ── Fetch Data ───────────────────────────────
    const fetchTemplates = useCallback(async () => {
        try {
            const { data } = await api.get('/api/templates/');
            setTemplates(data);
        } catch (err) { console.error('Failed to fetch templates:', err); }
    }, []);

    const fetchGroups = useCallback(async () => {
        try {
            const { data } = await api.get('/api/templates/groups/');
            setGroups(data);
        } catch (err) { console.error('Failed to fetch groups:', err); }
    }, []);

    useEffect(() => {
        Promise.all([fetchTemplates(), fetchGroups()]).finally(() => setLoading(false));
    }, [fetchTemplates, fetchGroups]);

    // ── Template CRUD ────────────────────────────
    const openNewTemplate = () => {
        setEditingTemplate(null);
        setTemplateForm({ name: '', body: '' });
        setTemplateDialogOpen(true);
    };

    const openEditTemplate = (t: Template) => {
        setEditingTemplate(t);
        setTemplateForm({ name: t.name, body: t.body });
        setTemplateDialogOpen(true);
    };

    const saveTemplate = async () => {
        setSavingTemplate(true);
        try {
            if (editingTemplate) {
                await api.put(`/api/templates/${editingTemplate.id}`, templateForm);
            } else {
                await api.post('/api/templates/', templateForm);
            }
            await fetchTemplates();
            await fetchGroups();
            setTemplateDialogOpen(false);
        } catch (err) { console.error('Failed to save template:', err); }
        finally { setSavingTemplate(false); }
    };

    const deleteTemplate = async (id: number) => {
        setDeleting(true);
        try {
            await api.delete(`/api/templates/${id}`);
            await fetchTemplates();
            await fetchGroups();
            setDeleteDialog(null);
        } catch (err) { console.error('Failed to delete template:', err); }
        finally { setDeleting(false); }
    };

    // ── Variable insertion ───────────────────────
    const insertVariable = () => {
        if (!varName.trim()) return;
        const tag = `{{${varName.trim()}}}`;
        const textarea = bodyRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = templateForm.body.substring(0, start);
            const after = templateForm.body.substring(end);
            const newBody = before + tag + after;
            setTemplateForm({ ...templateForm, body: newBody });
            // Set cursor after the inserted variable
            setTimeout(() => {
                textarea.focus();
                const newPos = start + tag.length;
                textarea.setSelectionRange(newPos, newPos);
            }, 0);
        } else {
            setTemplateForm({ ...templateForm, body: templateForm.body + tag });
        }
        setVarName('');
        setVarDialogOpen(false);
    };

    // ── Get detected variables from body ─────────
    const getBodyVars = (body: string): string[] => {
        const matches = body.match(/\{\{(\w+)\}\}/g);
        if (!matches) return [];
        return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
    };

    // ── Group CRUD ───────────────────────────────
    const openNewGroup = () => {
        setEditingGroup(null);
        setGroupForm({ name: '', description: '', template_ids: [] });
        setGroupDialogOpen(true);
    };

    const openEditGroup = (g: TemplateGroup) => {
        setEditingGroup(g);
        setGroupForm({
            name: g.name,
            description: g.description || '',
            template_ids: g.templates.map(t => t.id),
        });
        setGroupDialogOpen(true);
    };

    const saveGroup = async () => {
        setSavingGroup(true);
        try {
            if (editingGroup) {
                await api.put(`/api/templates/groups/${editingGroup.id}`, groupForm);
            } else {
                await api.post('/api/templates/groups/', groupForm);
            }
            await fetchGroups();
            setGroupDialogOpen(false);
        } catch (err) { console.error('Failed to save group:', err); }
        finally { setSavingGroup(false); }
    };

    const deleteGroup = async (id: number) => {
        setDeleting(true);
        try {
            await api.delete(`/api/templates/groups/${id}`);
            await fetchGroups();
            setDeleteDialog(null);
        } catch (err) { console.error('Failed to delete group:', err); }
        finally { setDeleting(false); }
    };

    const toggleGroupExpand = (id: number) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleTemplateInGroup = (tid: number) => {
        setGroupForm(prev => ({
            ...prev,
            template_ids: prev.template_ids.includes(tid)
                ? prev.template_ids.filter(id => id !== tid)
                : [...prev.template_ids, tid],
        }));
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
                    <FileText className="w-6 h-6" />
                    القوالب
                </h1>
                <p className="mt-1 text-muted-foreground">
                    إدارة قوالب الرسائل ومجموعات القوالب
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="templates" dir="rtl">
                <TabsList className="bg-secondary/60 border border-border mb-6">
                    <TabsTrigger value="templates" className="data-[state=active]:bg-card data-[state=active]:text-white gap-2">
                        <MessageSquareText className="w-4 h-4" />
                        القوالب
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="data-[state=active]:bg-card data-[state=active]:text-white gap-2">
                        <Layers className="w-4 h-4" />
                        مجموعات القوالب
                    </TabsTrigger>
                </TabsList>

                {/* ═══ Templates Tab ═══ */}
                <TabsContent value="templates" className="space-y-4 animate-in fade-in-50 duration-300">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {templates.length} قالب
                        </p>
                        <Button onClick={openNewTemplate} className="bg-white text-gray-900 hover:bg-gray-100 gap-2">
                            <Plus className="w-4 h-4" />
                            قالب جديد
                        </Button>
                    </div>

                    {templates.length === 0 ? (
                        <Card className="bg-card border-border border-dashed">
                            <CardContent className="py-12 text-center">
                                <MessageSquareText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                                <p className="text-muted-foreground mb-2">لا توجد قوالب بعد</p>
                                <p className="text-sm text-muted-foreground/70">أنشئ قالب رسالة لاستخدامه في حملاتك</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {templates.map(t => {
                                const vars = getBodyVars(t.body);
                                return (
                                    <Card key={t.id} className="bg-card border-border group hover:border-white/20 transition-all duration-200">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <CardTitle className="text-base text-white">{t.name}</CardTitle>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEditTemplate(t)}>
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteDialog({ type: 'template', id: t.id, name: t.name })}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <HighlightedBody body={t.body} />
                                            {vars.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {vars.map(v => (
                                                        <Badge key={v} variant="secondary" className="text-[10px] font-mono bg-violet-500/15 text-violet-300 border-violet-500/20">
                                                            {v}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ═══ Groups Tab ═══ */}
                <TabsContent value="groups" className="space-y-4 animate-in fade-in-50 duration-300">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {groups.length} مجموعة
                        </p>
                        <Button onClick={openNewGroup} className="bg-white text-gray-900 hover:bg-gray-100 gap-2">
                            <Plus className="w-4 h-4" />
                            مجموعة جديدة
                        </Button>
                    </div>

                    {groups.length === 0 ? (
                        <Card className="bg-card border-border border-dashed">
                            <CardContent className="py-12 text-center">
                                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                                <p className="text-muted-foreground mb-2">لا توجد مجموعات بعد</p>
                                <p className="text-sm text-muted-foreground/70">أنشئ مجموعة لتنظيم قوالبك</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {groups.map(g => (
                                <Card key={g.id} className="bg-card border-border overflow-hidden">
                                    {/* Group Header */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                                        onClick={() => toggleGroupExpand(g.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedGroups.has(g.id) ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                            <div>
                                                <h3 className="text-white font-medium">{g.name}</h3>
                                                {g.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {g.templates.length} قالب
                                            </Badge>
                                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEditGroup(g)}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteDialog({ type: 'group', id: g.id, name: g.name })}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Templates */}
                                    {expandedGroups.has(g.id) && (
                                        <div className="border-t border-border bg-secondary/10 p-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            {g.templates.length === 0 ? (
                                                <p className="text-sm text-muted-foreground/60 text-center py-4">
                                                    لا توجد قوالب في هذه المجموعة
                                                </p>
                                            ) : (
                                                g.templates.map(t => (
                                                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/60">
                                                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm text-white font-medium truncate">{t.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{t.body}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ═══ Template Dialog ═══ */}
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingTemplate ? 'تعديل القالب' : 'قالب جديد'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate ? 'عدّل بيانات القالب' : 'أنشئ قالب رسالة جديد'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="tpl-name" className="text-white">اسم القالب</Label>
                            <Input
                                id="tpl-name"
                                value={templateForm.name}
                                onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                                placeholder="مثال: رسالة ترحيبية"
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="tpl-body" className="text-white">نص الرسالة</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 border-violet-500/30 text-violet-300 hover:bg-violet-500/15 hover:text-violet-200"
                                    onClick={() => { setVarName(''); setVarDialogOpen(true); }}
                                >
                                    <Variable className="w-3.5 h-3.5" />
                                    إضافة متغير
                                </Button>
                            </div>
                            <textarea
                                id="tpl-body"
                                ref={bodyRef}
                                value={templateForm.body}
                                onChange={e => setTemplateForm({ ...templateForm, body: e.target.value })}
                                placeholder="Hello {{name}}, welcome to our service!"
                                className="flex min-h-[140px] w-full rounded-md border bg-secondary border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-mono leading-relaxed"
                                dir="ltr"
                                style={{ textAlign: 'left' }}
                            />
                            <p className="text-[11px] text-muted-foreground/60">
                                أضف المتغيرات بالنقر على &quot;إضافة متغير&quot; أو اكتبها يدوياً بصيغة {'{{name}}'}
                            </p>
                        </div>

                        {/* Live preview with highlighting */}
                        {templateForm.body.trim() && getBodyVars(templateForm.body).length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-white text-xs">معاينة المتغيرات</Label>
                                <HighlightedBody body={templateForm.body} />
                                <div className="flex flex-wrap gap-1">
                                    {getBodyVars(templateForm.body).map(v => (
                                        <Badge key={v} variant="secondary" className="text-[10px] font-mono bg-violet-500/15 text-violet-300 border-violet-500/20">
                                            {v}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            onClick={saveTemplate}
                            disabled={savingTemplate || !templateForm.name.trim() || !templateForm.body.trim()}
                            className="bg-white text-gray-900 hover:bg-gray-100"
                        >
                            {savingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingTemplate ? 'حفظ التعديلات' : 'إنشاء القالب'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Variable Insertion Mini-Dialog ═══ */}
            <Dialog open={varDialogOpen} onOpenChange={setVarDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-sm" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Variable className="w-4 h-4 text-violet-400" />
                            إضافة متغير
                        </DialogTitle>
                        <DialogDescription>
                            اختر اسم المتغير — سيتم ربطه بعمود من ملف الإكسل عند إنشاء الحملة
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-2">
                            <Label className="text-white">اسم المتغير (بالإنجليزية)</Label>
                            <Input
                                value={varName}
                                onChange={e => setVarName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                placeholder="name"
                                className="bg-secondary border-border font-mono"
                                dir="ltr"
                                onKeyDown={e => { if (e.key === 'Enter') insertVariable(); }}
                            />
                        </div>
                        {varName.trim() && (
                            <div className="p-3 rounded-lg bg-secondary/40 border border-border">
                                <p className="text-xs text-muted-foreground mb-1">سيتم إضافة:</p>
                                <Badge variant="secondary" className="font-mono bg-violet-500/15 text-violet-300 border-violet-500/20">
                                    {`{{${varName.trim()}}}`}
                                </Badge>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setVarDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            onClick={insertVariable}
                            disabled={!varName.trim()}
                            className="bg-violet-600 text-white hover:bg-violet-700 gap-1"
                        >
                            إدراج المتغير
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Group Dialog ═══ */}
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingGroup ? 'تعديل المجموعة' : 'مجموعة جديدة'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingGroup ? 'عدّل بيانات المجموعة والقوالب' : 'أنشئ مجموعة قوالب جديدة'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="grp-name" className="text-white">اسم المجموعة</Label>
                            <Input
                                id="grp-name"
                                value={groupForm.name}
                                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                placeholder="مثال: رسائل العملاء"
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grp-desc" className="text-white">الوصف</Label>
                            <Input
                                id="grp-desc"
                                value={groupForm.description}
                                onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                placeholder="وصف اختياري للمجموعة"
                                className="bg-secondary border-border"
                            />
                        </div>
                        {templates.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-white">القوالب</Label>
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 space-y-1">
                                    {templates.map(t => (
                                        <label
                                            key={t.id}
                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={groupForm.template_ids.includes(t.id)}
                                                onCheckedChange={() => toggleTemplateInGroup(t.id)}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-white truncate">{t.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{t.body}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {groupForm.template_ids.length} قالب محدد
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setGroupDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            onClick={saveGroup}
                            disabled={savingGroup || !groupForm.name.trim()}
                            className="bg-white text-gray-900 hover:bg-gray-100"
                        >
                            {savingGroup && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingGroup ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Delete Confirmation ═══ */}
            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="bg-card border-border sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">تأكيد الحذف</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف {deleteDialog?.type === 'template' ? 'القالب' : 'المجموعة'}{' '}
                            <span className="text-white font-medium">&quot;{deleteDialog?.name}&quot;</span>؟
                            {deleteDialog?.type === 'group' && (
                                <span className="block mt-1 text-xs">سيتم حذف المجموعة فقط وليس القوالب</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteDialog(null)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteDialog?.type === 'template'
                                ? deleteTemplate(deleteDialog.id)
                                : deleteGroup(deleteDialog!.id)
                            }
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
