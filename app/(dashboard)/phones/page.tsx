'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Phone,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    FolderOpen,
    ChevronDown,
    ChevronUp,
    Smartphone,
    Layers,
    Wifi,
    WifiOff,
    Clock,
    RefreshCw,
    QrCode,
    AlertCircle,
    Loader2 as Loader2Icon,
    RotateCw,
} from 'lucide-react';

// ── Types ────────────────────────────────────────
interface PhoneInfo {
    id: number;
    name: string;
    description: string | null;
    status: string | null;

    number: string | null;
}

interface PhoneGroup {
    id: number;
    name: string;
    description: string | null;
    phones: PhoneInfo[];
}

// ── Status Helpers ───────────────────────────────
function getStatusConfig(status: string | null) {
    switch (status) {
        case 'WORKING':
            return { label: 'متصل', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Wifi };
        case 'STOPPED':
            return { label: 'غير متصل (معلّق)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock };
        case 'SCAN_QR_CODE':
            return { label: 'مسح QR', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: QrCode };
        case 'STARTING':
            return { label: 'يبدأ...', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock };
        case 'FAILED':
            return { label: 'فشل', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle };
        default:
            return { label: status || 'غير معروف', color: 'bg-secondary text-muted-foreground border-border', icon: Clock };
    }
}

// ── Main Page ────────────────────────────────────
export default function PhonesPage() {
    const [phones, setPhones] = useState<PhoneInfo[]>([]);
    const [groups, setGroups] = useState<PhoneGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Phone dialog state
    const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
    const [editingPhone, setEditingPhone] = useState<PhoneInfo | null>(null);
    const [phoneForm, setPhoneForm] = useState({ name: '', description: '' });
    const [savingPhone, setSavingPhone] = useState(false);

    // Group dialog state
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<PhoneGroup | null>(null);
    const [groupForm, setGroupForm] = useState({ name: '', description: '', phone_ids: [] as number[] });
    const [savingGroup, setSavingGroup] = useState(false);

    // Expanded groups
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

    // Delete confirmation
    const [deleteDialog, setDeleteDialog] = useState<{ type: 'phone' | 'group'; id: number; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Status check
    const [checkingStatus, setCheckingStatus] = useState<number | null>(null);
    const [checkingAll, setCheckingAll] = useState(false);

    // Auth dialog (QR + Code)
    const [authDialog, setAuthDialog] = useState<{ phoneId: number; phoneName: string } | null>(null);
    const [authTab, setAuthTab] = useState<'qr' | 'code'>('qr');
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [codePhoneNumber, setCodePhoneNumber] = useState('');
    const [codeResult, setCodeResult] = useState<string | null>(null);
    const [requestingCode, setRequestingCode] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch Data ───────────────────────────────
    const fetchPhones = useCallback(async () => {
        try {
            const { data } = await api.get('/api/phone/');
            setPhones(data);
        } catch (err) { console.error('Failed to fetch phones:', err); }
    }, []);

    const fetchGroups = useCallback(async () => {
        try {
            const { data } = await api.get('/api/phone/groups/');
            setGroups(data);
        } catch (err) { console.error('Failed to fetch groups:', err); }
    }, []);

    useEffect(() => {
        Promise.all([fetchPhones(), fetchGroups()]).finally(() => setLoading(false));
    }, [fetchPhones, fetchGroups]);

    // ── Status Check ─────────────────────────────
    const checkStatus = async (phone: PhoneInfo, autoOpenQr = true) => {
        setCheckingStatus(phone.id);
        try {
            const { data } = await api.get(`/api/phone/${phone.id}/status`);
            setPhones(prev => prev.map(p =>
                p.id === phone.id ? { ...p, status: data.status, number: data.number } : p
            ));
            if (data.status === 'SCAN_QR_CODE' && autoOpenQr) {
                openAuthDialog(phone.id, phone.name);
            }
        } catch (err) {
            console.error('Failed to check status:', err);
        } finally {
            setCheckingStatus(null);
        }
    };

    const checkAllPhones = async () => {
        setCheckingAll(true);
        for (const phone of phones) {
            await checkStatus(phone, false);
        }
        setCheckingAll(false);
        await fetchPhones();
    };

    const restartPhone = async (phone: PhoneInfo) => {
        setCheckingStatus(phone.id);
        try {
            const { data } = await api.post(`/api/phone/${phone.id}/restart`);
            setPhones(prev => prev.map(p =>
                p.id === phone.id ? { ...p, status: data.status, number: data.number } : p
            ));
            if (data.status === 'SCAN_QR_CODE') {
                openAuthDialog(phone.id, phone.name);
            }
        } catch (err) {
            console.error('Failed to restart session:', err);
        } finally {
            setCheckingStatus(null);
        }
    };

    // ── Auth Dialog ──────────────────────────────
    const openAuthDialog = async (phoneId: number, phoneName: string) => {
        setAuthDialog({ phoneId, phoneName });
        setAuthTab('qr');
        setCodePhoneNumber('');
        setCodeResult(null);
        setLoadingQr(true);
        setQrUrl(null);
        try {
            const response = await api.get(`/api/phone/${phoneId}/qr`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            setQrUrl(url);
        } catch (err) {
            console.error('Failed to get QR code:', err);
        } finally {
            setLoadingQr(false);
        }
        startPolling(phoneId);
    };

    const refreshQr = () => {
        if (authDialog) {
            setLoadingQr(true);
            setQrUrl(null);
            api.get(`/api/phone/${authDialog.phoneId}/qr`, { responseType: 'blob' })
                .then(response => setQrUrl(URL.createObjectURL(response.data)))
                .catch(() => { })
                .finally(() => setLoadingQr(false));
        }
    };

    const requestCode = async () => {
        if (!authDialog || !codePhoneNumber.trim()) return;
        setRequestingCode(true);
        setCodeResult(null);
        try {
            const { data } = await api.post(`/api/phone/${authDialog.phoneId}/request-code`, {
                phone_number: codePhoneNumber.trim(),
            });
            setCodeResult(data?.code || 'تم إرسال الكود إلى واتساب');
        } catch (err: any) {
            setCodeResult(err?.response?.data?.detail || 'فشل إرسال الكود');
        } finally {
            setRequestingCode(false);
        }
    };

    const startPolling = (phoneId: number) => {
        stopPolling();
        pollingRef.current = setInterval(async () => {
            try {
                const { data } = await api.get(`/api/phone/${phoneId}/status`);
                setPhones(prev => prev.map(p =>
                    p.id === phoneId ? { ...p, status: data.status, number: data.number } : p
                ));
                if (data.status === 'WORKING') {
                    stopPolling();
                    setAuthDialog(null);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const closeAuthDialog = () => {
        stopPolling();
        setAuthDialog(null);
    };

    // ── Phone CRUD ───────────────────────────────
    const openNewPhone = () => {
        setEditingPhone(null);
        setPhoneForm({ name: '', description: '' });
        setPhoneDialogOpen(true);
    };

    const openEditPhone = (p: PhoneInfo) => {
        setEditingPhone(p);
        setPhoneForm({ name: p.name, description: p.description || '' });
        setPhoneDialogOpen(true);
    };

    const savePhone = async () => {
        setSavingPhone(true);
        try {
            if (editingPhone) {
                await api.put(`/api/phone/${editingPhone.id}`, phoneForm);
            } else {
                await api.post('/api/phone/', phoneForm);
            }
            await fetchPhones();
            await fetchGroups();
            setPhoneDialogOpen(false);
        } catch (err) { console.error('Failed to save phone:', err); }
        finally { setSavingPhone(false); }
    };

    const deletePhone = async (id: number) => {
        setDeleting(true);
        try {
            await api.delete(`/api/phone/${id}`);
            await fetchPhones();
            await fetchGroups();
            setDeleteDialog(null);
        } catch (err) { console.error('Failed to delete phone:', err); }
        finally { setDeleting(false); }
    };

    // ── Group CRUD ───────────────────────────────
    const openNewGroup = () => {
        setEditingGroup(null);
        setGroupForm({ name: '', description: '', phone_ids: [] });
        setGroupDialogOpen(true);
    };

    const openEditGroup = (g: PhoneGroup) => {
        setEditingGroup(g);
        setGroupForm({
            name: g.name,
            description: g.description || '',
            phone_ids: g.phones.map(p => p.id),
        });
        setGroupDialogOpen(true);
    };

    const saveGroup = async () => {
        setSavingGroup(true);
        try {
            if (editingGroup) {
                await api.put(`/api/phone/groups/${editingGroup.id}`, groupForm);
            } else {
                await api.post('/api/phone/groups/', groupForm);
            }
            await fetchGroups();
            setGroupDialogOpen(false);
        } catch (err) { console.error('Failed to save group:', err); }
        finally { setSavingGroup(false); }
    };

    const deleteGroup = async (id: number) => {
        setDeleting(true);
        try {
            await api.delete(`/api/phone/groups/${id}`);
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

    const togglePhoneInGroup = (pid: number) => {
        setGroupForm(prev => ({
            ...prev,
            phone_ids: prev.phone_ids.includes(pid)
                ? prev.phone_ids.filter(id => id !== pid)
                : [...prev.phone_ids, pid],
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
                    <Phone className="w-6 h-6" />
                    الأرقام
                </h1>
                <p className="mt-1 text-muted-foreground">
                    إدارة أرقام الهواتف ومجموعات الأرقام
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="phones" dir="rtl">
                <TabsList className="bg-secondary/60 border border-border mb-6">
                    <TabsTrigger value="phones" className="data-[state=active]:bg-card data-[state=active]:text-white gap-2">
                        <Smartphone className="w-4 h-4" />
                        الأرقام
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="data-[state=active]:bg-card data-[state=active]:text-white gap-2">
                        <Layers className="w-4 h-4" />
                        مجموعات الأرقام
                    </TabsTrigger>
                </TabsList>

                {/* ═══ Phones Tab ═══ */}
                <TabsContent value="phones" className="space-y-4 animate-in fade-in-50 duration-300">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {phones.length} رقم
                        </p>
                        <div className="flex gap-2">
                            {phones.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={checkAllPhones}
                                    disabled={checkingAll || checkingStatus !== null}
                                    className="gap-2 border-border"
                                >
                                    {checkingAll ? (
                                        <Loader2Icon className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    فحص الكل
                                </Button>
                            )}
                            <Button onClick={openNewPhone} className="bg-white text-gray-900 hover:bg-gray-100 gap-2">
                                <Plus className="w-4 h-4" />
                                رقم جديد
                            </Button>
                        </div>
                    </div>

                    {phones.length === 0 ? (
                        <Card className="bg-card border-border border-dashed">
                            <CardContent className="py-12 text-center">
                                <Smartphone className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                                <p className="text-muted-foreground mb-2">لا توجد أرقام بعد</p>
                                <p className="text-sm text-muted-foreground/70">أضف رقم هاتف لربطه بواتساب</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {phones.map(p => {
                                const statusCfg = getStatusConfig(p.status);
                                const StatusIcon = statusCfg.icon;
                                return (
                                    <Card key={p.id} className="bg-card border-border group hover:border-white/20 transition-all duration-200 flex flex-col">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-secondary border border-border">
                                                        <Smartphone className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <CardTitle className="text-base text-white truncate">{p.name}</CardTitle>
                                                        {p.number && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 font-mono" dir="ltr">
                                                                {p.number}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEditPhone(p)}>
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteDialog({ type: 'phone', id: p.id, name: p.name })}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex flex-col flex-1">
                                            <p className="text-sm text-muted-foreground truncate mb-3 min-h-[20px]">
                                                {p.description || '\u00A0'}
                                            </p>
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className={`text-xs gap-1.5 ${statusCfg.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusCfg.label}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-auto">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-xs gap-1.5 border-border"
                                                    onClick={() => checkStatus(p)}
                                                    disabled={checkingStatus === p.id}
                                                >
                                                    {checkingStatus === p.id ? (
                                                        <Loader2Icon className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-3 h-3" />
                                                    )}
                                                    فحص الحالة
                                                </Button>
                                                {p.status === 'SCAN_QR_CODE' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                                        onClick={() => openAuthDialog(p.id, p.name)}
                                                    >
                                                        <QrCode className="w-3 h-3" />
                                                        مسح QR
                                                    </Button>
                                                )}
                                                {p.status === 'FAILED' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                                        onClick={() => restartPhone(p)}
                                                        disabled={checkingStatus === p.id}
                                                    >
                                                        {checkingStatus === p.id ? (
                                                            <Loader2Icon className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <RotateCw className="w-3 h-3" />
                                                        )}
                                                        إعادة تشغيل
                                                    </Button>
                                                )}
                                            </div>
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
                                <p className="text-sm text-muted-foreground/70">أنشئ مجموعة لتنظيم أرقامك</p>
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
                                                {g.phones.length} رقم
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

                                    {/* Expanded Phones */}
                                    {expandedGroups.has(g.id) && (
                                        <div className="border-t border-border bg-secondary/10 p-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            {g.phones.length === 0 ? (
                                                <p className="text-sm text-muted-foreground/60 text-center py-4">
                                                    لا توجد أرقام في هذه المجموعة
                                                </p>
                                            ) : (
                                                g.phones.map(p => {
                                                    const statusCfg = getStatusConfig(p.status);
                                                    const StatusIcon = statusCfg.icon;
                                                    return (
                                                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/60">
                                                            <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm text-white font-medium truncate">{p.name}</p>
                                                                {p.number && <p className="text-xs text-muted-foreground font-mono" dir="ltr">{p.number}</p>}
                                                            </div>
                                                            <Badge variant="outline" className={`text-xs gap-1 shrink-0 ${statusCfg.color}`}>
                                                                <StatusIcon className="w-3 h-3" />
                                                                {statusCfg.label}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* ═══ Phone Dialog ═══ */}
            <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
                <DialogContent className="bg-card border-border sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingPhone ? 'تعديل الرقم' : 'رقم جديد'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPhone ? 'عدّل بيانات الرقم' : 'أضف رقم هاتف جديد'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="ph-name" className="text-white">اسم الرقم</Label>
                            <Input
                                id="ph-name"
                                value={phoneForm.name}
                                onChange={e => setPhoneForm({ ...phoneForm, name: e.target.value })}
                                placeholder="مثال: رقم المبيعات"
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ph-desc" className="text-white">الوصف</Label>
                            <Input
                                id="ph-desc"
                                value={phoneForm.description}
                                onChange={e => setPhoneForm({ ...phoneForm, description: e.target.value })}
                                placeholder="وصف اختياري للرقم"
                                className="bg-secondary border-border"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setPhoneDialogOpen(false)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            onClick={savePhone}
                            disabled={savingPhone || !phoneForm.name.trim()}
                            className="bg-white text-gray-900 hover:bg-gray-100"
                        >
                            {savingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingPhone ? 'حفظ التعديلات' : 'إضافة الرقم'}
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
                            {editingGroup ? 'عدّل بيانات المجموعة والأرقام' : 'أنشئ مجموعة أرقام جديدة'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="grp-name" className="text-white">اسم المجموعة</Label>
                            <Input
                                id="grp-name"
                                value={groupForm.name}
                                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                placeholder="مثال: أرقام فريق الدعم"
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
                        {phones.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-white">الأرقام</Label>
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 space-y-1">
                                    {phones.map(p => {
                                        const statusCfg = getStatusConfig(p.status);
                                        return (
                                            <label
                                                key={p.id}
                                                className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={groupForm.phone_ids.includes(p.id)}
                                                    onCheckedChange={() => togglePhoneInGroup(p.id)}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-white truncate">{p.name}</p>
                                                    {p.number && <p className="text-xs text-muted-foreground font-mono" dir="ltr">{p.number}</p>}
                                                </div>
                                                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusCfg.color}`}>
                                                    {statusCfg.label}
                                                </Badge>
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {groupForm.phone_ids.length} رقم محدد
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
                            هل أنت متأكد من حذف {deleteDialog?.type === 'phone' ? 'الرقم' : 'المجموعة'}{' '}
                            <span className="text-white font-medium">&quot;{deleteDialog?.name}&quot;</span>؟
                            {deleteDialog?.type === 'group' && (
                                <span className="block mt-1 text-xs">سيتم حذف المجموعة فقط وليس الأرقام</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteDialog(null)} className="border-border">
                            إلغاء
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteDialog?.type === 'phone'
                                ? deletePhone(deleteDialog.id)
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

            {/* Auth Dialog (QR + Code) */}
            <Dialog open={!!authDialog} onOpenChange={(open) => !open && closeAuthDialog()}>
                <DialogContent className="sm:max-w-md bg-card border-border" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white text-center">
                            ربط الرقم - {authDialog?.phoneName}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            اختر طريقة الربط
                        </DialogDescription>
                    </DialogHeader>

                    {/* Tab Switcher */}
                    <div className="flex gap-2 bg-secondary/50 rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setAuthTab('qr')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${authTab === 'qr'
                                ? 'bg-card text-white shadow-sm'
                                : 'text-muted-foreground hover:text-white'
                                }`}
                        >
                            <QrCode className="w-4 h-4" />
                            مسح QR
                        </button>
                        <button
                            onClick={() => setAuthTab('code')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${authTab === 'code'
                                ? 'bg-card text-white shadow-sm'
                                : 'text-muted-foreground hover:text-white'
                                }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            كود برقم الهاتف
                        </button>
                    </div>

                    {/* QR Tab */}
                    {authTab === 'qr' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            {loadingQr ? (
                                <div className="w-64 h-64 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : qrUrl ? (
                                <img
                                    src={qrUrl}
                                    alt="QR Code"
                                    className="w-64 h-64 rounded-lg border border-border bg-white p-2"
                                />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
                                    فشل تحميل رمز QR
                                </div>
                            )}
                            <Button
                                variant="outline"
                                onClick={refreshQr}
                                disabled={loadingQr}
                                className="gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingQr ? 'animate-spin' : ''}`} />
                                تحديث الرمز
                            </Button>
                        </div>
                    )}

                    {/* Code Tab */}
                    {authTab === 'code' && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-white">رقم الهاتف</Label>
                                <Input
                                    value={codePhoneNumber}
                                    onChange={(e) => setCodePhoneNumber(e.target.value)}
                                    placeholder="مثال: 966501234567"
                                    dir="ltr"
                                    className="bg-secondary border-border text-white font-mono text-center text-lg"
                                />
                                <p className="text-xs text-muted-foreground text-center">أدخل الرقم بالكامل مع رمز الدولة بدون +</p>
                            </div>
                            <Button
                                onClick={requestCode}
                                disabled={requestingCode || !codePhoneNumber.trim()}
                                className="w-full bg-white text-gray-900 hover:bg-gray-100 gap-2"
                            >
                                {requestingCode && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                طلب الكود
                            </Button>
                            {codeResult && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                                    <p className="text-lg font-mono font-bold text-emerald-400 tracking-[0.3em]">{codeResult}</p>
                                    <p className="text-xs text-muted-foreground mt-2">أدخل هذا الكود في واتساب على هاتفك</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Polling indicator */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                        <Loader2Icon className="w-3 h-3 animate-spin" />
                        بانتظار الربط...
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
