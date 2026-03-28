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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories((data as Category[]) || []);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  const handleSelect = async () => {
    if (!selected || !user) return;
    setSubmitting(true);

    const category = categories.find(c => c.id === selected);
    if (!category) return;

    // If category is active, set status to active immediately
    // If inactive, set to waiting_list (requires payment activation)
    const status = category.is_active ? "active" : "waiting_list";

    const { error } = await supabase.from("advertiser_categories").insert({
      advertiser_id: user.id,
      category_id: selected,
      status,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You have already selected a category");
      } else {
        toast.error(error.message);
      }
      setSubmitting(false);
      return;
    }

    if (status === "active") {
      toast.success("Category activated! Welcome to Karbali.");
      navigate("/dashboard");
    } else {
      toast.info("This category requires payment activation. Please fund your wallet.");
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
            <span className="text-gradient">Choose Your Category</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Select the category that best describes your business</p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Business Category</GlassCardTitle>
            <GlassCardDescription>This determines your access level and features</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No categories available yet. Please check back later.</p>
            ) : (
              <>
                <MotionStagger className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {categories.map((cat) => (
                    <MotionItem key={cat.id}>
                      <button
                        onClick={() => setSelected(cat.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                          selected === cat.id
                            ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                            : "border-border/50 hover:border-border hover:bg-accent/5"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{cat.name}</p>
                            {cat.description && (
                              <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                            )}
                          </div>
                          <div className="ml-2 mt-0.5">
                            {cat.is_active ? (
                              <CheckCircle className={`h-5 w-5 ${selected === cat.id ? "text-primary" : "text-muted-foreground/30"}`} />
                            ) : (
                              <Lock className="h-5 w-5 text-warning" />
                            )}
                          </div>
                        </div>
                        {!cat.is_active && (
                          <p className="mt-2 text-xs text-warning">Requires payment activation</p>
                        )}
                      </button>
                    </MotionItem>
                  ))}
                </MotionStagger>

                <div className="mt-6">
                  <GlassButton
                    variant="glow"
                    className="w-full"
                    disabled={!selected || submitting}
                    onClick={handleSelect}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      "Continue"
                    )}
                  </GlassButton>
                </div>
              </>
            )}
          </GlassCardContent>
        </GlassCard>
      </MotionWrapper>
    </div>
  );
}
