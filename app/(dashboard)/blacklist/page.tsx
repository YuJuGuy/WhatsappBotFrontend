'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Ban, Plus, Loader2, Trash2, Search, Calendar, X, CheckSquare } from 'lucide-react';

type BlacklistEntry = {
    id: number;
    phone_number: string;
    created_at: string;
};

export default function BlacklistPage() {
    const [entries, setEntries] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialog, setDeleteDialog] = useState<BlacklistEntry | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const { data } = await api.get('/api/blacklist/');
            setEntries(data);
        } catch (error) {
            console.error('Failed to fetch blacklist entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const normalizeDate = (value: string) => {
        if (!value) return '';
        const iso = value.endsWith('Z') ? value : `${value}Z`;
        return format(new Date(iso), 'dd MMM yyyy HH:mm', { locale: ar });
    };

    const openCreate = () => {
        setPhoneNumber('');
        setDialogOpen(true);
    };

    const handleCreate = async () => {
        if (!phoneNumber.trim()) {
            return;
        }

        setSaving(true);
        try {
            await api.post('/api/blacklist/', {
                phone_number: phoneNumber.trim(),
            });
            await fetchEntries();
            setDialogOpen(false);
        } catch (error: any) {
            console.error('Failed to create blacklist entry:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog) return;
        setDeleting(true);
        try {
            await api.delete(`/api/blacklist/${deleteDialog.id}`);
            setEntries(prev => prev.filter(e => e.id !== deleteDialog.id));
            setDeleteDialog(null);
        } catch (error) {
            console.error('Failed to delete blacklist entry:', error);
        } finally {
            setDeleting(false);
        }
    };

    const filteredEntries = entries.filter(e =>
        e.phone_number.includes(searchQuery.trim())
    );

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredEntries.length && filteredEntries.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredEntries.map(e => e.id)));
        }
    };

    const toggleSelect = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkDelete = async () => {
        setBulkDeleting(true);
        try {
            await api.delete('/api/blacklist/bulk', {
                data: { blacklist_ids: Array.from(selectedIds) }
            });
            setEntries(prev => prev.filter(e => !selectedIds.has(e.id)));
            setSelectedIds(new Set());
            setBulkDeleteDialogOpen(false);
        } catch (error) {
            console.error('Failed to bulk delete:', error);
        } finally {
            setBulkDeleting(false);
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
        <div dir="rtl">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <Ban className="w-6 h-6" />
                    القائمة السوداء
                </h1>
                <p className="mt-1 text-muted-foreground">
                    حظر الأرقام غير المرغوبة ومنع استقبال الرسائل منها
                </p>
            </div>

            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="ابحث برقم الهاتف..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-secondary border-border pr-10"
                        dir="ltr"
                    />
                </div>
                {filteredEntries.length > 0 && (
                    <Button variant="outline" onClick={toggleSelectAll} className="border-border gap-2 whitespace-nowrap">
                        <CheckSquare className="w-4 h-4" />
                        {selectedIds.size === filteredEntries.length && filteredEntries.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </Button>
                )}
                <Button onClick={openCreate} className="bg-white text-gray-900 hover:bg-gray-100 gap-2 whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                    رقم جديد
                </Button>
            </div>

            {/* Action Bar */}
            {selectedIds.size > 0 && (
                <div className="flex flex-col gap-3 mb-6 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-700 rounded-xl p-3">
                        <span className="text-sm text-white font-medium whitespace-nowrap">{selectedIds.size} محدد</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-zinc-400 h-8 hover:text-white"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            <X className="w-3.5 h-3.5 ml-2" />
                            إلغاء التحديد
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-zinc-900/80 border border-zinc-700 rounded-xl p-3">
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                            onClick={() => setBulkDeleteDialogOpen(true)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف المحدد
                        </Button>
                    </div>
                </div>
            )}

            {filteredEntries.length === 0 ? (
                <Card className="bg-card border-border border-dashed">
                    <CardContent className="py-12 text-center">
                        <Ban className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground mb-2">
                            {searchQuery ? 'لا توجد نتائج مطابقة' : 'القائمة السوداء فارغة'}
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                            {searchQuery ? 'جرّب البحث برقم مختلف' : 'أضف رقمًا لمنع الرسائل الواردة منه'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredEntries.map(entry => (
                        <Card 
                            key={entry.id} 
                            className={`bg-card border-border group hover:border-white/20 transition-all duration-200 cursor-pointer ${selectedIds.has(entry.id) ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
                            onClick={(e) => toggleSelect(entry.id, e)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base text-white flex items-center gap-2">
                                        <Checkbox 
                                            checked={selectedIds.has(entry.id)} 
                                            className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 pointer-events-none"
                                        />
                                        <Ban className="w-4 h-4 text-red-400" />
                                        <span className="font-mono" dir="ltr">
                                            {entry.phone_number}
                                        </span>
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-400 z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteDialog(entry);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Badge variant="outline" className="text-xs gap-1 border-border">
                                    <Calendar className="w-3 h-3" />
                                    {normalizeDate(entry.created_at)}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                    تم الحظر في هذا التاريخ
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">إضافة رقم</DialogTitle>
                        <DialogDescription>
                            أدخل رقم الهاتف مع رمز الدولة بدون علامة +
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-white">رقم الهاتف</Label>
                            <Input
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="مثال: 966501234567"
                                className="bg-secondary border-border font-mono"
                                dir="ltr"
                            />
                            <p className="text-xs text-muted-foreground">
                                سيتم التحقق من صحة الرقم تلقائيًا قبل الحفظ
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={saving || !phoneNumber.trim()}
                            className="bg-white text-gray-900 hover:bg-gray-100"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            إضافة
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className="bg-card border-border sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">تأكيد الحذف</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف الرقم{' '}
                            <span className="text-white font-medium" dir="ltr">{deleteDialog?.phone_number}</span>؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteDialog(null)} className="border-border">
                            إلغاء
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            حذف
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">تأكيد الحذف الجماعي</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف {selectedIds.size} من الأرقام المحظورة؟
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
                            {bulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            حذف المحدد
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}







