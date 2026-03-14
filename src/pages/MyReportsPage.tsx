import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Report, CORRUPTION_TYPES } from "@/types";
import { MapPin, Edit2, Trash2, X, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const STATUS_TABS = [
  { key: "all", label: "সব" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

const statusLabels: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const statusStyles: Record<string, string> = {
  pending: "bg-[hsl(45,93%,90%)] text-[hsl(30,100%,35%)]",
  approved: "bg-[hsl(142,71%,90%)] text-[hsl(142,71%,30%)]",
  rejected: "bg-[hsl(0,84%,92%)] text-[hsl(0,84%,35%)]",
};

export default function MyReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // User update state
  const [updateReportId, setUpdateReportId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, "reports"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => { setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report))); setLoading(false); });
    return unsub;
  }, [user]);

  const handleDelete = async (reportId: string) => {
    if (!confirm("রিপোর্টটি মুছে ফেলতে চান?")) return;
    await deleteDoc(doc(db, "reports", reportId));
    toast.success("রিপোর্ট মুছে ফেলা হয়েছে");
  };

  const handleSubmitUpdate = async (reportId: string) => {
    if (!updateText.trim() || !user) return;
    setSubmittingUpdate(true);
    try {
      const newUpdate = {
        id: Date.now().toString(),
        text: updateText.trim(),
        status: "pending",
        createdAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "reports", reportId), {
        userUpdates: arrayUnion(newUpdate),
      });
      toast.success("আপডেট জমা হয়েছে, অ্যাডমিন যাচাই করার পর দেখাবে");
      setUpdateText("");
      setUpdateReportId(null);
    } catch { toast.error("আপডেট জমা দিতে সমস্যা হয়েছে"); }
    finally { setSubmittingUpdate(false); }
  };

  const filtered = reports.filter((r) => activeTab === "all" || r.status === activeTab);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-lg font-bold mb-2">আমার রিপোর্ট</p>
        <p className="text-sm text-muted-foreground mb-6">আপনার রিপোর্ট দেখতে লগইন করুন</p>
        <button onClick={() => navigate("/login")} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-base">Login</button>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-lg font-bold">আমার রিপোর্ট</h2>
        <span className="text-xs text-muted-foreground">{reports.length}টি রিপোর্ট</span>
      </div>

      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-semibold text-muted-foreground">কোনো রিপোর্ট পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {filtered.map((report) => {
            const date = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString("bn-BD") : "";
            const isExpanded = expandedId === report.id;

            return (
              <div key={report.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Compact list row */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold truncate">{report.corruptionType}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${statusStyles[report.status]}`}>
                        {statusLabels[report.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{report.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{date}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2.5 space-y-2">
                    <p className="text-[12px] leading-relaxed">{report.description}</p>

                    {report.location?.address && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin size={12} className="text-primary shrink-0" />
                        <span className="truncate">{report.location.address}</span>
                      </div>
                    )}

                    {report.actionTaken && (
                      <div className="bg-accent rounded-lg px-2.5 py-1.5 text-[11px] text-accent-foreground">
                        <span className="font-semibold">আপডেট:</span> {report.actionTaken}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setUpdateReportId(updateReportId === report.id ? null : report.id); setUpdateText(""); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-[12px] font-semibold"
                      >
                        <Edit2 size={13} /> আপডেট যুক্ত করুন
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-[12px] font-semibold"
                      >
                        <Trash2 size={13} /> মুছুন
                      </button>
                    </div>

                    {/* User Update Input */}
                    {updateReportId === report.id && (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={updateText}
                          onChange={(e) => setUpdateText(e.target.value)}
                          placeholder="বর্তমান অবস্থা বা আপডেট লিখুন..."
                          rows={2}
                          className="w-full border border-input rounded-lg px-3 py-2 text-[12px] bg-background resize-none outline-none focus:border-primary"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSubmitUpdate(report.id)} disabled={submittingUpdate || !updateText.trim()} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                            {submittingUpdate ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} জমা দিন
                          </button>
                          <button onClick={() => { setUpdateReportId(null); setUpdateText(""); }} className="px-4 py-2 rounded-lg bg-muted text-foreground text-[12px] font-semibold">বাতিল</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
