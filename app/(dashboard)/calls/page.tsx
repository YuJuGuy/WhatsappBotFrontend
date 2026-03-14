'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    PhoneOff, Loader2, Plus, Pencil, Trash2, Smartphone,
    ToggleLeft, ToggleRight, Users, MessageSquare, AlertCircle
} from 'lucide-react';

interface PhoneInfo {
    id: number;
    name: string;
    number: string | null;
    session_id: string;
}

interface Template {
    id: number;
    name: string;
    body: string;
}

interface CallConfig {
    id: number;
    enabled: boolean;
    process_groups: boolean;
    default_template_id: number;
    priority: number;
    phone_ids: number[];
}

interface FormState {
    enabled: boolean;
    process_groups: boolean;
    default_template_id: number | null;
    priority: number;
    phone_ids: number[];
}

const defaultForm: FormState = {
    enabled: true,
    process_groups: false,
    default_template_id: null,
    priority: 50,
    phone_ids: [],
};

export default function CallsPage() {
    const [configs, setConfigs] = useState<CallConfig[]>([]);
    const [phones, setPhones] = useState<PhoneInfo[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<CallConfig | null>(null);
    const [form, setForm] = useState<FormState>(defaultForm);
    const [formError, setFormError] = useState('');

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingConfig, setDeletingConfig] = useState<CallConfig | null>(null);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        Promise.all([fetchConfigs(), fetchPhones(), fetchTemplates()]).finally(() => setLoading(false));
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await api.get('/api/calls-config/');
            setConfigs(Array.isArray(data) ? data : data ? [data] : []);
        } catch (error) {
            console.error('Failed to fetch configs:', error);
        }
    };

    const fetchPhones = async () => {
        try {
            const { data } = await api.get('/api/phone/');
            setPhones(data);
        } catch (error) {
            console.error('Failed to fetch phones:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const { data } = await api.get('/api/templates/');
            setTemplates(data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    };

    const getPhoneName = (id: number) => phones.find(p => p.id === id)?.name || `#${id}`;
    const getTemplateName = (id: number) => templates.find(t => t.id === id)?.name || `#${id}`;

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const togglePhone = (phoneId: number) => {
        setForm(prev => ({
            ...prev,
            phone_ids: prev.phone_ids.includes(phoneId)
                ? prev.phone_ids.filter(id => id !== phoneId)
                : [...prev.phone_ids, phoneId],
        }));
    };

    const openCreate = () => {
        setEditingConfig(null);
        setForm(defaultForm);
        setFormError('');
        setDialogOpen(true);
    };

    const openEdit = (config: CallConfig) => {
        setEditingConfig(config);
        setForm({
            enabled: config.enabled,
            process_groups: config.process_groups,
            default_template_id: config.default_template_id,
            priority: config.priority,
            phone_ids: config.phone_ids || [],
        });
        setFormError('');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.default_template_id) {
            setFormError('يجب اختيار قالب');
            return;
        }
        if (form.phone_ids.length === 0) {
            setFormError('يجب اختيار رقم واحد على الأقل');
            return;
        }

        setSaving(true);
        setFormError('');
        try {
            if (editingConfig) {
                await api.put(`/api/calls-config/${editingConfig.id}`, form);
            } else {
                await api.post('/api/calls-config/', form);
            }
            await fetchConfigs();
            showMessage('success', editingConfig ? 'تم تحديث القاعدة بنجاح' : 'تم إنشاء القاعدة بنجاح');
            setDialogOpen(false);
        } catch (error) {
            setFormError('فشل حفظ القاعدة');
            console.error('Failed to save config:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleEnabled = async (config: CallConfig) => {
        try {
            await api.put(`/api/calls-config/${config.id}`, { enabled: !config.enabled });
            await fetchConfigs();
        } catch (error) {
            showMessage('error', 'فشل تغيير الحالة');
            console.error('Failed to toggle config:', error);
        }
    };

    const handleDelete = async () => {
        if (!deletingConfig) return;
        try {
            await api.delete(`/api/calls-config/${deletingConfig.id}`);
            setConfigs(prev => prev.filter(c => c.id !== deletingConfig.id));
            showMessage('success', 'تم حذف القاعدة بنجاح');
        } catch (error) {
            showMessage('error', 'فشل حذف القاعدة');
            console.error('Failed to delete config:', error);
        } finally {
            setDeleteDialogOpen(false);
            setDeletingConfig(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                        <PhoneOff className="w-6 h-6" />
                        الرد التلقائي على المكالمات
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        رفض المكالمات الواردة تلقائياً وإرسال رد فوري لكل رقم
                    </p>
                </div>
                <Button onClick={openCreate} className="bg-white text-gray-900 hover:bg-gray-100 gap-1">
                    <Plus className="w-4 h-4" />
                    قاعدة جديدة
                </Button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                    {message.text}
                </div>
            )}

            {configs.length === 0 ? (
                <Card className="bg-card border-border">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <PhoneOff className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground text-lg mb-1">لا توجد قواعد بعد</p>
                        <p className="text-muted-foreground/70 text-sm">أنشئ قاعدة جديدة لرفض المكالمات والرد عليها تلقائياً</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {configs.map(config => (
                        <Card key={config.id} className={`bg-card border-border transition-all ${!config.enabled ? 'opacity-60' : ''}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => handleToggleEnabled(config)}
                                        className="mt-1 shrink-0"
                                        title={config.enabled ? 'تعطيل' : 'تفعيل'}
                                    >
                                        {config.enabled ? (
                                            <ToggleRight className="w-6 h-6 text-green-400" />
                                        ) : (
                                            <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" />
                                                {getTemplateName(config.default_template_id)}
                                            </Badge>
                                            {config.process_groups && (
                                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    المجموعات
                                                </Badge>
                                            )}
                                        </div>
                                        {config.phone_ids && config.phone_ids.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Smartphone className="w-3 h-3 text-zinc-500" />
                                                {config.phone_ids.map(pid => (
                                                    <Badge key={pid} variant="outline" className="text-[10px] bg-zinc-800/50 border-zinc-700 text-zinc-300">
                                                        {getPhoneName(pid)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-white"
                                            onClick={() => openEdit(config)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                            onClick={() => { setDeletingConfig(config); setDeleteDialogOpen(true); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-card border-border max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingConfig ? 'تعديل القاعدة' : 'قاعدة جديدة'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingConfig ? 'عدّل إعدادات رفض المكالمات' : 'أنشئ قاعدة جديدة لرفض المكالمات والرد تلقائياً'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Phone Selection */}
                        <div className="space-y-2">
                            <Label className="text-white flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                الأرقام
                            </Label>
                            <div className="flex flex-wrap gap-2 items-center">
                                {(() => {
                                    const takenByOthers = new Set(
                                        configs
                                            .filter(c => c.id !== editingConfig?.id)
                                            .flatMap(c => c.phone_ids)
                                    );
                                    const available = phones.filter(p => !takenByOthers.has(p.id));
                                    if (available.length <= 1) return null;
                                    const allSelected = available.every(p => form.phone_ids.includes(p.id));
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                phone_ids: allSelected
                                                    ? []
                                                    : available.map(p => p.id),
                                            }))}
                                            className="px-3 py-1.5 rounded-lg border border-dashed border-zinc-600 text-xs text-primary hover:border-primary transition-colors"
                                        >
                                            {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
                                        </button>
                                    );
                                })()}
                                {phones.map(phone => {
                                    const selected = form.phone_ids.includes(phone.id);
                                    const takenByOther = configs.some(
                                        c => c.id !== editingConfig?.id && c.phone_ids.includes(phone.id)
                                    );
                                    return (
                                        <button
                                            key={phone.id}
                                            type="button"
                                            disabled={takenByOther}
                                            onClick={() => togglePhone(phone.id)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                                                takenByOther
                                                    ? 'bg-secondary/50 border-border text-muted-foreground/40 cursor-not-allowed line-through'
                                                    : selected
                                                        ? 'bg-primary/20 border-primary text-primary'
                                                        : 'bg-secondary border-border text-muted-foreground hover:border-zinc-500'
                                            }`}
                                            title={takenByOther ? 'مرتبط بقاعدة أخرى' : phone.name}
                                        >
                                            {phone.name}
                                        </button>
                                    );
                                })}
                            </div>
                            {phones.length === 0 && (
                                <p className="text-xs text-muted-foreground">لا توجد أرقام مسجلة</p>
                            )}
                        </div>

                        {/* Template Selection */}
                        <div className="space-y-2">
                            <Label className="text-white flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                قالب الرسالة
                            </Label>
                            <select
                                value={form.default_template_id || ''}
                                onChange={(e) => setForm({ ...form, default_template_id: parseInt(e.target.value) || null })}
                                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">اختر قالب...</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {form.default_template_id && (() => {
                                const tpl = templates.find(t => t.id === form.default_template_id);
                                return tpl ? (
                                    <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                                        <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                            {tpl.body}
                                        </p>
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        {/* Toggles Row */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-white">تفعيل القاعدة</Label>
                                <button
                                    onClick={() => setForm({ ...form, enabled: !form.enabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? 'bg-primary' : 'bg-secondary'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <Label className="text-white">معالجة المجموعات</Label>
                                </div>
                                <button
                                    onClick={() => setForm({ ...form, process_groups: !form.process_groups })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.process_groups ? 'bg-primary' : 'bg-secondary'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.process_groups ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">الأولوية (رقم أقل = أولوية أعلى)</Label>
                            <Input
                                type="number"
                                min={1}
                                max={1000}
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
                                className="bg-secondary border-border"
                            />
                        </div>

                        {formError && (
                            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {formError}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-white text-gray-900 hover:bg-gray-100 gap-1">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingConfig ? 'حفظ التعديلات' : 'إنشاء القاعدة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-card border-border max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">حذف القاعدة</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف هذه القاعدة؟ لا يمكن التراجع عن هذا الإجراء.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} className="gap-1">
                            <Trash2 className="w-4 h-4" />
                            حذف
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
