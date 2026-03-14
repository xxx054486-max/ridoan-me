import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Share2, CheckCircle, AlertTriangle, HelpCircle, MessageCircle, User, Info } from "lucide-react";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Report } from "@/types";
import { getNickname } from "@/lib/nicknames";
import ImageCarousel from "@/components/ImageCarousel";
import LinkPreview from "@/components/LinkPreview";
import LinkifyText from "@/components/LinkifyText";

interface ReportCardProps {
  report: Report;
  showStatus?: boolean;
}

export default function ReportCard({ report, showStatus }: ReportCardProps) {
  const navigate = useNavigate();
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "comments"), where("reportId", "==", report.id));
    getCountFromServer(q).then((snap) => setCommentCount(snap.data().count)).catch(() => {});
  }, [report.id]);

  const statusStyles: Record<string, string> = {
    pending: "bg-[hsl(45,93%,90%)] text-[hsl(30,100%,35%)]",
    approved: "bg-[hsl(142,71%,90%)] text-[hsl(142,71%,30%)]",
    rejected: "bg-[hsl(0,84%,92%)] text-[hsl(0,84%,35%)]",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };

  const date = report.createdAt?.toDate
    ? report.createdAt.toDate().toLocaleDateString("bn-BD")
    : "অজানা তারিখ";

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/reports/${report.id}`;
    if (navigator.share) {
      navigator.share({ title: "দুর্নীতি রিপোর্ট", url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const allImages = [
    ...(report.evidenceBase64 || []),
    ...(report.evidenceLinks || []).filter((url) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)),
  ];

  const videoLinks = (report.evidenceLinks || []).filter((url) =>
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url)
  );

  const otherLinks = (report.evidenceLinks || []).filter(
    (url) =>
      !/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url) &&
      !/\.(mp4|webm|ogg)(\?.*)?$/i.test(url) &&
      !/(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url)
  );

  return (
    <div
      onClick={() => navigate(`/reports/${report.id}`)}
      className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Card Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-[38px] h-[38px] rounded-full bg-accent flex items-center justify-center shrink-0">
          <User size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold">{getNickname(report.userId)}</p>
          <p className="text-[11px] text-muted-foreground">{date}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
            {report.corruptionType}
          </span>
          {showStatus && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[report.status]}`}>
              {statusLabels[report.status]}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-3 pb-2">
        <LinkifyText text={report.description} className="text-[14px] leading-relaxed line-clamp-3" />
      </div>

      {/* Admin Action Note */}
      {report.actionTaken && (
        <div className="mx-3 mb-2 bg-accent rounded-lg px-3 py-2 flex items-start gap-2">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[12px] text-accent-foreground"><span className="font-semibold">আপডেট:</span> {report.actionTaken}</p>
        </div>
      )}

      {/* Approved User Updates */}
      {report.userUpdates && report.userUpdates.filter((u) => u.status === "approved").length > 0 && (
        <div className="mx-3 mb-2 space-y-1">
          {report.userUpdates.filter((u) => u.status === "approved").map((upd) => (
            <div key={upd.id} className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 flex items-start gap-2">
              <Info size={12} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground">{upd.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Evidence - clicking navigates to detail page */}
      {(allImages.length > 0 || videoLinks.length > 0) && (
        <div onClick={(e) => e.stopPropagation()}>
          <ImageCarousel
            images={allImages}
            videoUrls={videoLinks}
            disableFullscreen
            onMediaClick={() => navigate(`/reports/${report.id}`)}
          />
        </div>
      )}

      {/* Other links */}
      {otherLinks.length > 0 && (
        <div onClick={(e) => e.stopPropagation()} className="px-3 pb-2 space-y-1">
          {otherLinks.slice(0, 2).map((link, i) => (
            <LinkPreview key={i} url={link} />
          ))}
        </div>
      )}

      {/* Location */}
      <div className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-muted-foreground">
        <MapPin size={14} className="text-primary shrink-0" />
        <span className="truncate">{report.location?.address || "অজানা অবস্থান"}</span>
      </div>

      {/* Vote Bar + Actions */}
      <div className="flex items-center border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 flex-1">
          <span className="flex items-center gap-1 text-[11px] text-vote-true font-medium">
            <CheckCircle size={14} /> {report.votes?.true || 0}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-vote-suspicious font-medium">
            <AlertTriangle size={14} /> {report.votes?.suspicious || 0}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-vote-evidence font-medium">
            <HelpCircle size={14} /> {report.votes?.needEvidence || 0}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/reports/${report.id}`); }}
          className="flex items-center gap-1 px-3 py-2 text-[12px] text-muted-foreground font-medium border-l border-border"
        >
          <MessageCircle size={14} />
          {commentCount > 0 ? commentCount : ""}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 px-3 py-2 text-[12px] text-muted-foreground font-medium border-l border-border"
        >
          <Share2 size={14} />
        </button>
      </div>
    </div>
  );
}
