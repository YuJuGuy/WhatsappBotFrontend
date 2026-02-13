'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WhatsAppPanel from '@/components/WhatsAppPanel';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const { data } = await api.post('/api/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            login(data.access_token, data.refresh_token);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'بيانات الدخول غير صحيحة');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - WhatsApp Panel */}
            <WhatsAppPanel />

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12" dir="rtl">
                <div className="w-full max-w-sm mx-auto">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-10">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-gray-900" />
                        </div>
                        <span className="text-lg font-semibold text-white">واتابوت</span>
                    </div>

                    {/* Header */}
                    <h1 className="text-2xl font-semibold text-white mb-2 text-center">مرحباً بعودتك</h1>
                    <p className="text-muted-foreground mb-8 text-center">سجل دخولك إلى حسابك</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 text-sm text-red-400 bg-red-900/20 rounded-lg border border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300">البريد الإلكتروني</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="أدخل بريدك الإلكتروني"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-gray-300">كلمة المرور</Label>
                                <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-white">
                                    نسيت كلمة المرور؟
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="أدخل كلمة المرور"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري تسجيل الدخول...
                                </>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-400">
                        ليس لديك حساب؟{' '}
                        <Link href="/signup" className="text-white hover:underline font-medium">
                            إنشاء حساب
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
