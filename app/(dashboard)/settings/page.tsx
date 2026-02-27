'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Loader2, Save, Clock, Moon } from 'lucide-react';

interface SettingsData {
    delay: boolean;
    min_delay_seconds: number;
    max_delay_seconds: number;
    sleep: boolean;
    sleep_after_messages: number;
    min_sleep_seconds: number;
    max_sleep_seconds: number;
}

const defaultSettings: SettingsData = {
    delay: false,
    min_delay_seconds: 1,
    max_delay_seconds: 5,
    sleep: false,
    sleep_after_messages: 1,
    min_sleep_seconds: 1,
    max_sleep_seconds: 5,
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/api/settings/');
            if (data && data.length > 0) {
                setSettings(data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/api/settings/', settings);
            setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
        } catch (error) {
            setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
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
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                    <SettingsIcon className="w-6 h-6" />
                    الإعدادات
                </h1>
                <p className="mt-1 text-muted-foreground">
                    إعدادات الرسائل والأتمتة
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
                {/* Delay Settings */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Clock className="w-5 h-5" />
                            التأخير بين الرسائل
                        </CardTitle>
                        <CardDescription>تأخير عشوائي بين كل رسالة لتجنب الحظر</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="delay-toggle" className="text-white">تفعيل التأخير</Label>
                            <button
                                id="delay-toggle"
                                onClick={() => setSettings({ ...settings, delay: !settings.delay })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.delay ? 'bg-primary' : 'bg-secondary'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.delay ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {settings.delay && (
                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="min-delay" className="text-muted-foreground text-sm">
                                            الحد الأدنى (ثانية)
                                        </Label>
                                        <Input
                                            id="min-delay"
                                            type="number"
                                            min={1}
                                            value={settings.min_delay_seconds}
                                            onChange={(e) => setSettings({ ...settings, min_delay_seconds: parseInt(e.target.value) || 1 })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="max-delay" className="text-muted-foreground text-sm">
                                            الحد الأقصى (ثانية)
                                        </Label>
                                        <Input
                                            id="max-delay"
                                            type="number"
                                            min={1}
                                            value={settings.max_delay_seconds}
                                            onChange={(e) => setSettings({ ...settings, max_delay_seconds: parseInt(e.target.value) || 5 })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sleep Settings */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Moon className="w-5 h-5" />
                            الاستراحة
                        </CardTitle>
                        <CardDescription>استراحة تلقائية بعد عدد معين من الرسائل</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="sleep-toggle" className="text-white">تفعيل الاستراحة</Label>
                            <button
                                id="sleep-toggle"
                                onClick={() => setSettings({ ...settings, sleep: !settings.sleep })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.sleep ? 'bg-primary' : 'bg-secondary'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.sleep ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {settings.sleep && (
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sleep-after" className="text-muted-foreground text-sm">
                                        استراحة بعد كل عدد رسائل
                                    </Label>
                                    <Input
                                        id="sleep-after"
                                        type="number"
                                        min={1}
                                        value={settings.sleep_after_messages}
                                        onChange={(e) => setSettings({ ...settings, sleep_after_messages: parseInt(e.target.value) || 1 })}
                                        className="bg-secondary border-border"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="min-sleep" className="text-muted-foreground text-sm">
                                            الحد الأدنى (ثانية)
                                        </Label>
                                        <Input
                                            id="min-sleep"
                                            type="number"
                                            min={1}
                                            value={settings.min_sleep_seconds}
                                            onChange={(e) => setSettings({ ...settings, min_sleep_seconds: parseInt(e.target.value) || 1 })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="max-sleep" className="text-muted-foreground text-sm">
                                            الحد الأقصى (ثانية)
                                        </Label>
                                        <Input
                                            id="max-sleep"
                                            type="number"
                                            min={1}
                                            value={settings.max_sleep_seconds}
                                            onChange={(e) => setSettings({ ...settings, max_sleep_seconds: parseInt(e.target.value) || 5 })}
                                            className="bg-secondary border-border"
                                        />
                                    </div>
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
