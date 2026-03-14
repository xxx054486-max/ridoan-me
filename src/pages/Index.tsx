import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Report, CORRUPTION_TYPES } from "@/types";
import ReportCard from "@/components/ReportCard";
import SkeletonCard from "@/components/SkeletonCard";
import { Clock, TrendingUp, Navigation } from "lucide-react";
import { toast } from "sonner";

type SortMode = "latest" | "trending" | "nearby";

export default function Index() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "reports"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReports(data);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const handleNearby = () => {
    if (sortMode === "nearby") {
      setSortMode("latest");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setSortMode("nearby");
        toast.success("আপনার কাছের রিপোর্ট দেখাচ্ছে");
      },
      () => toast.error("লোকেশন পাওয়া যায়নি")
    );
  };

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Count today's reports
  const todayCount = reports.filter((r) => {
    if (!r.createdAt?.toDate) return false;
    const reportDate = r.createdAt.toDate();
    const today = new Date();
    return (
      reportDate.getDate() === today.getDate() &&
      reportDate.getMonth() === today.getMonth() &&
      reportDate.getFullYear() === today.getFullYear()
    );
  }).length;

  let filtered = [...reports];

  if (filterType !== "all") {
    filtered = filtered.filter((r) => r.corruptionType === filterType);
  }

  if (sortMode === "nearby" && userLat && userLng) {
    filtered = filtered
      .filter((r) => r.location && getDistance(userLat, userLng, r.location.lat, r.location.lng) < 50)
      .sort((a, b) =>
        getDistance(userLat, userLng, a.location.lat, a.location.lng) -
        getDistance(userLat, userLng, b.location.lat, b.location.lng)
      );
  } else if (sortMode === "trending") {
    filtered.sort((a, b) => {
      const aTotal = (a.votes?.true || 0) + (a.votes?.suspicious || 0) + (a.votes?.needEvidence || 0);
      const bTotal = (b.votes?.true || 0) + (b.votes?.suspicious || 0) + (b.votes?.needEvidence || 0);
      return bTotal - aTotal;
    });
  }

  const sortButtons: { mode: SortMode; label: string; icon: typeof Clock; action?: () => void }[] = [
    { mode: "latest", label: "লেটেস্ট", icon: Clock },
    { mode: "trending", label: "ট্রেন্ডিং", icon: TrendingUp },
    { mode: "nearby", label: "নিকটবর্তী", icon: Navigation, action: handleNearby },
  ];

  return (
    <div className="pb-2">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        {/* Category dropdown + sort buttons */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 border border-input rounded-xl px-3 py-2 text-[12px] bg-background font-medium outline-none min-w-0"
          >
            <option value="all">সব ধরন</option>
            {CORRUPTION_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {sortButtons.map((btn) => (
            <button
              key={btn.mode}
              onClick={btn.action || (() => setSortMode(btn.mode))}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-2 rounded-xl font-semibold whitespace-nowrap shrink-0 transition-colors ${
                sortMode === btn.mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <btn.icon size={12} />
              {btn.label}
            </button>
          ))}
        </div>

        {/* Today's report count */}
        <div className="flex items-center gap-4 px-3 pb-2">
          <p className="text-[12px] font-semibold text-muted-foreground">
            আজকের রিপোর্ট: <span className="text-primary font-bold">{todayCount}</span>
          </p>
          <p className="text-[12px] font-semibold text-muted-foreground">
            মোট রিপোর্ট: <span className="text-primary font-bold">{reports.length}</span>
          </p>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">কোনো রিপোর্ট পাওয়া যায়নি</p>
            <p className="text-sm mt-1">প্রথম রিপোর্ট জমা দিন!</p>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
