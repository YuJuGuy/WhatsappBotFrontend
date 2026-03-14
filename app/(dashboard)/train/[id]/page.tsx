'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
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
    ArrowRight,
    Brain,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    Ban,
    Play,
    Smartphone,
    Users,
    SkipForward,
    Calendar,
    BarChart3,
    RefreshCw,
    AlertTriangle,
    Zap,
} from 'lucide-react';

// ── Types ───────────────────────────────────
type TrainMessage = {
    id: number;
    sender_session_id: string;
    receiver_phone_number: string;
    text: string;
    day_number: number;
    position: number;
    scheduled_at_offset: string;
    scheduled_at: string | null;
    status: string;
    error_message: string | null;
    sent_by_session_name: string | null;
    sent_by_number: string | null;
    updated_at: string | null;
};

type Summary = {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    cancelled: number;
    skipped: number;
};

type SessionInfo = {
    id: number;
    name: string | null;
    status: string;
    session_id_1: string;
    session_id_2: string;
    phone_number_1: string;
    phone_number_2: string;
    total_days: number;
    messages_per_day: number;
    scheduled_at: string | null;
    created_at: string;
    error_message: string | null;
    message_count: number;
};

type ProviderType = 'azure' | 'openai' | 'ollama' | 'gemini';

type ReportData = {
    session: SessionInfo;
    summary: Summary;
    messages: TrainMessage[];
};

type PhoneInfo = {
    id: number;
    name: string;
    number: string | null;
    session_id: string;
};

// ── Status Config ───────────────────────────
function getSessionStatusConfig(status: string) {
    switch (status) {
        case 'generating': return { label: 'جاري التوليد', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
        case 'generated': return { label: 'جاهز للبدء', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
        case 'scheduled': return { label: 'مجدول', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
        case 'finished': return { label: 'مكتمل', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
        case 'failed': return { label: 'فشل', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
        case 'cancelled': return { label: 'ملغي', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
        default: return { label: status, color: 'bg-zinc-800/50 text-zinc-300 border-zinc-700' };
    }
}

const msgStatusConfig: Record<string, { label: string; color: string }> = {
    sent: { label: 'تم', color: 'text-emerald-400' },
    failed: { label: 'فشل', color: 'text-red-400' },
    pending: { label: 'معلق', color: 'text-yellow-400' },
    cancelled: { label: 'ملغي', color: 'text-red-500' },
    skipped: { label: 'متخطي', color: 'text-zinc-400' },
};

// ── Main Page ───────────────────────────────
export default function TrainDetailPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id;

    const [report, setReport] = useState<ReportData | null>(null);
    const [phones, setPhones] = useState<PhoneInfo[]>([]);
    const [loading, setLoading] = useState(true);

    // Start dialog
    const [startDialogOpen, setStartDialogOpen] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [starting, setStarting] = useState(false);

    // Cancel dialog
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // Retry dialog
    const [retryDialogOpen, setRetryDialogOpen] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [retryProviderType, setRetryProviderType] = useState<ProviderType>('azure');
    const [retryApiKey, setRetryApiKey] = useState('');
    const [retryEndpoint, setRetryEndpoint] = useState('');
    const [retryModel, setRetryModel] = useState('');

    const defaultModels: Record<ProviderType, string> = {
        azure: 'gpt-5-mini',
        openai: 'gpt-4o-mini',
        ollama: 'llama3',
        gemini: 'gemini-3-flash-preview',
    };

    // Active day filter
    const [activeDay, setActiveDay] = useState(1);

    const fetchReport = useCallback(async () => {
        try {
            const { data } = await api.get(`/api/train/${sessionId}`);
            setReport(data);
        } catch (err) {
            console.error('Failed to fetch report:', err);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    const fetchPhones = useCallback(async () => {
        try {
            const { data } = await api.get('/api/phone/');
            setPhones(data);
        } catch (err) {
            console.error('Failed to fetch phones:', err);
        }
    }, []);

    useEffect(() => {
        if (sessionId) {
            fetchReport();
            fetchPhones();
        }
    }, [sessionId, fetchReport, fetchPhones]);

    // Auto-refresh while generating (fast) or scheduled with pending messages (slower)
    useEffect(() => {
        if (!report) return;
        const status = report.session.status;
        if (status === 'generating') {
            const interval = setInterval(fetchReport, 5000);
            return () => clearInterval(interval);
        }
        if (status === 'scheduled' && report.summary.pending > 0) {
            const interval = setInterval(fetchReport, 10000);
            return () => clearInterval(interval);
        }
    }, [report, fetchReport]);

    const handleStart = async () => {
        if (!scheduledAt) return;
        setStarting(true);
        try {
            await api.post(`/api/train/${sessionId}/start`, {
                scheduled_at: new Date(scheduledAt).toISOString(),
            });
            setStartDialogOpen(false);
            fetchReport();
        } catch (err) {
            console.error('Failed to start:', err);
        } finally {
            setStarting(false);
        }
    };

    const handleCancel = async () => {
        setCancelling(true);
        try {
            await api.post(`/api/train/${sessionId}/cancel`);
            setCancelDialogOpen(false);
            fetchReport();
        } catch (err) {
            console.error('Failed to cancel:', err);
        } finally {
            setCancelling(false);
        }
    };

    const openRetryDialog = () => {
        setRetryProviderType('azure');
        setRetryApiKey('');
        setRetryEndpoint('');
        setRetryModel(defaultModels['azure']);
        setRetryDialogOpen(true);
    };

    const isRetryFormValid = () => {
        if (!retryModel.trim()) return false;
        if (['azure', 'openai', 'gemini'].includes(retryProviderType) && !retryApiKey.trim()) return false;
        if (['azure', 'ollama'].includes(retryProviderType) && !retryEndpoint.trim()) return false;
        return true;
    };

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await api.post(`/api/train/${sessionId}/retry`, {
                provider_type: retryProviderType,
                api_key: retryApiKey || undefined,
                endpoint: retryEndpoint || undefined,
                model: retryModel,
            });
            setRetryDialogOpen(false);
            fetchReport();
        } catch (err) {
            console.error('Retry failed:', err);
        } finally {
            setRetrying(false);
        }
    };

    const getPhoneName = (sid: string) => {
        const phone = phones.find(p => p.session_id === sid);
        return phone?.name || sid;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-zinc-500">
                لم يتم العثور على جلسة التدريب.
            </div>
        );
    }

    const { session: ts, summary, messages } = report;
    const sc = getSessionStatusConfig(ts.status);

    const dayNumbers = [...new Set(messages.map(m => m.day_number))].sort((a, b) => a - b);
    const dayMessages = messages
        .filter(m => m.day_number === activeDay)
        .sort((a, b) => a.position - b.position);

    return (
        <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/train')}
                        className="text-zinc-400 hover:text-white mb-2 -mr-3"
                    >
                        <ArrowRight className="w-4 h-4 ml-1" />
                        العودة للتدريب
                    </Button>
                    <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                        <Brain className="w-6 h-6" />
                        {ts.name || `جلسة #${ts.id}`}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>{getPhoneName(ts.session_id_1)}</span>
                        <span className="text-zinc-600">↔</span>
                        <span>{getPhoneName(ts.session_id_2)}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={sc.color}>
                        {sc.label}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchReport} className="border-zinc-700 text-zinc-300">
                        تحديث
                    </Button>
                    {ts.status === 'generated' && (
                        <Button
                            size="sm"
                            onClick={() => setStartDialogOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Play className="w-4 h-4" />
                            بدء الإرسال
                        </Button>
                    )}
                    {ts.status === 'scheduled' && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setCancelDialogOpen(true)}
                            className="bg-red-500 hover:bg-red-600 text-white gap-2"
                        >
                            <Ban className="w-4 h-4" />
                            إلغاء
                        </Button>
                    )}
                    {ts.status === 'failed' && (
                        <Button
                            size="sm"
                            onClick={openRetryDialog}
                            className="bg-white text-gray-900 hover:bg-gray-100 gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            إعادة المحاولة
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Banners */}
            {ts.status === 'generating' && (
                <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                    <div>
                        <p className="text-blue-400 font-medium text-sm">جاري توليد المحادثات</p>
                        <p className="text-blue-400/60 text-xs mt-0.5">يتم الآن توليد الرسائل بالذكاء الاصطناعي — سيتم تحديث الصفحة تلقائياً</p>
                    </div>
                </div>
            )}
            {ts.status === 'generated' && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-emerald-400 font-medium text-sm">جاهز للبدء</p>
                            <p className="text-emerald-400/60 text-xs mt-0.5">تم توليد {summary.total} رسالة — حدد وقت البدء لجدولة الإرسال</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setStartDialogOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
                    >
                        <Play className="w-4 h-4" />
                        بدء الإرسال
                    </Button>
                </div>
            )}
            {ts.status === 'failed' && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-red-400 font-medium text-sm">فشل التوليد</p>
                            <p className="text-red-400/60 text-xs mt-0.5 max-w-md">
                                {ts.error_message || 'حدث خطأ أثناء توليد المحادثات'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={openRetryDialog}
                        className="bg-white text-gray-900 hover:bg-gray-100 gap-2 shrink-0"
                    >
                        <RefreshCw className="w-4 h-4" />
                        إعادة المحاولة
                    </Button>
                </div>
            )}

            {/* KPI Cards */}
            {summary.total > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                            <Users className="w-3.5 h-3.5" />
                            الإجمالي
                        </div>
                        <p className="text-2xl font-bold text-white">{summary.total}</p>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم الإرسال
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{summary.sent}</p>
                    </div>
                    <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-red-400 text-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            فشل
                        </div>
                        <p className="text-2xl font-bold text-red-400">{summary.failed}</p>
                    </div>
                    <div className="bg-yellow-950/30 border border-yellow-800/30 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-yellow-400 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            معلق
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">{summary.pending}</p>
                    </div>
                    <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-red-500 text-xs">
                            <Ban className="w-3.5 h-3.5" />
                            ملغي
                        </div>
                        <p className="text-2xl font-bold text-red-500">{summary.cancelled}</p>
                    </div>
                    <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                            <SkipForward className="w-3.5 h-3.5" />
                            متخطي
                        </div>
                        <p className="text-2xl font-bold text-zinc-400">{summary.skipped}</p>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {summary.total > 0 && ts.status !== 'generated' && ts.status !== 'generating' && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>نسبة الإنجاز</span>
                        <span>{Math.round(((summary.sent + summary.failed + summary.skipped) / summary.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
                        {summary.sent > 0 && (
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(summary.sent / summary.total) * 100}%` }} />
                        )}
                        {summary.failed > 0 && (
                            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(summary.failed / summary.total) * 100}%` }} />
                        )}
                        {summary.skipped > 0 && (
                            <div className="h-full bg-zinc-500 transition-all duration-500" style={{ width: `${(summary.skipped / summary.total) * 100}%` }} />
                        )}
                    </div>
                </div>
            )}

            {/* Day Tabs */}
            {dayNumbers.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {dayNumbers.map(day => {
                        const dayMsgs = messages.filter(m => m.day_number === day);
                        const daySent = dayMsgs.filter(m => m.status === 'sent').length;
                        return (
                            <Button
                                key={day}
                                variant={activeDay === day ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveDay(day)}
                                className={activeDay === day
                                    ? 'gap-2'
                                    : 'border-zinc-700 text-zinc-400 gap-2'
                                }
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                يوم {day}
                                <span className="text-xs opacity-70">({dayMsgs.length})</span>
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* Chat Messages */}
            {dayMessages.length > 0 ? (
                <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-white flex items-center justify-between">
                            <span>يوم {activeDay}</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {dayMessages.length} رسالة
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {dayMessages.map((msg) => {
                                const isUser1 = msg.sender_session_id === ts.session_id_1;
                                const senderName = getPhoneName(msg.sender_session_id);
                                const msgSc = msgStatusConfig[msg.status] || msgStatusConfig.pending;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isUser1 ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[75%] rounded-xl px-3 py-2 ${isUser1
                                                ? 'bg-emerald-600/20 border border-emerald-500/20 rounded-br-sm'
                                                : 'bg-secondary border border-border rounded-bl-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-[11px] font-medium text-muted-foreground">
                                                    {senderName}
                                                </p>
                                                {ts.status !== 'generated' && ts.status !== 'generating' && (
                                                    <span className={`text-[10px] ${msgSc.color}`}>
                                                        {msgSc.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white leading-relaxed" dir="rtl">
                                                {msg.text}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1 text-left flex items-center gap-1.5" dir="ltr">
                                                {msg.status === 'sent' && msg.updated_at ? (
                                                    <>
                                                        <span className="text-emerald-400/70">
                                                            {new Date(msg.updated_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-zinc-600">·</span>
                                                        <span>{msg.scheduled_at_offset}</span>
                                                    </>
                                                ) : msg.scheduled_at ? (
                                                    <>
                                                        <span>
                                                            {new Date(msg.scheduled_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-zinc-600">·</span>
                                                        <span>{msg.scheduled_at_offset}</span>
                                                    </>
                                                ) : (
                                                    <span>{msg.scheduled_at_offset}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                ts.status === 'generating' ? (
                    <Card className="bg-card border-border">
                        <CardContent className="py-16 text-center">
                            <Loader2 className="w-10 h-10 mx-auto animate-spin text-white mb-4" />
                            <p className="text-white font-medium mb-1">جاري توليد المحادثات...</p>
                            <p className="text-sm text-muted-foreground">قد يستغرق هذا بضع دقائق</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-card border-border border-dashed">
                        <CardContent className="py-16 text-center">
                            <Brain className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                            <p className="text-muted-foreground">لا توجد رسائل</p>
                        </CardContent>
                    </Card>
                )
            )}

            {/* ═══ Start Dialog ═══ */}
            <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Play className="w-5 h-5 text-emerald-400" />
                            بدء الإرسال
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-zinc-400 text-sm">
                            حدد وقت البدء. سيتم جدولة كل رسالة بناءً على هذا الوقت + الفارق الزمني لكل رسالة.
                        </p>
                        <div className="space-y-2">
                            <Label className="text-white">وقت البدء</Label>
                            <Input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-white"
                                dir="ltr"
                            />
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 space-y-1">
                            <p>سيتم إرسال {summary.total} رسالة على {ts.total_days} يوم</p>
                            <p>الرسائل ستتوزع حسب الأوقات المولّدة</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                        <Button variant="outline" onClick={() => setStartDialogOpen(false)} className="border-zinc-800 text-zinc-300">
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleStart}
                            disabled={!scheduledAt || starting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
                            بدء الإرسال
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Cancel Dialog ═══ */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">إلغاء جلسة التدريب</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-zinc-400 text-sm">
                            هل أنت متأكد؟ سيتم إيقاف جميع الرسائل المعلقة فوراً.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="border-zinc-800 text-zinc-300">
                            تراجع
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="bg-red-500 hover:bg-red-600 text-white gap-2"
                        >
                            {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                            نعم، إلغاء
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Retry Dialog ═══ */}
            <Dialog open={retryDialogOpen} onOpenChange={setRetryDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <RefreshCw className="w-5 h-5" />
                            إعادة التوليد
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-3">
                            <Label className="text-white text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                مزود الذكاء الاصطناعي
                            </Label>
                            <Select value={retryProviderType} onValueChange={(v) => {
                                setRetryProviderType(v as ProviderType);
                                setRetryModel(defaultModels[v as ProviderType]);
                            }}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-800">
                                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="ollama">Ollama (محلي)</SelectItem>
                                    <SelectItem value="gemini">Google Gemini</SelectItem>
                                </SelectContent>
                            </Select>

                            {['azure', 'openai', 'gemini'].includes(retryProviderType) && (
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400 text-xs">API Key</Label>
                                    <Input
                                        type="password"
                                        value={retryApiKey}
                                        onChange={e => setRetryApiKey(e.target.value)}
                                        placeholder="أدخل مفتاح API"
                                        className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                        dir="ltr"
                                    />
                                </div>
                            )}

                            {['azure', 'ollama'].includes(retryProviderType) && (
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400 text-xs">Endpoint URL</Label>
                                    <Input
                                        value={retryEndpoint}
                                        onChange={e => setRetryEndpoint(e.target.value)}
                                        placeholder={retryProviderType === 'ollama' ? 'http://localhost:11434' : 'https://...openai.azure.com/openai/v1'}
                                        className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                        dir="ltr"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 text-xs">Model</Label>
                                <Input
                                    value={retryModel}
                                    onChange={e => setRetryModel(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-2 border-t border-zinc-800 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setRetryDialogOpen(false)}
                            className="border-zinc-800 text-zinc-300"
                        >
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleRetry}
                            disabled={!isRetryFormValid() || retrying}
                            className="bg-white text-gray-900 hover:bg-gray-100 gap-2"
                        >
                            {retrying ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري إعادة التوليد...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    إعادة التوليد
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
