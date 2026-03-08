"use client";

import { useState, useEffect } from "react";
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

    useEffect(() => {
        if (campaignId) fetchReport();
    }, [campaignId]);

    const fetchReport = async () => {
        try {
            const { data } = await api.get(`/api/campaigns/${campaignId}/report`);
            setReport(data);
        } catch (error) {
            console.error("Failed to fetch report", error);
        } finally {
            setLoading(false);
        }
    };

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
        <div className="p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/campaigns")}
                        className="text-zinc-400 hover:text-white mb-2 -mr-3"
                    >
                        <ArrowRight className="w-4 h-4 ml-1" />
                        العودة للحملات
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        {campaign.name}
                    </h1>
                    {campaign.description && (
                        <p className="text-zinc-400 text-sm">{campaign.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${getCampaignStatusConfig(campaign.status).color}`}>
                        {getCampaignStatusConfig(campaign.status).label}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchReport} className="border-zinc-700 text-zinc-300">
                        تحديث
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                        <Download className="w-4 h-4 ml-2" />
                        تصدير التقرير
                    </Button>
                    {campaign.status === "scheduled" && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsCancelDialogOpen(true)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            <Ban className="w-4 h-4 ml-2" />
                            إلغاء الحملة
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            </div>

            {/* Progress Bar */}
            {summary.total > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>نسبة الإنجاز</span>
                        <span>{Math.round(((summary.sent + summary.failed) / summary.total) * 100)}%</span>
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
            <div className="flex gap-4 items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="ابحث برقم الهاتف، نص الرسالة، أو سبب الفشل..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-10 bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-500"
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "sent", "failed", "pending", "cancelled"].map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className={statusFilter === s ? "" : "border-zinc-700 text-zinc-400"}
                        >
                            {s === "all" ? "الكل" : statusConfig[s]?.label}
                        </Button>
                    ))}
                </div>
                <div className="text-sm text-zinc-400 px-4 border-r border-zinc-800">
                    {filteredRecipients.length} مستلم
                </div>
            </div>

            {/* Recipients Table */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-950/50">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
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
                                <TableCell colSpan={7} className="h-40 text-center text-zinc-500">
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
                                        onClick={() => setSelectedRecipient(recipient)}
                                        className="border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer group"
                                    >
                                        <TableCell className="text-zinc-500 text-sm">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell dir="ltr" className="text-right font-medium text-zinc-300">
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
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4 space-y-3">
                        <DialogTitle className="flex items-center gap-3">
                            <MessageSquareText className="w-5 h-5 text-primary" />
                            <span>تفاصيل الرسالة</span>
                        </DialogTitle>
                        <div className="text-sm text-zinc-400 flex flex-wrap gap-3 pt-1">
                            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                                <span className="text-zinc-500">المستلم:</span>
                                <span dir="ltr" className="font-medium text-zinc-200">
                                    {selectedRecipient?.phone_number}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                                <span className="text-zinc-500">المرسل:</span>
                                <span dir="ltr" className="font-medium text-zinc-200">
                                    {selectedRecipient?.sent_by_session_name ? `${selectedRecipient.sent_by_session_name} (${selectedRecipient.sent_by_number})` : "—"}
                                </span>
                            </div>
                            {selectedRecipient?.updated_at && (
                                <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                    <span dir="ltr" className="font-medium text-zinc-300 text-xs">
                                        {format(new Date(selectedRecipient.updated_at), "PP pp", { locale: ar })}
                                    </span>
                                </div>
                            )}
                            {selectedRecipient && (
                                <Badge variant="outline" className={`${statusConfig[selectedRecipient.status]?.color} flex items-center gap-1`}>
                                    {statusConfig[selectedRecipient.status]?.label}
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[100px]">
                        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl whitespace-pre-wrap leading-relaxed text-zinc-200 rounded-tl-sm mr-12">
                            {selectedRecipient?.rendered_message}
                        </div>

                        {selectedRecipient?.error_message && (
                            <div className="bg-red-950/30 border border-red-800/30 p-4 rounded-xl space-y-1">
                                <p className="text-red-400 text-sm font-medium">سبب الفشل:</p>
                                <p className="text-red-300/80 text-sm">{selectedRecipient.error_message}</p>
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
        </div>
    );
}
