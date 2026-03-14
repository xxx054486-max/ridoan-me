import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      // Try login first
      await signIn(email, password);
      toast.success("লগইন সফল!");
      navigate(-1);
    } catch (err: any) {
      // If user not found, auto register
      if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-credential") {
        try {
          await signUp(email, password);
          toast.success("অটো নিবন্ধন ও লগইন সফল!");
          navigate(-1);
        } catch (signUpErr: any) {
          toast.error(signUpErr.message || "নিবন্ধন ব্যর্থ");
        }
      } else {
        toast.error(err.message || "সমস্যা হয়েছে");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 h-14 bg-topbar text-topbar-foreground shrink-0">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-bold">লগইন / নিবন্ধন</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-primary">Corruption Alart</h2>
            <p className="text-sm text-muted-foreground mt-1">
              ইমেইল ও পাসওয়ার্ড দিন — নতুন হলে অটো রেজিস্টার হবে
            </p>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ইমেইল"
            required
            className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-card"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
            required
            minLength={6}
            className="w-full border border-input rounded-lg px-4 py-3 text-sm bg-card"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            লগইন / নিবন্ধন
          </button>
        </form>
      </div>
    </div>
  );
}
