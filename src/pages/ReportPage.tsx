import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { CORRUPTION_TYPES } from "@/types";
import { ALL_DISTRICTS } from "@/data/bdLocations";
import { Link as LinkIcon, MapPin, Loader2, X, Upload, Navigation } from "lucide-react";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function ReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [description, setDescription] = useState("");
  const [corruptionType, setCorruptionType] = useState("");
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [area, setArea] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Pre-fill lat/lng from URL params (from map click)
  useEffect(() => {
    const paramLat = searchParams.get("lat");
    const paramLng = searchParams.get("lng");
    if (paramLat && paramLng) {
      const pLat = parseFloat(paramLat);
      const pLng = parseFloat(paramLng);
      setLat(pLat);
      setLng(pLng);
      reverseGeocode(pLat, pLng);
      setShowMapPicker(true);
    }
  }, [searchParams]);

  // Initialize map picker
  useEffect(() => {
    if (!showMapPicker || !mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [lat || 23.8103, lng || 90.4125],
      zoom: lat ? 15 : 7,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setLat(clickLat);
      setLng(clickLng);
      reverseGeocode(clickLat, clickLng);

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
      }
    });

    leafletMap.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  }, [showMapPicker]);

  const reverseGeocode = (latitude: number, longitude: number) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=bn`)
      .then((r) => r.json())
      .then((data) => setAddress(data.display_name || `${latitude}, ${longitude}`))
      .catch(() => setAddress(`${latitude}, ${longitude}`));
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-lg font-semibold mb-2">লগইন প্রয়োজন</p>
        <p className="text-sm text-muted-foreground mb-4">রিপোর্ট জমা দিতে আপনাকে লগইন করতে হবে</p>
        <button onClick={() => navigate("/login")} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold">লগইন করুন</button>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 500000) { toast.error("ছবির সাইজ ৫০০KB এর বেশি হতে পারবে না"); return; }
      const reader = new FileReader();
      reader.onload = () => setBase64Images((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const addLink = () => {
    if (linkInput.trim()) { setLinks((prev) => [...prev, linkInput.trim()]); setLinkInput(""); }
  };

  const detectLocation = () => {
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        reverseGeocode(latitude, longitude);
        setDetectingLocation(false);
        // Update map marker if map is open
        if (leafletMap.current) {
          leafletMap.current.flyTo([latitude, longitude], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            markerRef.current = L.marker([latitude, longitude]).addTo(leafletMap.current);
          }
        }
      },
      () => { toast.error("লোকেশন পাওয়া যায়নি"); setDetectingLocation(false); }
    );
  };

  const handleSubmit = async () => {
    if (!corruptionType) return toast.error("দুর্নীতির ধরন নির্বাচন করুন");
    if (!area.trim()) return toast.error("এলাকার নাম লিখুন");
    if (!description.trim()) return toast.error("বিবরণ লিখুন");
    if (!lat || !lng) return toast.error("অবস্থান নির্বাচন করুন (GPS বা ম্যাপ থেকে)");

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        userId: user.uid,
        description: description.trim(),
        corruptionType,
        location: { lat, lng, address: area ? `${area}, ${address}` : address },
        evidenceBase64: base64Images,
        evidenceLinks: links,
        status: "pending",
        votes: { true: 0, suspicious: 0, needEvidence: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("রিপোর্ট সফলভাবে জমা হয়েছে!");
      navigate("/my-reports");
    } catch { toast.error("রিপোর্ট জমা দিতে সমস্যা হয়েছে"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 space-y-5 pb-8">
      <h2 className="text-lg font-bold">নতুন রিপোর্ট</h2>

      {/* Corruption Type */}
      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-foreground">দুর্নীতির ধরন <span className="text-destructive">*</span></label>
        <select value={corruptionType} onChange={(e) => setCorruptionType(e.target.value)} className="w-full border-[1.5px] border-input rounded-xl px-3.5 py-3 text-sm bg-card outline-none focus:border-primary transition-colors">
          <option value="">নির্বাচন করুন</option>
          {CORRUPTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Area */}
      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-foreground">এলাকা <span className="text-destructive">*</span></label>
        <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="এলাকা/গ্রাম/থানার নাম লিখুন" className="w-full border-[1.5px] border-input rounded-xl px-3.5 py-3 text-sm bg-card outline-none focus:border-primary transition-colors" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-[13px] font-semibold text-foreground">বিবরণ <span className="text-destructive">*</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="দুর্নীতির বিস্তারিত বিবরণ লিখুন..." className="w-full border-[1.5px] border-input rounded-xl px-3.5 py-3 text-sm bg-card resize-none outline-none focus:border-primary transition-colors leading-relaxed" />
      </div>

      {/* Evidence Images */}
      <div className="space-y-3">
        <label className="text-[13px] font-semibold text-foreground">প্রমাণের ছবি</label>
        <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-input rounded-xl bg-muted/30 cursor-pointer active:border-primary active:bg-accent transition-all">
          <Upload size={28} className="text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">ছবি আপলোড করুন</p>
          <span className="text-[12px] text-primary font-semibold">সর্বোচ্চ ৫০০KB</span>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
        </label>

        {base64Images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {base64Images.map((img, i) => (
              <div key={i} className="relative w-[72px] h-[72px]">
                <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                <button onClick={() => setBase64Images((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Links */}
      <div className="space-y-3">
        <label className="text-[13px] font-semibold text-foreground">এভিডেন্স এর লিংক</label>
        <div className="flex gap-2">
          <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="প্রমাণের লিংক দিন (ভিডিও/ছবি/ওয়েবসাইট)" className="flex-1 border-[1.5px] border-input rounded-xl px-3.5 py-2.5 text-[13px] bg-card outline-none focus:border-primary transition-colors" onKeyDown={(e) => e.key === "Enter" && addLink()} />
          <button onClick={addLink} className="bg-primary text-primary-foreground px-3.5 rounded-xl text-[13px] font-semibold whitespace-nowrap">Add</button>
        </div>

        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-xl px-3 py-2.5">
            <LinkIcon size={12} className="text-muted-foreground shrink-0" />
            <span className="truncate flex-1">{link}</span>
            <button onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))} className="text-destructive shrink-0"><X size={14} /></button>
          </div>
        ))}
      </div>

      {/* GPS Location / Map Picker */}
      <div className="space-y-3">
        <label className="text-[13px] font-semibold text-foreground">GPS লোকেশন / ম্যাপ থেকে সিলেক্ট <span className="text-destructive">*</span></label>

        <div className="flex gap-2">
          <button onClick={detectLocation} disabled={detectingLocation} className="flex-1 flex items-center justify-center gap-2 py-3 border-[1.5px] rounded-xl transition-all border-input bg-card hover:border-primary">
            {detectingLocation ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> : <Navigation size={18} className="text-primary" />}
            <span className="text-[13px] font-medium">GPS অটো সনাক্ত</span>
          </button>
          <button onClick={() => setShowMapPicker(!showMapPicker)} className={`flex-1 flex items-center justify-center gap-2 py-3 border-[1.5px] rounded-xl transition-all ${showMapPicker ? "border-primary bg-accent" : "border-input bg-card"}`}>
            <MapPin size={18} className={showMapPicker ? "text-primary" : "text-muted-foreground"} />
            <span className="text-[13px] font-medium">ম্যাপ থেকে সিলেক্ট</span>
          </button>
        </div>

        {/* Auto detect result */}
        {lat && lng && (
          <div className="bg-accent rounded-xl px-3 py-2.5 text-[12px] space-y-1">
            <p className="font-semibold text-accent-foreground">📍 {address}</p>
            <p className="text-muted-foreground">Latitude: {lat.toFixed(6)}, Longitude: {lng.toFixed(6)}</p>
          </div>
        )}

        {/* Map Picker */}
        {showMapPicker && (
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 250 }}>
            <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          </div>
        )}
        {showMapPicker && (
          <p className="text-[11px] text-muted-foreground">ম্যাপে ক্লিক করে লোকেশন সিলেক্ট করুন</p>
        )}
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:opacity-90 transition-all">
        {submitting && <Loader2 size={16} className="animate-spin" />}
        রিপোর্ট জমা দিন
      </button>
    </div>
  );
}
