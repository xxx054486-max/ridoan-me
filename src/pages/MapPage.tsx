import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Report, CORRUPTION_TYPES } from "@/types";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [locating, setLocating] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    
    const map = L.map(mapRef.current, {
      center: [23.8103, 90.4125],
      zoom: 7,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    // Click on map to add report at that location
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      navigate(`/report?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
    });

    leafletMap.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [navigate]);

  // Load reports
  useEffect(() => {
    const q = query(collection(db, "reports"), where("status", "==", "approved"));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report)));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Update markers when reports or filter changes
  useEffect(() => {
    if (!leafletMap.current) return;
    
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filtered = reports.filter((r) => {
      if (filterType === "all") return true;
      return r.corruptionType === filterType;
    });

    filtered.forEach((report) => {
      if (!report.location?.lat || !report.location?.lng) return;
      
      const marker = L.circleMarker([report.location.lat, report.location.lng], {
        radius: 10,
        color: "hsl(0, 72%, 51%)",
        fillColor: "hsl(0, 72%, 51%)",
        fillOpacity: 0.7,
        weight: 2,
      }).addTo(leafletMap.current!);

      marker.bindPopup(`
        <div style="font-family:'Hind Siliguri',sans-serif;max-width:220px;">
          <h4 style="font-size:13px;font-weight:bold;margin-bottom:4px;">${report.corruptionType}</h4>
          <p style="font-size:12px;color:#555;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${report.description}</p>
          <p style="font-size:11px;color:#888;margin-bottom:6px;">📍 ${report.location?.address || ""}</p>
          <a href="/reports/${report.id}" style="font-size:12px;color:#E53935;font-weight:600;text-decoration:none;">বিস্তারিত দেখুন →</a>
        </div>
      `);

      marker.on('popupopen', () => {
        const popup = marker.getPopup();
        if (popup) {
          const el = popup.getElement();
          if (el) {
            const link = el.querySelector('a');
            if (link) {
              link.addEventListener('click', (e) => {
                e.preventDefault();
                navigate(`/reports/${report.id}`);
              });
            }
          }
        }
      });

      markersRef.current.push(marker);
    });
  }, [reports, filterType, navigate]);

  const goToMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        leafletMap.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 13);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <div className="relative" style={{ height: "calc(100vh - 56px - 64px)" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[999]">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {/* Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] bg-card rounded-xl px-3 py-2.5 shadow-md flex gap-2 items-center">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="flex-1 border border-input rounded-lg px-2.5 py-1.5 text-[13px] bg-background outline-none"
        >
          <option value="all">সব ধরন</option>
          {CORRUPTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={goToMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap disabled:opacity-50"
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            "📍"
          )}
          আমার অবস্থান
        </button>
      </div>

      {/* Hint text */}
      <div className="absolute bottom-20 left-3 right-3 z-[1000] text-center">
        <span className="bg-card/90 text-muted-foreground text-[11px] px-3 py-1.5 rounded-full shadow-sm border border-border">
          ম্যাপে ক্লিক করে রিপোর্ট যোগ করুন
        </span>
      </div>

      {/* Floating Add Report Button */}
      <button
        onClick={() => navigate("/report")}
        className="absolute bottom-6 right-4 z-[1000] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
