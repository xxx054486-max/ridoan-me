import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Report, UserProfile } from "@/types";
import { CORRUPTION_TYPES } from "@/types";
import {
  CheckCircle, XCircle, Trash2, Edit2, Users, FileText, Ban, X, Save, Plus, Loader2, Download, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "reports" | "users";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [actionInput, setActionInput] = useState<{ id: string; text: string } | null>(null);
  const [editForm, setEditForm] = useState({
    description: "", corruptionType: "", address: "", evidenceLinks: [] as string[], removeBase64Indices: [] as number[], newLink: "",
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  // Mobile-friendly: show image actions only when edit mode is on for a report
  const [imageEditReportId, setImageEditReportId] = useState<string | null>(null);

  useEffect(() => {
    const q1 = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const q2 = query(collection(db, "users"));
    const unsub1 = onSnapshot(q1, (s) => { setReports(s.docs.map((d) => ({ id: d.id, ...d.data() } as Report))); setLoading(false); });
    const unsub2 = onSnapshot(q2, (s) => { setUsers(s.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile))); });
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try { await signIn(loginEmail, loginPassword); } catch (err: any) { toast.error(err.message || "লগইন ব্যর্থ"); } finally { setLoginLoading(false); }
  };

  if (authLoading) return <div className="fixed inset-0 flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  if (!user || !isAdmin) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 h-14 bg-topbar text-topbar-foreground shrink-0">
          <h1 className="text-sm font-bold">Admin Login</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
            <p className="text-center text-sm text-muted-foreground">অ্যাডমিন অ্যাক্সেস প্রয়োজন</p>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Admin Email" className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-card" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-card" />
            <button type="submit" disabled={loginLoading} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
              {loginLoading && <Loader2 size={16} className="animate-spin" />} Login
            </button>
            {user && !isAdmin && <p className="text-xs text-destructive text-center">এই অ্যাকাউন্টে অ্যাডমিন অ্যাক্সেস নেই</p>}
          </form>
        </div>
      </div>
    );
  }

  const approveReport = async (id: string) => { await updateDoc(doc(db, "reports", id), { status: "approved", updatedAt: serverTimestamp() }); toast.success("রিপোর্ট অনুমোদিত"); };
  const rejectReport = async (id: string) => { await updateDoc(doc(db, "reports", id), { status: "rejected", updatedAt: serverTimestamp() }); toast.success("রিপোর্ট প্রত্যাখ্যাত"); };
  const deleteReport = async (id: string) => { if (!confirm("রিপোর্টটি মুছে ফেলতে চান?")) return; await deleteDoc(doc(db, "reports", id)); toast.success("রিপোর্ট মুছে ফেলা হয়েছে"); };

  const downloadBase64Image = (base64: string, index: number) => {
    const link = document.createElement("a");
    link.href = base64;
    link.download = `evidence-${index + 1}.png`;
    link.click();
  };

  const deleteBase64Image = async (report: Report, index: number) => {
    if (!confirm("ছবিটি মুছে ফেলতে চান?")) return;
    const updated = [...(report.evidenceBase64 || [])];
    updated.splice(index, 1);
    await updateDoc(doc(db, "reports", report.id), { evidenceBase64: updated });
    toast.success("ছবি মুছে ফেলা হয়েছে");
  };

  const openEditReport = (report: Report) => {
    setEditingReport(report);
    setEditForm({ description: report.description, corruptionType: report.corruptionType, address: report.location?.address || "", evidenceLinks: [...(report.evidenceLinks || [])], removeBase64Indices: [], newLink: "" });
  };

  const saveEditReport = async () => {
    if (!editingReport) return;
    const updatedBase64 = editingReport.evidenceBase64?.filter((_, i) => !editForm.removeBase64Indices.includes(i)) || [];
    await updateDoc(doc(db, "reports", editingReport.id), { description: editForm.description, corruptionType: editForm.corruptionType, "location.address": editForm.address, evidenceBase64: updatedBase64, evidenceLinks: editForm.evidenceLinks, updatedAt: serverTimestamp() });
    setEditingReport(null);
    toast.success("রিপোর্ট আপডেট হয়েছে");
  };

  const saveActionTaken = async () => {
    if (!actionInput) return;
    await updateDoc(doc(db, "reports", actionInput.id), { actionTaken: actionInput.text, updatedAt: serverTimestamp() });
    setActionInput(null);
    toast.success("অবস্থা আপডেট হয়েছে");
  };

  const disableUser = async (uid: string, disabled: boolean) => {
    if (uid === user.uid) return toast.error("আপনি নিজেকে নিষ্ক্রিয় করতে পারবেন না");
    await updateDoc(doc(db, "users", uid), { disabled });
    toast.success(disabled ? "ব্যবহারকারী নিষ্ক্রিয়" : "ব্যবহারকারী সক্রিয়");
  };

  const deleteUser = async (uid: string) => {
    if (uid === user.uid) return toast.error("আপনি নিজেকে মুছতে পারবেন না");
    if (!confirm("ব্যবহারকারী মুছে ফেলতে চান?")) return;
    await deleteDoc(doc(db, "users", uid));
    toast.success("ব্যবহারকারী মুছে ফেলা হয়েছে");
  };

  const statusColors: Record<string, string> = { pending: "bg-badge-pending", approved: "bg-badge-approved", rejected: "bg-badge-rejected" };
  const tabs_list: { key: Tab; label: string; icon: any }[] = [
    { key: "reports", label: "রিপোর্ট", icon: FileText },
    { key: "users", label: "ব্যবহারকারী", icon: Users },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 h-14 bg-topbar text-topbar-foreground shrink-0">
        <h1 className="text-sm font-bold">অ্যাডমিন প্যানেল</h1>
      </header>

      <div className="flex border-b border-border bg-card shrink-0">
        {tabs_list.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : tab === "reports" ? (
          reports.map((r) => (
            <div key={r.id} className="bg-card rounded-lg p-3 border border-border space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{r.corruptionType}</span>
                <span className={`text-[10px] font-semibold text-primary-foreground px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{r.status}</span>
              </div>
              <p className="text-xs line-clamp-2">{r.description}</p>

              {/* Base64 images - toggle edit mode for mobile */}
              {r.evidenceBase64 && r.evidenceBase64.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">ছবি ({r.evidenceBase64.length})</p>
                    <button
                      onClick={() => setImageEditReportId(imageEditReportId === r.id ? null : r.id)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${imageEditReportId === r.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      <Edit2 size={10} className="inline mr-1" />
                      {imageEditReportId === r.id ? "বন্ধ করুন" : "সম্পাদনা"}
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {r.evidenceBase64.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt="" className="w-16 h-16 object-cover rounded" />
                        {imageEditReportId === r.id && (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => downloadBase64Image(img, i)} className="flex-1 bg-primary text-primary-foreground rounded py-1 text-[9px] font-semibold flex items-center justify-center gap-0.5">
                              <Download size={10} /> ডাউনলোড
                            </button>
                            <button onClick={() => deleteBase64Image(r, i)} className="flex-1 bg-destructive text-destructive-foreground rounded py-1 text-[9px] font-semibold flex items-center justify-center gap-0.5">
                              <Trash2 size={10} /> মুছুন
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.actionTaken && <p className="text-[11px] text-primary bg-accent rounded px-2 py-1">📋 {r.actionTaken}</p>}

              {/* Pending user updates */}
              {r.userUpdates && r.userUpdates.filter((u: any) => u.status === "pending").length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-vote-suspicious">📝 পেন্ডিং ইউজার আপডেট:</p>
                  {r.userUpdates.filter((u: any) => u.status === "pending").map((upd: any) => (
                    <div key={upd.id} className="bg-muted rounded px-2 py-1.5 flex items-start gap-2">
                      <p className="text-[11px] flex-1">{upd.text}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={async () => {
                          const updated = r.userUpdates!.map((u: any) => u.id === upd.id ? { ...u, status: "approved" } : u);
                          await updateDoc(doc(db, "reports", r.id), { userUpdates: updated });
                          toast.success("আপডেট অনুমোদিত");
                        }} className="bg-badge-approved text-primary-foreground px-1.5 py-0.5 rounded text-[9px]"><CheckCircle size={10} /></button>
                        <button onClick={async () => {
                          const updated = r.userUpdates!.map((u: any) => u.id === upd.id ? { ...u, status: "rejected" } : u);
                          await updateDoc(doc(db, "reports", r.id), { userUpdates: updated });
                          toast.success("আপডেট প্রত্যাখ্যাত");
                        }} className="bg-badge-rejected text-primary-foreground px-1.5 py-0.5 rounded text-[9px]"><XCircle size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5 flex-wrap">
                {r.status !== "approved" && (
                  <button onClick={() => approveReport(r.id)} className="flex items-center gap-1 text-[10px] bg-badge-approved text-primary-foreground px-2 py-1 rounded"><CheckCircle size={10} /> অনুমোদন</button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => rejectReport(r.id)} className="flex items-center gap-1 text-[10px] bg-badge-rejected text-primary-foreground px-2 py-1 rounded"><XCircle size={10} /> প্রত্যাখ্যান</button>
                )}
                <button onClick={() => openEditReport(r)} className="flex items-center gap-1 text-[10px] bg-secondary text-secondary-foreground px-2 py-1 rounded"><Edit2 size={10} /> সম্পাদনা</button>
                <button onClick={() => setActionInput({ id: r.id, text: r.actionTaken || "" })} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded"><MessageSquare size={10} /> অবস্থা</button>
                <button onClick={() => deleteReport(r.id)} className="flex items-center gap-1 text-[10px] bg-destructive text-destructive-foreground px-2 py-1 rounded"><Trash2 size={10} /> মুছুন</button>
              </div>
            </div>
          ))
        ) : (
          users.map((u) => (
            <div key={u.uid} className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium">{u.email}</p>
                <p className="text-[10px] text-muted-foreground">{u.role} {u.disabled ? "• নিষ্ক্রিয়" : ""} {u.uid === user.uid ? "• (আপনি)" : ""}</p>
              </div>
              {u.uid !== user.uid && (
                <>
                  <button onClick={() => disableUser(u.uid, !u.disabled)} className="p-1.5 text-vote-suspicious"><Ban size={14} /></button>
                  <button onClick={() => deleteUser(u.uid)} className="p-1.5 text-destructive"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action taken modal */}
      {actionInput && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">রিপোর্টের অবস্থা আপডেট</h3>
              <button onClick={() => setActionInput(null)}><X size={20} /></button>
            </div>
            <textarea value={actionInput.text} onChange={(e) => setActionInput({ ...actionInput, text: e.target.value })} rows={3} placeholder="কি একশন নেওয়া হয়েছে লিখুন..." className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none" />
            <button onClick={saveActionTaken} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"><Save size={14} /> সংরক্ষণ</button>
          </div>
        </div>
      )}

      {/* Edit report modal */}
      {editingReport && (
        <div className="fixed inset-0 bg-foreground/50 z-50 flex items-end">
          <div className="bg-card w-full max-h-[85vh] rounded-t-2xl overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">রিপোর্ট সম্পাদনা</h3>
              <button onClick={() => setEditingReport(null)}><X size={20} /></button>
            </div>
            <select value={editForm.corruptionType} onChange={(e) => setEditForm({ ...editForm, corruptionType: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
              {CORRUPTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none" />
            <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="ঠিকানা" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background" />

            {editingReport.evidenceBase64?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">বেস৬৪ ছবি</p>
                <div className="flex gap-2 flex-wrap">
                  {editingReport.evidenceBase64.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-16 h-16 object-cover rounded pointer-events-none" />
                      <button onClick={() => setEditForm({ ...editForm, removeBase64Indices: editForm.removeBase64Indices.includes(i) ? editForm.removeBase64Indices.filter((x) => x !== i) : [...editForm.removeBase64Indices, i] })} className={`absolute inset-0 flex items-center justify-center rounded ${editForm.removeBase64Indices.includes(i) ? "bg-destructive/60" : ""}`}>
                        {editForm.removeBase64Indices.includes(i) && <X size={16} className="text-primary-foreground" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">লিংক</p>
              {editForm.evidenceLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-1 mb-1">
                  <input value={link} onChange={(e) => { const n = [...editForm.evidenceLinks]; n[i] = e.target.value; setEditForm({ ...editForm, evidenceLinks: n }); }} className="flex-1 border border-input rounded px-2 py-1 text-xs bg-background" />
                  <button onClick={() => setEditForm({ ...editForm, evidenceLinks: editForm.evidenceLinks.filter((_, j) => j !== i) })} className="text-destructive"><X size={12} /></button>
                </div>
              ))}
              <div className="flex gap-1">
                <input value={editForm.newLink} onChange={(e) => setEditForm({ ...editForm, newLink: e.target.value })} placeholder="নতুন লিংক" className="flex-1 border border-input rounded px-2 py-1 text-xs bg-background" />
                <button onClick={() => { if (editForm.newLink.trim()) setEditForm({ ...editForm, evidenceLinks: [...editForm.evidenceLinks, editForm.newLink.trim()], newLink: "" }); }} className="bg-secondary text-secondary-foreground px-2 rounded"><Plus size={12} /></button>
              </div>
            </div>

            <button onClick={saveEditReport} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"><Save size={14} /> সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
}
