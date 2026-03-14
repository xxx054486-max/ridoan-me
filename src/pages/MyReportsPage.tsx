import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Report, CORRUPTION_TYPES } from "@/types";
import SkeletonCard from "@/components/SkeletonCard";
import ImageCarousel from "@/components/ImageCarousel";
import { MapPin, Edit2, Trash2, X, Plus, Link as LinkIcon, Save, Upload, Loader2, Send } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: "", corruptionType: "", evidenceLinks: [] as string[], evidenceBase64: [] as string[], newLink: "",
  });
  const [saving, setSaving] = useState(false);

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

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!confirm("রিপোর্টটি মুছে ফেলতে চান?")) return;
    await deleteDoc(doc(db, "reports", reportId));
    toast.success("রিপোর্ট মুছে ফেলা হয়েছে");
  };

  const startEdit = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    setEditingId(report.id);
    setEditForm({
      description: report.description,
      corruptionType: report.corruptionType,
      evidenceLinks: [...(report.evidenceLinks || [])],
      evidenceBase64: [...(report.evidenceBase64 || [])],
      newLink: "",
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 500000) { toast.error("ছবি ৫০০KB এর বেশি"); return; }
      const reader = new FileReader();
      reader.onload = () => setEditForm((prev) => ({ ...prev, evidenceBase64: [...prev.evidenceBase64, reader.result as string] }));
      reader.readAsDataURL(file);
    });
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "reports", editingId), {
        description: editForm.description,
        corruptionType: editForm.corruptionType,
        evidenceLinks: editForm.evidenceLinks,
        evidenceBase64: editForm.evidenceBase64,
        status: "pending",
        updatedAt: serverTimestamp(),
      });
      toast.success("রিপোর্ট আপডেট হয়েছে, পুনরায় যাচাইয়ের জন্য পেন্ডিং");
      setEditingId(null);
    } catch { toast.error("আপডেট ব্যর্থ"); }
    finally { setSaving(false); }
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
      </div>

      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-4 space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-semibold text-muted-foreground">কোনো রিপোর্ট পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-3 px-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {filtered.map((report) => {
            const date = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString("bn-BD") : "";
            const isEditing = editingId === report.id;
            const allImages = isEditing
              ? [...editForm.evidenceBase64, ...editForm.evidenceLinks.filter((u) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(u))]
              : [...(report.evidenceBase64 || []), ...(report.evidenceLinks || []).filter((u) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(u))];

            return (
              <div key={report.id} onClick={() => !isEditing && navigate(`/reports/${report.id}`)} className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border cursor-pointer active:scale-[0.98] transition-transform">
                <div className="p-3 pb-2 flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold">{report.corruptionType || "অন্যান্য"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
                    {!isEditing && <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{report.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[report.status] || ""}`}>{statusLabels[report.status]}</span>
                    {report.actionTaken && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">আপডেটেড</span>}
                  </div>
                </div>

                {isEditing ? (
                  <div className="px-3 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <select value={editForm.corruptionType} onChange={(e) => setEditForm({ ...editForm, corruptionType: e.target.value })} className="w-full border border-input rounded-lg px-2.5 py-2 text-xs bg-background">
                      {CORRUPTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full border border-input rounded-lg px-2.5 py-2 text-xs bg-background resize-none" />

                    {editForm.evidenceBase64.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editForm.evidenceBase64.map((img, i) => (
                          <div key={`b64-${i}`} className="relative w-16 h-16">
                            <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                            <button onClick={() => setEditForm((prev) => ({ ...prev, evidenceBase64: prev.evidenceBase64.filter((_, j) => j !== i) }))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"><X size={8} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-xs text-primary font-semibold cursor-pointer">
                      <Upload size={14} /> ছবি যোগ করুন
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>

                    {editForm.evidenceLinks.map((link, i) => (
                      <div key={`lnk-${i}`} className="flex items-center gap-2 text-xs bg-muted rounded-lg px-2.5 py-2">
                        <LinkIcon size={10} className="shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1">{link}</span>
                        <button onClick={() => setEditForm((prev) => ({ ...prev, evidenceLinks: prev.evidenceLinks.filter((_, j) => j !== i) }))} className="text-destructive shrink-0"><X size={12} /></button>
                      </div>
                    ))}

                    <div className="flex gap-1.5">
                      <input value={editForm.newLink} onChange={(e) => setEditForm({ ...editForm, newLink: e.target.value })} placeholder="নতুন লিংক" className="flex-1 border border-input rounded-lg px-2.5 py-2 text-xs bg-card outline-none focus:border-primary" onKeyDown={(e) => e.key === "Enter" && editForm.newLink.trim() && setEditForm({ ...editForm, evidenceLinks: [...editForm.evidenceLinks, editForm.newLink.trim()], newLink: "" })} />
                      <button onClick={() => editForm.newLink.trim() && setEditForm({ ...editForm, evidenceLinks: [...editForm.evidenceLinks, editForm.newLink.trim()], newLink: "" })} className="bg-primary text-primary-foreground px-2.5 rounded-lg"><Plus size={14} /></button>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center gap-1">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} সংরক্ষণ
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 py-2 rounded-xl bg-muted text-foreground text-[12px] font-semibold">বাতিল</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {allImages.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ImageCarousel images={allImages} disableFullscreen />
                      </div>
                    )}
                  </>
                )}

                {report.location?.address && (
                  <div className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground">
                    <MapPin size={12} className="text-primary shrink-0" />
                    <span className="truncate">{report.location.address}</span>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex gap-2 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => startEdit(e, report)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-foreground text-[13px] font-semibold">
                      <Edit2 size={14} /> সম্পাদনা
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setUpdateReportId(updateReportId === report.id ? null : report.id); setUpdateText(""); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-[13px] font-semibold">
                      <Plus size={14} /> আপডেট
                    </button>
                    <button onClick={(e) => handleDelete(e, report.id)} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-destructive/10 text-destructive text-[13px] font-semibold">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* User Update Input */}
                {updateReportId === report.id && !isEditing && (
                  <div className="px-3 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="বর্তমান অবস্থা বা আপডেট লিখুন..."
                      rows={3}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSubmitUpdate(report.id)} disabled={submittingUpdate || !updateText.trim()} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                        {submittingUpdate ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} আপডেট জমা দিন
                      </button>
                      <button onClick={() => { setUpdateReportId(null); setUpdateText(""); }} className="px-4 py-2 rounded-xl bg-muted text-foreground text-[12px] font-semibold">বাতিল</button>
                    </div>
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
