import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper, { MotionStagger, MotionItem } from "@/components/MotionWrapper";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { CheckCircle, Lock, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function CategorySelection() {
  const { user, refreshAccessState, hasCategory } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Category change mode
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories((data as Category[]) || []);

      // Check if user already has a category (change mode)
      if (user && hasCategory) {
        const { data: existing } = await supabase.from("advertiser_categories").select("category_id").eq("advertiser_id", user.id).maybeSingle();
        if (existing) {
          setCurrentCategoryId(existing.category_id);
          setIsChangeMode(true);
        }
      }
      setLoading(false);
    };
    fetchCategories();
  }, [user, hasCategory]);

  const handleSelect = async () => {
    if (!selected || !user) return;
    setSubmitting(true);

    const category = categories.find(c => c.id === selected);
    if (!category) { setSubmitting(false); return; }

    if (isChangeMode && currentCategoryId) {
      // Submit change request
      if (!changeReason.trim()) {
        toast.error("Please provide a reason for the category change");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("category_change_requests" as any).insert({
        advertiser_id: user.id,
        current_category_id: currentCategoryId,
        requested_category_id: selected,
        reason: changeReason.trim(),
        status: "pending",
      } as any);
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      toast.success("Category change request submitted for admin review!");
      navigate("/dashboard");
      setSubmitting(false);
      return;
    }

    // First time selection
    const status = category.is_active ? "active" : "waiting_list";
    const { error } = await supabase.from("advertiser_categories").insert({
      advertiser_id: user.id, category_id: selected, status,
    });
    if (error) {
      if (error.code === "23505") toast.error("You have already selected a category");
      else toast.error(error.message);
      setSubmitting(false);
      return;
    }

    await refreshAccessState();
    if (status === "active") {
      toast.success("Category activated! Welcome to KARBALI ADS.");
      navigate("/dashboard");
    } else {
      toast.info("This category requires payment activation.");
      navigate("/wallet");
    }
    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">{isChangeMode ? "Change Category" : "Choose Your Category"}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isChangeMode ? "Select a new category and provide a reason. Admin will review your request." : "Select the category that best describes your business"}
          </p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Business Category</GlassCardTitle>
            <GlassCardDescription>{isChangeMode ? "Changing category requires admin approval" : "This determines your access level and features"}</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No categories available yet.</p>
            ) : (
              <>
                <MotionStagger className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {categories.filter(c => c.id !== currentCategoryId).map((cat) => (
                    <MotionItem key={cat.id}>
                      <button onClick={() => setSelected(cat.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                          selected === cat.id ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.1)]" : "border-border/50 hover:border-border hover:bg-accent/5"
                        }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{cat.name}</p>
                            {cat.description && <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>}
                          </div>
                          <div className="ml-2 mt-0.5">
                            {cat.is_active ? (
                              <CheckCircle className={`h-5 w-5 ${selected === cat.id ? "text-primary" : "text-muted-foreground/30"}`} />
                            ) : (
                              <Lock className="h-5 w-5 text-amber-500" />
                            )}
                          </div>
                        </div>
                        {!cat.is_active && <p className="mt-2 text-xs text-amber-500">Requires payment activation</p>}
                      </button>
                    </MotionItem>
                  ))}
                </MotionStagger>

                {isChangeMode && (
                  <div className="mt-4 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Reason for change *</label>
                    <textarea
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Explain why you'd like to change your category..."
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={3}
                    />
                  </div>
                )}

                <div className="mt-6">
                  <GlassButton variant="glow" className="w-full" disabled={!selected || submitting || (isChangeMode && !changeReason.trim())} onClick={handleSelect}>
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : isChangeMode ? "Submit Change Request" : "Continue"}
                  </GlassButton>
                </div>
              </>
            )}
          </GlassCardContent>
        </GlassCard>

        {isChangeMode && (
          <div className="mt-4 text-center">
            <button onClick={() => navigate("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground underline">← Back to Dashboard</button>
          </div>
        )}
      </MotionWrapper>
    </div>
  );
}
