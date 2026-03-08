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
    Inbox
} from "lucide-react";
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
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4 space-y-4">
                        <DialogTitle className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${selectedMessage?.from_me ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {selectedMessage?.from_me ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <span className="text-lg">
                                {selectedMessage?.from_me ? 'رسالة صادرة' : 'رسالة واردة'}
                            </span>
                        </DialogTitle>

                        {/* 
                            Moved out of DialogDescription to fix hydration error 
                            (<p> cannot contain <div>)
                        */}
                        <div className="text-sm text-zinc-400 flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                                <span className="text-zinc-500">الهاتف:</span>
                                <span className="font-medium text-zinc-200">
                                    {selectedMessage?.phone_name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                                <span className="text-zinc-500">الرقم:</span>
                                <span dir="ltr" className="font-medium text-zinc-200">
                                    {selectedMessage?.from_number}
                                </span>
                            </div>
                            {selectedMessage?.timestamp && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-500">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(selectedMessage.timestamp.endsWith('Z') ? selectedMessage.timestamp : selectedMessage.timestamp + 'Z'), "dd MMMM yyyy, HH:mm", { locale: ar })}
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[100px]">
                        <div className={`p-4 rounded-xl whitespace-pre-wrap leading-relaxed ${selectedMessage?.from_me
                            ? 'bg-primary/10 border border-primary/20 text-zinc-200 ml-12 rounded-tr-sm'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200 mr-12 rounded-tl-sm'
                            }`}>
                            {selectedMessage?.message_body}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
