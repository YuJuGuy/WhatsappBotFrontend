"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    ArrowRight,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    BarChart3,
    MessageSquareText,
    Users,
    Inbox,
    Ban,
    Download,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCw,
    Loader2,
    X,
    SkipForward
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveAs } from 'file-saver';
import * as XLSX from "xlsx";
import api from "@/lib/api";

type Recipient = {
    id: number;
    phone_number: string;
    rendered_message: string;
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

type Campaign = {
    id: number;
    name: string;
    description: string | null;
    status: string;
    scheduled_at: string;
    created_at: string;
    recipient_count: number;
};

type PhoneInfo = {
    id: number;
    name: string;
    number: string | null;
    status: string | null;
};

type PhoneGroup = {
    id: number;
    name: string;
    phones: PhoneInfo[];
};

type ReportData = {
    campaign: Campaign;
    summary: Summary;
    recipients: Recipient[];
};

export default function CampaignReportPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.id;

    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortConfig, setSortConfig] = useState<{ key: keyof Recipient | "sender" | null, direction: "asc" | "desc" }>({ key: null, direction: "asc" });
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Resend dialog state
    const [resendDialogOpen, setResendDialogOpen] = useState(false);
    const [phones, setPhones] = useState<PhoneInfo[]>([]);
    const [groups, setGroups] = useState<PhoneGroup[]>([]);
    const [resendPhoneIds, setResendPhoneIds] = useState<number[]>([]);
    const [resendGroupIds, setResendGroupIds] = useState<number[]>([]);
    const [resendDate, setResendDate] = useState("");
    const [resending, setResending] = useState(false);

    // Blacklist dialog state
    const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
    const [blacklisting, setBlacklisting] = useState(false);

    const fetchPhones = async () => {
        try {
            const { data } = await api.get('/api/phone/');
            setPhones(data);
        } catch (err) { console.error('Failed to fetch phones:', err); }
    };

    const fetchGroups = async () => {
        try {
            const { data } = await api.get('/api/phone/groups/');
            setGroups(data);
        } catch (err) { console.error('Failed to fetch groups:', err); }
    };

    const fetchReport = useCallback(async () => {
        try {
            const { data } = await api.get(`/api/campaigns/${campaignId}`);
            setReport(data);
        } catch (error) {
            console.error("Failed to fetch report", error);
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        if (campaignId) fetchReport();
        fetchPhones();
        fetchGroups();
    }, [campaignId, fetchReport]);

    // Auto-refresh while campaign has pending messages
    useEffect(() => {
        if (!report) return;
        if (report.campaign.status === 'scheduled' && report.summary.pending > 0) {
            const interval = setInterval(fetchReport, 10000);
            return () => clearInterval(interval);
        }
    }, [report, fetchReport]);

    const handleCancelCampaign = async () => {
        try {
            await api.post(`/api/campaigns/${campaignId}/cancel`);
            setIsCancelDialogOpen(false);
            fetchReport(); // Refresh data to show cancelled status
        } catch (error) {
            console.error("Failed to cancel campaign", error);
            alert("حدث خطأ أثناء إلغاء الحملة");
        }
    };

    // ── Selection helpers ─────────────────────────
    const toggleSelect = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sortedRecipients.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedRecipients.map(r => r.id)));
        }
    };

    const togglePhoneForResend = (pid: number) => {
        setResendPhoneIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
    };

    const toggleGroupForResend = (gid: number) => {
        setResendGroupIds(prev => prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid]);
    };

    // ── Resend handler ────────────────────────────
    const handleResend = async () => {
        if (!resendDate || (resendPhoneIds.length === 0 && resendGroupIds.length === 0)) return;
        setResending(true);
        try {
            await api.post(`/api/campaigns/${campaignId}/resend`, {
                recipient_ids: Array.from(selectedIds),
                phone_ids: resendPhoneIds.length > 0 ? resendPhoneIds : undefined,
                phone_group_ids: resendGroupIds.length > 0 ? resendGroupIds : undefined,
                scheduled_at: new Date(resendDate).toISOString(),
            });
            setResendDialogOpen(false);
            setSelectedIds(new Set());
            setResendPhoneIds([]);
            setResendGroupIds([]);
            setResendDate("");
            fetchReport();
        } catch (err) {
            console.error('Failed to resend:', err);
        } finally {
            setResending(false);
        }
    };

    // ── Bulk blacklist handler ────────────────────
    const handleBulkBlacklist = async () => {
        setBlacklisting(true);
        try {
            await api.post('/api/blacklist/bulk', {
                recipient_ids: Array.from(selectedIds),
            });
            setBlacklistDialogOpen(false);
            setSelectedIds(new Set());
            fetchReport();
        } catch (err) {
            console.error('Failed to blacklist:', err);
        } finally {
            setBlacklisting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-zinc-500">
                جاري تحميل التقرير...
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-zinc-500">
                لم يتم العثور على الحملة.
            </div>
        );
    }

    const { campaign, summary, recipients } = report;

    const filteredRecipients = recipients.filter((r) => {
        const matchesSearch =
            r.phone_number.includes(searchQuery) ||
            r.rendered_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.error_message && r.error_message.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === "all" || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const sortedRecipients = [...filteredRecipients].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aVal: any = a[sortConfig.key as keyof Recipient];
        let bVal: any = b[sortConfig.key as keyof Recipient];

        if (sortConfig.key === "sender") {
            aVal = a.sent_by_session_name || a.sent_by_number || "";
            bVal = b.sent_by_session_name || b.sent_by_number || "";
        }

        if (aVal === null) aVal = "";
        if (bVal === null) bVal = "";

        if (aVal < bVal) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aVal > bVal) {
            return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
    });

    const handleSort = (key: keyof Recipient | "sender") => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
        sent: { label: "تم الإرسال", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
        failed: { label: "فشل", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
        pending: { label: "قيد الانتظار", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
        cancelled: { label: "ملغية", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: Ban },
        skipped: { label: "متخطي (قائمة سوداء)", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: SkipForward as any },
    };

    const getCampaignStatusConfig = (status: string) => {
        switch (status) {
            case 'scheduled': return { label: 'مجدولة', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
            case 'finished': return { label: 'مكتملة', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
            case 'cancelled': return { label: 'ملغية', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
            default: return { label: status, color: 'bg-zinc-800/50 text-zinc-300 border-zinc-700' };
        }
    };

    const handleExport = () => {
        const worksheetData = sortedRecipients.map((r) => ({
            "رقم المستلم": r.phone_number,
            "الحالة": statusConfig[r.status].label,
            "تاريخ التحديث": r.updated_at ? format(new Date(r.updated_at), "PP pp", { locale: ar }) : "—",
            "تم الإرسال بواسطة": r.sent_by_session_name || "—",
            "رقم المرسل": r.sent_by_number || "—",
            "الرسالة": r.rendered_message,
            "رسالة الخطأ": r.error_message || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير الحملة");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `campaign-report-${campaignId}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/campaigns")}
                        className="text-zinc-400 hover:text-white mb-2 -mr-3"
                    >
                        <ArrowRight className="w-4 h-4 ml-1" />
                        العودة للحملات
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1 break-words">
                        {campaign.name}
                    </h1>
                    {campaign.description && (
                        <p className="text-zinc-400 text-sm">{campaign.description}</p>
                    )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                    <Badge variant="outline" className={`${getCampaignStatusConfig(campaign.status).color}`}>
                        {getCampaignStatusConfig(campaign.status).label}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchReport} className="border-zinc-700 text-zinc-300 flex-1 sm:flex-none">
                        تحديث
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 flex-1 sm:flex-none"
                    >
                        <Download className="w-4 h-4 ml-2" />
                        تصدير التقرير
                    </Button>
                    {campaign.status === "scheduled" && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsCancelDialogOpen(true)}
                            className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto"
                        >
                            <Ban className="w-4 h-4 ml-2" />
                            إلغاء الحملة
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <Users className="w-4 h-4" />
                        الإجمالي
                    </div>
                    <p className="text-3xl font-bold text-white">{summary.total}</p>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        تم الإرسال
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{summary.sent}</p>
                </div>
                <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <XCircle className="w-4 h-4" />
                        فشل
                    </div>
                    <p className="text-3xl font-bold text-red-400">{summary.failed}</p>
                </div>
                <div className="bg-yellow-950/30 border border-yellow-800/30 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <Clock className="w-4 h-4" />
                        قيد الانتظار
                    </div>
                    <p className="text-3xl font-bold text-yellow-400">{summary.pending}</p>
                </div>
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                        <Ban className="w-4 h-4" />
                        ملغية
                    </div>
                    <p className="text-3xl font-bold text-red-500">{summary.cancelled}</p>
                </div>
                <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <SkipForward className="w-4 h-4" />
                        متخطي
                    </div>
                    <p className="text-3xl font-bold text-zinc-400">{summary.skipped || 0}</p>
                </div>
            </div>

            {/* Progress Bar */}
            {summary.total > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>نسبة الإنجاز</span>
                        <span>{Math.round(((summary.sent + summary.failed + (summary.skipped || 0)) / summary.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                        {summary.sent > 0 && (
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${(summary.sent / summary.total) * 100}%` }}
                            />
                        )}
                        {summary.failed > 0 && (
                            <div
                                className="h-full bg-red-500 transition-all duration-500"
                                style={{ width: `${(summary.failed / summary.total) * 100}%` }}
                            />
                        )}
                        {(summary.skipped || 0) > 0 && (
                            <div
                                className="h-full bg-zinc-500 transition-all duration-500"
                                style={{ width: `${(summary.skipped / summary.total) * 100}%` }}
                            />
                        )}
                        {summary.cancelled > 0 && (
                            <div
                                className="h-full bg-red-800 transition-all duration-500"
                                style={{ width: `${(summary.cancelled / summary.total) * 100}%` }}
                            />
                        )}
                    </div>
                    <div className="flex gap-6 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            تم الإرسال
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            فشل
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-800" />
                            ملغية
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                            قيد الانتظار
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 lg:flex-row lg:items-center">
                <div className="relative w-full lg:flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="ابحث برقم الهاتف، نص الرسالة، أو سبب الفشل..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10 bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-500"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {["all", "sent", "failed", "pending", "cancelled"].map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className={statusFilter === s ? "w-auto" : "border-zinc-700 text-zinc-400 w-auto"}
                        >
                            {s === "all" ? "الكل" : statusConfig[s]?.label}
                        </Button>
                    ))}
                </div>
                <div className="text-sm text-zinc-400 lg:px-4 lg:border-r border-zinc-800">
                    {filteredRecipients.length} مستلم
                </div>
            </div>

            {/* Action Bar */}
            {selectedIds.size > 0 && (
                <div className="flex flex-col gap-3 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-700 rounded-xl p-3">
                        <span className="text-sm text-white font-medium whitespace-nowrap">{selectedIds.size} محدد</span>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-zinc-400 h-8 hover:text-white"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            <X className="w-3.5 h-3.5 ml-2" />
                            إلغاء التحديد
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 bg-zinc-900/80 border border-zinc-700 rounded-xl p-3">
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-2"
                            onClick={() => setResendDialogOpen(true)}
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                            إعادة إرسال
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                            onClick={() => setBlacklistDialogOpen(true)}
                        >
                            <Ban className="w-3.5 h-3.5" />
                            إضافة للقائمة السوداء
                        </Button>
                    </div>
                </div>
            )}

            {/* Recipients Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="w-12 px-0">
                                <div 
                                    className="flex w-full h-full items-center justify-center cursor-pointer p-2 hover:bg-zinc-800/50 transition-colors"
                                    onClick={toggleSelectAll}
                                >
                                    <Checkbox
                                        checked={sortedRecipients.length > 0 && selectedIds.size === sortedRecipients.length}
                                        onCheckedChange={toggleSelectAll}
                                        className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 pointer-events-none"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="text-right text-zinc-400 w-12">#</TableHead>
                            <TableHead
                                className="text-right text-zinc-400 w-44 cursor-pointer hover:text-zinc-200"
                                onClick={() => handleSort("phone_number")}
                            >
                                <div className="flex items-center gap-1">
                                    رقم المستلم
                                    {sortConfig.key === "phone_number" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right text-zinc-400 w-44 cursor-pointer hover:text-zinc-200"
                                onClick={() => handleSort("sender")}
                            >
                                <div className="flex items-center gap-1">
                                    المرسل
                                    {sortConfig.key === "sender" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right text-zinc-400 cursor-pointer hover:text-zinc-200"
                                onClick={() => handleSort("rendered_message")}
                            >
                                <div className="flex items-center gap-1">
                                    نص الرسالة
                                    {sortConfig.key === "rendered_message" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right text-zinc-400 w-36 cursor-pointer hover:text-zinc-200"
                                onClick={() => handleSort("status")}
                            >
                                <div className="flex items-center gap-1">
                                    الحالة
                                    {sortConfig.key === "status" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right text-zinc-400 w-44 cursor-pointer hover:text-zinc-200"
                                onClick={() => handleSort("updated_at")}
                            >
                                <div className="flex items-center gap-1">
                                    تاريخ الحالة
                                    {sortConfig.key === "updated_at" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right text-zinc-400 cursor-pointer hover:text-zinc-200"
                                onClick={() => handleSort("error_message")}
                            >
                                <div className="flex items-center gap-1">
                                    سبب الفشل
                                    {sortConfig.key === "error_message" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedRecipients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40 text-center text-zinc-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Inbox className="w-8 h-8 opacity-20" />
                                        لا توجد نتائج مطابقة
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedRecipients.map((recipient, idx) => {
                                const sc = statusConfig[recipient.status] || statusConfig.pending;
                                const StatusIcon = sc.icon;
                                return (
                                    <TableRow
                                        key={recipient.id}
                                        className={`border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer group ${selectedIds.has(recipient.id) ? 'bg-zinc-800/30' : ''}`}
                                    >
                                        <TableCell className="w-12 p-0">
                                            <div 
                                                onClick={(e) => toggleSelect(recipient.id, e)} 
                                                className="flex w-full h-full min-h-[48px] items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <Checkbox
                                                    checked={selectedIds.has(recipient.id)}
                                                    onCheckedChange={() => toggleSelect(recipient.id)}
                                                    className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 pointer-events-none"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-sm" onClick={() => setSelectedRecipient(recipient)}>
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell dir="ltr" className="text-right font-medium text-zinc-300" onClick={() => setSelectedRecipient(recipient)}>
                                            {recipient.phone_number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col w-max">
                                                <span className="text-zinc-300 text-sm">{recipient.sent_by_session_name || "—"}</span>
                                                <span className="text-zinc-500 text-xs" dir="ltr">{recipient.sent_by_number || ""}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <p className="truncate text-zinc-400 group-hover:text-zinc-300 transition-colors text-sm">
                                                {recipient.rendered_message}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${sc.color} flex items-center gap-1 w-fit`}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {sc.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-xs py-2 whitespace-nowrap" dir="ltr">
                                            {recipient.updated_at ? format(new Date(recipient.updated_at), "PP pp", { locale: ar }) : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-red-400/80 max-w-[200px]">
                                            <p className="truncate">{recipient.error_message || "—"}</p>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!selectedRecipient} onOpenChange={(open) => !open && setSelectedRecipient(null)}>
                <DialogContent className="">
                    <DialogHeader className="border-b border-zinc-800 px-6 py-5 space-y-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-primary">
                                <MessageSquareText className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-2xl font-semibold text-white">تفاصيل الرسالة</DialogTitle>
                        </div>
                        <div className="flex justify-start">
                            {selectedRecipient && (
                                <Badge variant="outline" className={`${statusConfig[selectedRecipient.status]?.color} px-3 py-1 text-sm`}>
                                    {statusConfig[selectedRecipient.status]?.label}
                                </Badge>
                            )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                                <p className="mb-1 text-xs font-medium text-zinc-500">المستلم</p>
                                <p dir="ltr" className="text-base font-semibold text-zinc-100 break-all">
                                    {selectedRecipient?.phone_number || "-"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                                <p className="mb-1 text-xs font-medium text-zinc-500">المرسل</p>
                                <p dir="ltr" className="text-base font-semibold text-zinc-100 break-words">
                                    {selectedRecipient?.sent_by_session_name ? `${selectedRecipient.sent_by_session_name} (${selectedRecipient.sent_by_number})` : "-"}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                <Clock className="h-4 w-4" />
                                <span>آخر تحديث</span>
                            </div>
                            <p dir="ltr" className="mt-1 text-sm text-zinc-200">
                                {selectedRecipient?.updated_at ? format(new Date(selectedRecipient.updated_at), "PP pp", { locale: ar }) : "-"}
                            </p>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-[100px]">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-200">نص الرسالة</h3>
                            <span className="text-xs text-zinc-500">{selectedRecipient?.rendered_message?.length || 0} chars</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl whitespace-pre-wrap break-words leading-8 text-zinc-200">
                            {selectedRecipient?.rendered_message}
                        </div>

                        {selectedRecipient?.error_message && (
                            <div className="bg-red-950/30 border border-red-800/30 p-4 rounded-2xl space-y-1">
                                <p className="text-red-400 text-sm font-medium">سبب الفشل</p>
                                <p className="text-red-300/80 text-sm leading-7 break-words">{selectedRecipient.error_message}</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Confirmation Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">إلغاء الحملة</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-zinc-400 text-sm">
                            هل أنت متأكد من إلغاء هذه الحملة؟ سيتم إيقاف جميعالرسائل المعلقة فوراً.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsCancelDialogOpen(false)}
                            className="border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                        >
                            تراجع
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelCampaign}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            نعم، قم بالإلغاء
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Resend Dialog */}
            <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">إعادة إرسال ({selectedIds.size} مستلم)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Individual Phones */}
                        {phones.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-white">الأرقام</Label>
                                <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 space-y-1">
                                    {phones.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/60 cursor-pointer">
                                            <Checkbox
                                                checked={resendPhoneIds.includes(p.id)}
                                                onCheckedChange={() => togglePhoneForResend(p.id)}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-white truncate">{p.name}</p>
                                                {p.number && <p className="text-xs text-zinc-500 font-mono" dir="ltr">{p.number}</p>}
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] shrink-0 ${
                                                p.status === 'WORKING' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                            }`}>
                                                {p.status === 'WORKING' ? 'متصل' : p.status || 'غير معروف'}
                                            </Badge>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Groups */}
                        {groups.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-white">مجموعات الأرقام</Label>
                                <div className="max-h-28 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 space-y-1">
                                    {groups.map(g => (
                                        <label key={g.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/60 cursor-pointer">
                                            <Checkbox
                                                checked={resendGroupIds.includes(g.id)}
                                                onCheckedChange={() => toggleGroupForResend(g.id)}
                                            />
                                            <span className="text-sm text-white">{g.name}</span>
                                            <Badge variant="secondary" className="text-[10px] mr-auto">{g.phones.length} رقم</Badge>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Schedule Date */}
                        <div className="space-y-2">
                            <Label className="text-white">وقت الإرسال</Label>
                            <Input
                                type="datetime-local"
                                value={resendDate}
                                onChange={e => setResendDate(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 text-white"
                                dir="ltr"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-2">
                        <Button variant="outline" onClick={() => setResendDialogOpen(false)} className="border-zinc-800 text-zinc-300">
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleResend}
                            disabled={resending || !resendDate || (resendPhoneIds.length === 0 && resendGroupIds.length === 0)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {resending && <Loader2 className="w-4 h-4 animate-spin" />}
                            إعادة إرسال
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Blacklist Dialog */}
            <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">إضافة للقائمة السوداء</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-zinc-400 text-sm">
                            هل أنت متأكد من إضافة <span className="text-white font-medium">{selectedIds.size}</span> رقم للقائمة السوداء؟
                            لن يتم إرسال أي رسائل لهذه الأرقام في المستقبل.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)} className="border-zinc-800 text-zinc-300">
                            تراجع
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkBlacklist}
                            disabled={blacklisting}
                            className="bg-red-500 hover:bg-red-600 text-white gap-2"
                        >
                            {blacklisting && <Loader2 className="w-4 h-4 animate-spin" />}
                            إضافة
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
