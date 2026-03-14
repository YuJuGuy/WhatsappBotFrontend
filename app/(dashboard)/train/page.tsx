'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Brain,
    Loader2,
    Plus,
    Smartphone,
    Trash2,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
    Ban,
    Zap,
    BarChart3,
    Play,
    RefreshCw,
    AlertTriangle,
} from 'lucide-react';

// ── Types ───────────────────────────────────
interface PhoneInfo {
    id: number;
    name: string;
    number: string | null;
    status: string | null;
    session_id: string;
}

interface TrainSession {
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
}

type ProviderType = 'azure' | 'openai' | 'ollama' | 'gemini';

// ── Status Config ───────────────────────────
function getStatusConfig(status: string) {
    switch (status) {
        case 'generating':
            return { label: 'جاري التوليد', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Loader2 };
        case 'generated':
            return { label: 'جاهز للبدء', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 };
        case 'scheduled':
            return { label: 'مجدول', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Clock };
        case 'finished':
            return { label: 'مكتمل', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle2 };
        case 'failed':
            return { label: 'فشل', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle };
        case 'cancelled':
            return { label: 'ملغي', color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: Ban };
        default:
            return { label: status, color: 'bg-zinc-800/50 text-zinc-300 border-zinc-700', icon: Clock };
    }
}

// ── Main Page ───────────────────────────────
export default function TrainPage() {
    const router = useRouter();
    const [phones, setPhones] = useState<PhoneInfo[]>([]);
    const [sessions, setSessions] = useState<TrainSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Delete dialog
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Retry dialog
    const [retryId, setRetryId] = useState<number | null>(null);
    const [retrying, setRetrying] = useState(false);
    const [retryProviderType, setRetryProviderType] = useState<ProviderType>('azure');
    const [retryApiKey, setRetryApiKey] = useState('');
    const [retryEndpoint, setRetryEndpoint] = useState('');
    const [retryModel, setRetryModel] = useState('');

    // Form state
    const [sessionId1, setSessionId1] = useState('');
    const [sessionId2, setSessionId2] = useState('');
    const [days, setDays] = useState(1);
    const [messagesPerDay, setMessagesPerDay] = useState(50);
    const [providerType, setProviderType] = useState<ProviderType>('azure');
    const [apiKey, setApiKey] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [model, setModel] = useState('');

    const defaultModels: Record<ProviderType, string> = {
        azure: 'gpt-5-mini',
        openai: 'gpt-4o-mini',
        ollama: 'llama3',
        gemini: 'gemini-3-flash-preview',
    };

    const fetchPhones = useCallback(async () => {
        try {
            const { data } = await api.get('/api/phone/');
            setPhones(data);
        } catch (err) {
            console.error('Failed to fetch phones:', err);
        }
    }, []);

    const fetchSessions = useCallback(async () => {
        try {
            const { data } = await api.get('/api/train/');
            setSessions(data);
        } catch (err) {
            console.error('Failed to fetch train sessions:', err);
        }
    }, []);

    useEffect(() => {
        Promise.all([fetchPhones(), fetchSessions()]).finally(() => setLoading(false));
    }, [fetchPhones, fetchSessions]);

    useEffect(() => {
        setModel(defaultModels[providerType]);
    }, [providerType]);

    // Auto-refresh sessions that are generating
    useEffect(() => {
        const hasGenerating = sessions.some(s => s.status === 'generating');
        if (!hasGenerating) return;
        const interval = setInterval(fetchSessions, 5000);
        return () => clearInterval(interval);
    }, [sessions, fetchSessions]);

    const isFormValid = () => {
        if (!sessionId1 || !sessionId2) return false;
        if (sessionId1 === sessionId2) return false;
        if (!model.trim()) return false;
        if (['azure', 'openai', 'gemini'].includes(providerType) && !apiKey.trim()) return false;
        if (['azure', 'ollama'].includes(providerType) && !endpoint.trim()) return false;
        return true;
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await api.post('/api/train/generate', {
                session_id_1: sessionId1,
                session_id_2: sessionId2,
                days,
                messages_per_day: messagesPerDay,
                provider: {
                    provider_type: providerType,
                    api_key: apiKey || undefined,
                    endpoint: endpoint || undefined,
                    model,
                },
            }, { timeout: 10 * 60 * 1000 });
            setShowForm(false);
            fetchSessions();
        } catch (err) {
            console.error('Failed to generate:', err);
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await api.delete(`/api/train/${deleteId}`);
            setDeleteId(null);
            fetchSessions();
        } catch (err) {
            console.error('Failed to delete:', err);
        } finally {
            setDeleting(false);
        }
    };

    const openRetryDialog = (sessionId: number) => {
        setRetryId(sessionId);
        setRetryProviderType('azure');
        setRetryApiKey('');
        setRetryEndpoint('');
        setRetryModel(defaultModels['azure']);
    };

    const isRetryFormValid = () => {
        if (!retryModel.trim()) return false;
        if (['azure', 'openai', 'gemini'].includes(retryProviderType) && !retryApiKey.trim()) return false;
        if (['azure', 'ollama'].includes(retryProviderType) && !retryEndpoint.trim()) return false;
        return true;
    };

    const handleRetry = async () => {
        if (!retryId) return;
        setRetrying(true);
        try {
            await api.post(`/api/train/${retryId}/retry`, {
                provider_type: retryProviderType,
                api_key: retryApiKey || undefined,
                endpoint: retryEndpoint || undefined,
                model: retryModel,
            });
            setRetryId(null);
            fetchSessions();
        } catch (err) {
            console.error('Retry failed:', err);
        } finally {
            setRetrying(false);
        }
    };

    const getPhoneName = (sessionId: string) => {
        const phone = phones.find(p => p.session_id === sessionId);
        return phone?.name || sessionId;
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
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                        <Brain className="w-6 h-6" />
                        التدريب
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        توليد محادثات تدريبية بين رقمين وجدولة إرسالها
                    </p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-white text-gray-900 hover:bg-gray-100 gap-2"
                >
                    <Plus className="w-4 h-4" />
                    جلسة جديدة
                </Button>
            </div>

            {/* Sessions List */}
            {sessions.length === 0 ? (
                <Card className="bg-card border-border border-dashed">
                    <CardContent className="py-20 text-center">
                        <Brain className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground mb-2">لا توجد جلسات تدريب بعد</p>
                        <p className="text-sm text-muted-foreground/70">اضغط &quot;جلسة جديدة&quot; للبدء</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sessions.map(session => {
                        const sc = getStatusConfig(session.status);
                        const StatusIcon = sc.icon;
                        return (
                            <Card
                                key={session.id}
                                className="bg-card border-border hover:border-zinc-600 transition-colors cursor-pointer group"
                                onClick={() => router.push(`/train/${session.id}`)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base text-white group-hover:text-emerald-400 transition-colors">
                                            {session.name || `جلسة #${session.id}`}
                                        </CardTitle>
                                        <Badge variant="outline" className={`${sc.color} flex items-center gap-1 shrink-0`}>
                                            <StatusIcon className={`w-3 h-3 ${session.status === 'generating' ? 'animate-spin' : ''}`} />
                                            {sc.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Phones */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Smartphone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <span className="text-zinc-300 truncate">{getPhoneName(session.session_id_1)}</span>
                                        <span className="text-zinc-600">↔</span>
                                        <span className="text-zinc-300 truncate">{getPhoneName(session.session_id_2)}</span>
                                    </div>

                                    {/* Status Indicator Banners */}
                                    {session.status === 'generating' && (
                                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                                            <span className="text-xs text-blue-400">جاري توليد المحادثات...</span>
                                        </div>
                                    )}
                                    {session.status === 'generated' && (
                                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                                            <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span className="text-xs text-emerald-400 font-medium">جاهز للبدء — {session.message_count} رسالة</span>
                                        </div>
                                    )}
                                    {session.status === 'failed' && (
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                                <span className="text-xs text-red-400 line-clamp-2">
                                                    {session.error_message || 'فشل التوليد'}
                                                </span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openRetryDialog(session.id);
                                                }}
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                إعادة المحاولة
                                            </Button>
                                        </div>
                                    )}

                                    {/* Stats row */}
                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <BarChart3 className="w-3 h-3" />
                                            {session.message_count} رسالة
                                        </span>
                                        <span>{session.total_days} يوم</span>
                                        {session.scheduled_at && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(session.scheduled_at).toLocaleDateString('ar')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-1">
                                        {session.status === 'generated' ? (
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 gap-1.5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/train/${session.id}`);
                                                }}
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                                بدء الإرسال
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-zinc-700 text-zinc-400 hover:text-white flex-1 gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/train/${session.id}`);
                                                }}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                عرض
                                            </Button>
                                        )}
                                        {!['scheduled'].includes(session.status) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(session.id);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ═══ Generate Dialog ═══ */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            جلسة تدريب جديدة
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Phone Selection */}
                        <div className="space-y-3">
                            <Label className="text-white text-sm flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                الأرقام
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <span className="text-xs text-zinc-500">الرقم الأول</span>
                                    <Select value={sessionId1} onValueChange={setSessionId1}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                            <SelectValue placeholder="اختر" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800">
                                            {phones.map(p => (
                                                <SelectItem key={p.id} value={p.session_id}>
                                                    {p.name} {p.number ? `(${p.number})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-xs text-zinc-500">الرقم الثاني</span>
                                    <Select value={sessionId2} onValueChange={setSessionId2}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                            <SelectValue placeholder="اختر" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-zinc-800">
                                            {phones.filter(p => p.session_id !== sessionId1).map(p => (
                                                <SelectItem key={p.id} value={p.session_id}>
                                                    {p.name} {p.number ? `(${p.number})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {sessionId1 && sessionId2 && sessionId1 === sessionId2 && (
                                <p className="text-xs text-red-400">لا يمكن اختيار نفس الرقم</p>
                            )}
                        </div>

                        {/* Generation Settings */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-white text-sm">عدد الأيام</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={days}
                                    onChange={e => setDays(parseInt(e.target.value) || 1)}
                                    className="bg-zinc-900 border-zinc-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-white text-sm">رسائل / يوم</Label>
                                <Input
                                    type="number"
                                    min={10}
                                    max={200}
                                    value={messagesPerDay}
                                    onChange={e => setMessagesPerDay(parseInt(e.target.value) || 50)}
                                    className="bg-zinc-900 border-zinc-800"
                                />
                            </div>
                        </div>

                        {/* Provider Config */}
                        <div className="space-y-3 border-t border-zinc-800 pt-4">
                            <Label className="text-white text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                مزود الذكاء الاصطناعي
                            </Label>
                            <Select value={providerType} onValueChange={(v) => setProviderType(v as ProviderType)}>
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

                            {['azure', 'openai', 'gemini'].includes(providerType) && (
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400 text-xs">API Key</Label>
                                    <Input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="أدخل مفتاح API"
                                        className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                        dir="ltr"
                                    />
                                </div>
                            )}

                            {['azure', 'ollama'].includes(providerType) && (
                                <div className="space-y-1.5">
                                    <Label className="text-zinc-400 text-xs">Endpoint URL</Label>
                                    <Input
                                        value={endpoint}
                                        onChange={e => setEndpoint(e.target.value)}
                                        placeholder={providerType === 'ollama' ? 'http://localhost:11434' : 'https://...openai.azure.com/openai/v1'}
                                        className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                        dir="ltr"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-zinc-400 text-xs">Model</Label>
                                <Input
                                    value={model}
                                    onChange={e => setModel(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-2 border-t border-zinc-800 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowForm(false)}
                            className="border-zinc-800 text-zinc-300"
                        >
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={!isFormValid() || generating}
                            className="bg-white text-gray-900 hover:bg-gray-100 gap-2"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري التوليد...
                                </>
                            ) : (
                                <>
                                    <Brain className="w-4 h-4" />
                                    توليد المحادثات
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Retry Dialog ═══ */}
            <Dialog open={retryId !== null} onOpenChange={(open) => !open && setRetryId(null)}>
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
                            onClick={() => setRetryId(null)}
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

            {/* ═══ Delete Dialog ═══ */}
            <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">حذف جلسة التدريب</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-zinc-400 text-sm">
                            هل أنت متأكد من حذف هذه الجلسة؟ سيتم حذف جميع الرسائل المرتبطة بها.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDeleteId(null)} className="border-zinc-800 text-zinc-300">
                            تراجع
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-500 hover:bg-red-600 text-white gap-2"
                        >
                            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            حذف
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
