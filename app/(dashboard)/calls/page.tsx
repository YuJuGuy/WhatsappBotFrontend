'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneOff, Loader2, Save, MessageSquare, Users, Zap } from 'lucide-react';

interface Template {
    id: number;
    name: string;
    body: string;
}

interface CallConfig {
    id?: number;
    enabled: boolean;
    process_groups: boolean;
    default_template_id: number | null;
    priority: number;
}

const defaultConfig: CallConfig = {
    enabled: false,
    process_groups: false,
    default_template_id: null,
    priority: 50,
};

export default function CallsPage() {
    const [config, setConfig] = useState<CallConfig>(defaultConfig);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isNew, setIsNew] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch templates
            const { data: tplData } = await api.get('/api/templates/');
            setTemplates(tplData);

            // Fetch config
            const { data: cfgData } = await api.get('/api/calls/config');
            if (cfgData) {
                setConfig(cfgData);
                setIsNew(false);
            } else {
                setIsNew(true);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config.default_template_id) {
            setMessage({ type: 'error', text: 'يجب اختيار قالب افتراضي' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            if (isNew) {
                const { data } = await api.post('/api/calls/config', config);
                setConfig(data);
                setIsNew(false);
            } else {
                const { data } = await api.put('/api/calls/config', config);
                setConfig(data);
            }
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
        } catch (error) {
            setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
            console.error('Failed to save config:', error);
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const selectedTemplate = templates.find(t => t.id === config.default_template_id);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <PhoneOff className="w-6 h-6" />
                    الرد التلقائي على المكالمات
                </h1>
                <p className="mt-1 text-muted-foreground">
                    رفض المكالمات الواردة تلقائياً وإرسال رد فوري
                </p>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feature Toggle */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Zap className="w-5 h-5" />
                            التفعيل
                        </CardTitle>
                        <CardDescription>عند التفعيل سيتم رفض المكالمات الواردة وإرسال رسالة تلقائية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="enabled-toggle" className="text-white">تفعيل الرد التلقائي</Label>
                            <button
                                id="enabled-toggle"
                                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-primary' : 'bg-secondary'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {config.enabled && (
                            <div className="pt-2 space-y-4">
                                {/* Process Groups Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <Label htmlFor="groups-toggle" className="text-white">معالجة المجموعات</Label>
                                    </div>
                                    <button
                                        id="groups-toggle"
                                        onClick={() => setConfig({ ...config, process_groups: !config.process_groups })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.process_groups ? 'bg-primary' : 'bg-secondary'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.process_groups ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Priority */}
                                <div className="space-y-2">
                                    <Label htmlFor="priority" className="text-muted-foreground text-sm">
                                        الأولوية (رقم أقل = أولوية أعلى)
                                    </Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        min={1}
                                        max={1000}
                                        value={config.priority}
                                        onChange={(e) => setConfig({ ...config, priority: parseInt(e.target.value) || 50 })}
                                        className="bg-secondary border-border"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Template Selection */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <MessageSquare className="w-5 h-5" />
                            قالب الرسالة
                        </CardTitle>
                        <CardDescription>اختر القالب الذي سيتم إرساله عند رفض المكالمة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="template-select" className="text-muted-foreground text-sm">
                                القالب الافتراضي
                            </Label>
                            <select
                                id="template-select"
                                value={config.default_template_id || ''}
                                onChange={(e) => setConfig({ ...config, default_template_id: parseInt(e.target.value) || null })}
                                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">اختر قالب...</option>
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Template Preview */}
                        {selectedTemplate && (
                            <div className="mt-4 space-y-2">
                                <Label className="text-muted-foreground text-sm">معاينة الرسالة</Label>
                                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                                        {selectedTemplate.body}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-start">
                <Button onClick={handleSave} disabled={saving} className="bg-white text-gray-900 hover:bg-gray-100">
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    حفظ الإعدادات
                </Button>
            </div>
        </div>
    );
}
