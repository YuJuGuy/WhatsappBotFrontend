"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    MessageSquareText,
    Search,
    User,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    Inbox,
    Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

type Message = {
    id: number;
    session_id: string;
    phone_name: string;
    from_number: string;
    to_number: string;
    message_body: string;
    from_me: boolean;
    user_id: number;
    timestamp: string;
};

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const { data } = await api.get("/api/messages/");
            setMessages(data);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMessages = messages.filter((msg) =>
        msg.message_body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.from_number.includes(searchQuery) ||
        (msg.phone_name && msg.phone_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">سجل الرسائل</h1>
                    <p className="text-zinc-400">
                        عرض الرسائل الواردة والصادرة لجميع أرقامك.
                    </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-full">
                    <MessageSquareText className="w-8 h-8 text-primary" />
                </div>
            </div>

            <div className="flex gap-4 items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="ابحث في محتوى الرسالة، الأرقام..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10 bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-500"
                    />
                </div>
                <div className="text-sm text-zinc-400 px-4 border-r border-zinc-800">
                    {filteredMessages.length} رسالة
                </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="w-12 text-center text-zinc-400"></TableHead>
                            <TableHead className="text-right text-zinc-400 w-36">الهاتف</TableHead>
                            <TableHead className="text-right text-zinc-400 w-40">مِن</TableHead>
                            <TableHead className="text-right text-zinc-400 w-40">إلى</TableHead>
                            <TableHead className="text-right text-zinc-400">نص الرسالة</TableHead>
                            <TableHead className="text-right text-zinc-400 w-44">الوقت</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-zinc-500">
                                    جاري تحميل الرسائل...
                                </TableCell>
                            </TableRow>
                        ) : filteredMessages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center text-zinc-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Inbox className="w-8 h-8 opacity-20" />
                                        لا توجد رسائل مطابقة للبحث
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMessages.map((message) => (
                                <TableRow
                                    key={message.id}
                                    onClick={() => setSelectedMessage(message)}
                                    className="border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer group"
                                >
                                    <TableCell className="p-4">
                                        <div className={`p-2 rounded-full w-max mx-auto ${message.from_me ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {message.from_me ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-zinc-400 text-sm">
                                        {message.phone_name}
                                    </TableCell>
                                    <TableCell dir="ltr" className="text-right font-medium text-zinc-300">
                                        {message.from_number}
                                    </TableCell>
                                    <TableCell dir="ltr" className="text-right font-medium text-zinc-300">
                                        {message.to_number}
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <p className="truncate text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                            {message.message_body}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                                        {format(new Date(message.timestamp.endsWith('Z') ? message.timestamp : message.timestamp + 'Z'), "dd MMM yyyy HH:mm", { locale: ar })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="">
                    <DialogHeader className="border-b border-zinc-800 px-6 py-5 space-y-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-primary">
                                <MessageSquareText className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-2xl font-semibold text-white">تفاصيل الرسالة</DialogTitle>
                        </div>
                        <div className="flex justify-start">
                            {selectedMessage && (
                                <Badge variant="outline" className={`${selectedMessage.from_me ? 'bg-primary/20 text-primary border-primary/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'} px-3 py-1 text-sm flex items-center gap-1`}>
                                    {selectedMessage.from_me ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                                    {selectedMessage.from_me ? 'رسالة صادرة' : 'رسالة واردة'}
                                </Badge>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                                <p className="mb-1 text-xs font-medium text-zinc-500">(من)</p>
                                <p dir="ltr" className="text-base font-semibold text-zinc-100 break-all text-right">
                                    {selectedMessage?.from_number || "-"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                                <p className="mb-1 text-xs font-medium text-zinc-500">(إلى)</p>
                                <p dir="ltr" className="text-base font-semibold text-zinc-100 break-words text-right">
                                    {selectedMessage?.to_number || "-"}
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                    <Clock className="h-4 w-4" />
                                    <span>وقت الإرسال</span>
                                </div>
                                <p dir="ltr" className="mt-1 text-sm text-zinc-200 text-right">
                                    {selectedMessage?.timestamp ? format(new Date(selectedMessage.timestamp.endsWith('Z') ? selectedMessage.timestamp : selectedMessage.timestamp + 'Z'), "PP pp", { locale: ar }) : "-"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                    <User className="h-4 w-4" />
                                    <span>الهاتف المستخدم</span>
                                </div>
                                <p className="mt-1 text-sm text-zinc-200 font-medium">
                                    {selectedMessage?.phone_name || "-"}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-[100px]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-200">نص الرسالة</h3>
                            <span className="text-xs text-zinc-500">{selectedMessage?.message_body?.length || 0} chars</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl whitespace-pre-wrap break-words leading-8 text-zinc-200">
                            {selectedMessage?.message_body}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
