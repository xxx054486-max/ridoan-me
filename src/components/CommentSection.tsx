import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Comment } from "@/types";
import { getNickname } from "@/lib/nicknames";
import { Send, X, User } from "lucide-react";
import { toast } from "sonner";

interface CommentSectionProps {
  reportId: string;
}

export default function CommentSection({ reportId }: CommentSectionProps) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("reportId", "==", reportId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
      data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setComments(data);
      setLoading(false);
    });
    return unsub;
  }, [reportId]);

  const handleSubmit = async () => {
    if (!text.trim() || !user) {
      if (!user) toast.error("মন্তব্য করতে লগইন করুন");
      return;
    }
    await addDoc(collection(db, "comments"), {
      reportId,
      userId: user.uid,
      text: text.trim(),
      parentId: replyTo,
      createdAt: serverTimestamp(),
    });
    setText("");
    setReplyTo(null);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "comments", id));
    toast.success("Comment deleted");
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, "comments", id), { text: editText.trim() });
    setEditingId(null);
    setEditText("");
    toast.success("Comment updated");
  };

  const rootComments = comments.filter((c) => !c.parentId);

  const renderComment = (comment: Comment, depth: number) => {
    const replies = comments.filter((c) => c.parentId === comment.id);
    const canModify = user?.uid === comment.userId || isAdmin;
    const isOwnComment = user?.uid === comment.userId;
    const date = comment.createdAt?.toDate
      ? comment.createdAt.toDate().toLocaleDateString("bn-BD")
      : "";
    const nickname = getNickname(comment.userId);

    return (
      <div key={comment.id} className={depth > 0 ? "pl-10 mt-1.5" : ""}>
        <div className="flex gap-2 items-start">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <User size={14} className="text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            {editingId === comment.id ? (
              <div className="flex gap-1.5 items-center">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 bg-muted border border-primary rounded-xl px-3 py-2 text-[13px] outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleEdit(comment.id)}
                />
                <button onClick={() => handleEdit(comment.id)} className="text-primary p-1.5">
                  <Send size={14} />
                </button>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground p-1.5">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full">
                <p className="text-[12px] font-bold text-foreground">{nickname}</p>
                <p className="text-[13px] leading-relaxed break-words">{comment.text}</p>
              </div>
            )}

            {editingId !== comment.id && (
              <div className="flex items-center gap-3 mt-1 px-1">
                <span className="text-[11px] text-muted-foreground">{date}</span>
                {/* Only show Reply if user is logged in AND it's not their own comment */}
                {user && !isOwnComment && (
                  <button
                    onClick={() => {
                      setReplyTo(comment.id);
                      setText("");
                    }}
                    className="text-[11px] font-bold text-muted-foreground hover:text-primary"
                  >
                    Reply
                  </button>
                )}
                {canModify && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditText(comment.text);
                      }}
                      className="text-[11px] font-bold text-muted-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[11px] font-bold text-destructive"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}

            {replyTo === comment.id && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-muted border-none rounded-full px-3 py-2 text-[13px] outline-none focus:bg-border/60"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <Send size={14} className="text-primary-foreground" />
                </button>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-muted-foreground p-1"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {replies.length > 0 && (
          <div className="border-l-2 border-primary/20 ml-4 mt-1">
            {replies.map((r) => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-10 w-3/4 bg-muted rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">Comments ({comments.length})</p>

      <div className="space-y-3">
        {rootComments.length > 0 ? (
          rootComments.map((c) => renderComment(c, 0))
        ) : (
          <p className="text-[13px] text-muted-foreground">No comments yet.</p>
        )}
      </div>

      {!replyTo && (
        <div className="flex items-center gap-2 mt-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User size={14} className="text-muted-foreground" />
          </div>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? "Write a comment..." : "Login to comment"}
            disabled={!user}
            className="flex-1 bg-muted border-none rounded-full px-4 py-2.5 text-[13px] outline-none focus:bg-border/60 disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={!user || !text.trim()}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Send size={16} className="text-primary-foreground" />
          </button>
        </div>
      )}

      {!user && (
        <div className="bg-accent rounded-xl p-3 flex items-center gap-3">
          <p className="text-[13px] text-accent-foreground font-medium flex-1">
            Login to comment
          </p>
          <a
            href="/login"
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-[13px] font-bold whitespace-nowrap"
          >
            Login
          </a>
        </div>
      )}
    </div>
  );
}
