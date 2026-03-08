'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    MessageSquareReply, Plus, Loader2, Pencil, Trash2, Search,
    ToggleLeft, ToggleRight, Zap, AlertCircle
} from 'lucide-react';

interface AutoReplyRule {
    id: number;
    trigger_text: string;
    match_type: string;
    response_text: string;
    is_active: boolean;
    priority: number;
    rule_priority: number;
    created_at: string;
    user_id: number;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
    exact: 'مطابقة تامة',
    contains: 'يحتوي على',
    starts_with: 'يبدأ بـ',
    ends_with: 'ينتهي بـ',
};

const defaultRule: Omit<AutoReplyRule, 'id' | 'created_at' | 'user_id'> = {
    trigger_text: '',
    match_type: 'contains',
    response_text: '',
    is_active: true,
    priority: 50,
    rule_priority: 0,
};

export default function AutoReplyPage() {
    const [rules, setRules] = useState<AutoReplyRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
    const [form, setForm] = useState(defaultRule);
    const [formError, setFormError] = useState('');

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingRule, setDeletingRule] = useState<AutoReplyRule | null>(null);

    // Message
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const { data } = await api.get('/api/autoreply/');
            setRules(data);
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // ── Create / Edit ──
    const openCreate = () => {
        setEditingRule(null);
        setForm(defaultRule);
        setFormError('');
        setDialogOpen(true);
    };

    const openEdit = (rule: AutoReplyRule) => {
        setEditingRule(rule);
        setForm({
            trigger_text: rule.trigger_text,
            match_type: rule.match_type,
            response_text: rule.response_text,
            is_active: rule.is_active,
            priority: rule.priority,
            rule_priority: rule.rule_priority,
        });
        setFormError('');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.trigger_text.trim()) {
            setFormError('يجب إدخال نص المطابقة');
            return;
        }
        if (!form.response_text.trim()) {
            setFormError('يجب إدخال نص الرد');
            return;
        }

        setSaving(true);
        setFormError('');
        try {
            if (editingRule) {
                const { data } = await api.put(`/api/autoreply/${editingRule.id}`, form);
                setRules(prev => prev.map(r => r.id === editingRule.id ? data : r));
                showMessage('success', 'تم تحديث القاعدة بنجاح');
            } else {
                const { data } = await api.post('/api/autoreply/', form);
                setRules(prev => [...prev, data]);
                showMessage('success', 'تم إنشاء القاعدة بنجاح');
            }
            setDialogOpen(false);
        } catch (error) {
            setFormError('فشل حفظ القاعدة');
            console.error('Failed to save rule:', error);
        } finally {
            setSaving(false);
        }
    };

    // ── Toggle Active ──
    const handleToggleActive = async (rule: AutoReplyRule) => {
        try {
            const { data } = await api.put(`/api/autoreply/${rule.id}`, {
                is_active: !rule.is_active,
            });
            setRules(prev => prev.map(r => r.id === rule.id ? data : r));
        } catch (error) {
            showMessage('error', 'فشل تغيير حالة القاعدة');
            console.error('Failed to toggle rule:', error);
        }
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!deletingRule) return;
        try {
            await api.delete(`/api/autoreply/${deletingRule.id}`);
            setRules(prev => prev.filter(r => r.id !== deletingRule.id));
            showMessage('success', 'تم حذف القاعدة بنجاح');
        } catch (error) {
            showMessage('error', 'فشل حذف القاعدة');
            console.error('Failed to delete rule:', error);
        } finally {
            setDeleteDialogOpen(false);
            setDeletingRule(null);
        }
    };

    // ── Filter ──
    const filteredRules = rules.filter(r =>
        r.trigger_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.response_text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <MessageSquareReply className="w-6 h-6" />
                    الرد التلقائي على الرسائل
                </h1>
                <p className="mt-1 text-muted-foreground">
                    إنشاء قواعد للرد التلقائي على الرسائل الواردة بناءً على محتواها
                </p>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في القواعد..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-secondary border-border pr-10"
                    />
                </div>
                <Button onClick={openCreate} className="bg-white text-gray-900 hover:bg-gray-100 gap-1">
                    <Plus className="w-4 h-4" />
                    قاعدة جديدة
                </Button>
            </div>

            {/* Rules List */}
            {filteredRules.length === 0 ? (
                <Card className="bg-card border-border">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <MessageSquareReply className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground text-lg mb-1">
                            {searchQuery ? 'لا توجد نتائج' : 'لا توجد قواعد بعد'}
                        </p>
                        <p className="text-muted-foreground/70 text-sm">
                            {searchQuery ? 'جرّب تغيير كلمات البحث' : 'أنشئ قاعدة جديدة للرد التلقائي على الرسائل'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredRules
                        .sort((a, b) => b.rule_priority - a.rule_priority)
                        .map(rule => (
                            <Card key={rule.id} className={`bg-card border-border transition-all ${!rule.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Toggle */}
                                        <button
                                            onClick={() => handleToggleActive(rule)}
                                            className="mt-1 shrink-0"
                                            title={rule.is_active ? 'تعطيل' : 'تفعيل'}
                                        >
                                            {rule.is_active ? (
                                                <ToggleRight className="w-6 h-6 text-green-400" />
                                            ) : (
                                                <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <Badge variant="secondary" className="text-xs font-mono">
                                                    {MATCH_TYPE_LABELS[rule.match_type] || rule.match_type}
                                                </Badge>
                                                <span className="text-sm text-white font-medium truncate">
                                                    &ldquo;{rule.trigger_text}&rdquo;
                                                </span>
                                                {rule.rule_priority > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        أولوية القاعدة: {rule.rule_priority}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                                                ← {rule.response_text}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-white"
                                                onClick={() => openEdit(rule)}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                                onClick={() => { setDeletingRule(rule); setDeleteDialogOpen(true); }}
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
                            {editingRule ? 'تعديل القاعدة' : 'قاعدة جديدة'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRule ? 'عدّل إعدادات قاعدة الرد التلقائي' : 'أنشئ قاعدة جديدة للرد على الرسائل الواردة تلقائياً'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Match Type */}
                        <div className="space-y-2">
                            <Label className="text-white">نوع المطابقة</Label>
                            <Select value={form.match_type} onValueChange={v => setForm({ ...form, match_type: v })}>
                                <SelectTrigger className="bg-secondary border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="exact">مطابقة تامة</SelectItem>
                                    <SelectItem value="contains">يحتوي على</SelectItem>
                                    <SelectItem value="starts_with">يبدأ بـ</SelectItem>
                                    <SelectItem value="ends_with">ينتهي بـ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Trigger Text */}
                        <div className="space-y-2">
                            <Label className="text-white">نص المطابقة</Label>
                            <Input
                                placeholder={form.match_type === 'regex' ? '.*مرحبا.*' : 'مرحبا'}
                                value={form.trigger_text}
                                onChange={e => setForm({ ...form, trigger_text: e.target.value })}
                                className="bg-secondary border-border"
                            />
                            <p className="text-xs text-muted-foreground">
                                {form.match_type === 'exact' && 'سيتم الرد فقط إذا كانت الرسالة مطابقة تماماً لهذا النص'}
                                {form.match_type === 'contains' && 'سيتم الرد إذا احتوت الرسالة على هذا النص'}
                                {form.match_type === 'starts_with' && 'سيتم الرد إذا بدأت الرسالة بهذا النص'}
                                {form.match_type === 'ends_with' && 'سيتم الرد إذا انتهت الرسالة بهذا النص'}
                            </p>
                        </div>

                        {/* Response Text */}
                        <div className="space-y-2">
                            <Label className="text-white">نص الرد</Label>
                            <Textarea
                                placeholder="اكتب الرد التلقائي هنا..."
                                value={form.response_text}
                                onChange={e => setForm({ ...form, response_text: e.target.value })}
                                className="bg-secondary border-border min-h-[100px] resize-none"
                            />
                        </div>

                        {/* Priority & Rule Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm">أولوية الإرسال</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={1000}
                                    value={form.priority}
                                    onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
                                    className="bg-secondary border-border"
                                />
                                <p className="text-xs text-muted-foreground">رقم أقل = أولوية أعلى في الإرسال</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm">ترتيب القاعدة</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1000}
                                    value={form.rule_priority}
                                    onChange={e => setForm({ ...form, rule_priority: parseInt(e.target.value) || 0 })}
                                    className="bg-secondary border-border"
                                />
                                <p className="text-xs text-muted-foreground">رقم أعلى = يتم فحصها أولاً</p>
                            </div>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between">
                            <Label className="text-white">تفعيل القاعدة</Label>
                            <button
                                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'}`}
                                />
                            </button>
                        </div>

                        {/* Error */}
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
                        <Button onClick={handleSave} disabled={saving} className="bg-white text-gray-900 hover:bg-gray-100 gap-1 w-100">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingRule ? 'حفظ التعديلات' : 'إنشاء القاعدة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-card border-border max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-white">حذف القاعدة</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف قاعدة &ldquo;{deletingRule?.trigger_text}&rdquo;؟ لا يمكن التراجع عن هذا الإجراء.
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
