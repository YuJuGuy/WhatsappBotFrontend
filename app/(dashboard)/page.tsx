'use client';

import { useAuth } from '@/context/AuthContext';
import { Loader2, Mail, Hash, User, MessageCircle, Zap, BarChart3, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div>
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-white">
                    مرحباً، {user.full_name || user.email}
                </h1>
                <p className="mt-1 text-muted-foreground">
                    إدارة أتمتة واتساب الخاصة بك
                </p>
            </div>

            {/* Quick Action */}
            <Card className="mb-8 bg-gradient-to-l from-blue-600/20 to-purple-600/20 border-blue-500/30">
                <CardContent className="flex items-center justify-between py-4">
                    <div>
                        <h3 className="text-white font-medium">ابدأ الآن</h3>
                        <p className="text-sm text-muted-foreground">قم بربط واتساب الخاص بك لبدء الأتمتة</p>
                    </div>
                    <Button className="bg-white text-gray-900 hover:bg-gray-100">
                        <Plus className="w-4 h-4" />
                        ربط واتساب
                    </Button>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            الرسائل المرسلة
                        </CardTitle>
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            ابدأ بالإرسال لمشاهدة الإحصائيات
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            الأتمتة
                        </CardTitle>
                        <Zap className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            أنشئ أول أتمتة لك
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            جهات الاتصال
                        </CardTitle>
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">0</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            استورد جهات الاتصال للبدء
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <User className="w-5 h-5" />
                            تفاصيل الحساب
                        </CardTitle>
                        <CardDescription>معلومات حسابك</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">معرف المستخدم</p>
                                <p className="text-sm font-medium text-white">{user.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                                <p className="text-sm font-medium text-white">{user.email}</p>
                            </div>
                        </div>
                        {user.full_name && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">الاسم الكامل</p>
                                    <p className="text-sm font-medium text-white">{user.full_name}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Settings className="w-5 h-5" />
                            إجراءات سريعة
                        </CardTitle>
                        <CardDescription>المهام والاختصارات الشائعة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start h-11 border-border text-white hover:bg-secondary">
                            <MessageCircle className="w-4 h-4" />
                            إرسال بث
                        </Button>
                        <Button variant="outline" className="w-full justify-start h-11 border-border text-white hover:bg-secondary">
                            <Zap className="w-4 h-4" />
                            إنشاء أتمتة
                        </Button>
                        <Button variant="outline" className="w-full justify-start h-11 border-border text-white hover:bg-secondary">
                            <BarChart3 className="w-4 h-4" />
                            استيراد جهات الاتصال
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
