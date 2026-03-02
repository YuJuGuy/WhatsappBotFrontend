'use client';

import { usePathname } from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Settings, Home, Phone, FileText, LogOut, MessageCircle, Megaphone, PhoneOff, MessageSquareReply, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const navItems = [
    { title: 'الرئيسية', href: '/', icon: Home },
    { title: 'الأرقام', href: '/phones', icon: Phone },
    { title: 'القوالب', href: '/templates', icon: FileText },
    { title: 'الحملات', href: '/campaigns', icon: Megaphone },
    { title: 'المكالمات', href: '/calls', icon: PhoneOff },
    { title: 'الرد التلقائي', href: '/autoreply', icon: MessageSquareReply },
    { title: 'سجل الرسائل', href: '/messages', icon: MessageSquareText },
    { title: 'الإعدادات', href: '/settings', icon: Settings },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <SidebarProvider>
            <Sidebar side="right" collapsible="icon">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href="/">
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-gray-900">
                                        <MessageCircle className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 leading-none">
                                        <span className="font-semibold">واتابوت</span>
                                        <span className="text-xs text-muted-foreground">WhataBot</span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>القائمة</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navItems.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                                            <Link href={item.href}>
                                                <item.icon className="size-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip={user?.email || ''}>
                                <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                                    {user?.full_name?.[0] || user?.email?.[0] || '?'}
                                </div>
                                <span className="truncate text-sm">{user?.full_name || user?.email}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={logout} tooltip="تسجيل خروج">
                                <LogOut className="size-4" />
                                <span>تسجيل خروج</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
                    <SidebarTrigger />
                    <Separator orientation="vertical" className="h-4" />
                </header>
                <main className="flex-1 p-4 overflow-auto">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
