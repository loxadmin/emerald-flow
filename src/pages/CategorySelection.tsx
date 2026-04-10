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
import { CheckCircle, Lock, Loader2, Music, MonitorPlay, ShoppingBag, Globe, Smartphone, Building2, Wrench, Home, ArrowLeft } from "lucide-react";

type AdType = "engagement" | "performance" | "commerce";
type Subtype = "musician" | "youtuber" | "app" | "website" | "ecommerce" | "service" | "real_estate";

interface SubcategoryOption {
  id: Subtype;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface AdTypeOption {
  id: AdType;
  label: string;
  description: string;
  icon: React.ElementType;
  subcategories: SubcategoryOption[];
}

const AD_TYPES: AdTypeOption[] = [
  {
    id: "engagement",
    label: "Engagement Ads",
    description: "For Creatives: Musicians & YouTubers. Earn per listener/viewer through interactive offerwalls.",
    icon: Music,
    subcategories: [
      { id: "musician", label: "Musician", description: "Promote your music to listeners", icon: Music },
      { id: "youtuber", label: "YouTuber", description: "Promote your videos to viewers", icon: MonitorPlay },
    ],
  },
  {
    id: "performance",
    label: "Performance Ads",
    description: "For App & Website owners. Track downloads, signups, and purchases.",
    icon: Globe,
    subcategories: [
      { id: "app", label: "App Owner", description: "Mobile or desktop application", icon: Smartphone },
      { id: "website", label: "Website Owner", description: "Web-based platform or service", icon: Globe },
    ],
  },
  {
    id: "commerce",
    label: "Commerce Ads",
    description: "For E-commerce & Real Estate vendors. Track sales with $1 flat + 10% commission.",
    icon: ShoppingBag,
    subcategories: [
      { id: "ecommerce", label: "E-commerce Vendor", description: "Online store selling products", icon: ShoppingBag },
      { id: "service", label: "Service Provider", description: "Offer professional services", icon: Wrench },
      { id: "real_estate", label: "Real Estate", description: "Property sales and rentals", icon: Home },
    ],
  },
];

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function CategorySelection() {
  const { user, refreshAccessState, hasCategory } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"type" | "subtype" | "subcategory">("type");
  const [selectedType, setSelectedType] = useState<AdType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
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

      if (user && hasCategory) {
        const { data: existing } = await supabase
          .from("advertiser_categories")
          .select("category_id, advertiser_type, advertiser_subtype")
          .eq("advertiser_id", user.id)
          .maybeSingle();
        if (existing) {
          setCurrentCategoryId(existing.category_id);
          setIsChangeMode(true);
        }
      }
      setLoading(false);
    };
    fetchCategories();
  }, [user, hasCategory]);

  // For performance ads, we show existing subcategories from the categories table
  const performanceSubcategories = categories.filter(
    (c) => !["Engagement Ads", "Performance Ads", "Commerce Ads"].includes(c.name)
  );

  const handleSubmit = async () => {
    if (!user || !selectedType || !selectedSubtype) return;
    setSubmitting(true);

    // Find or use the matching top-level category
    const topLevelName = AD_TYPES.find((t) => t.id === selectedType)?.label || "";
    let categoryId = selectedCategoryId;

    if (!categoryId) {
      const matchingCat = categories.find((c) => c.name === topLevelName);
      categoryId = matchingCat?.id || null;
    }

    if (!categoryId) {
      toast.error("Category not found. Please try again.");
      setSubmitting(false);
      return;
    }

    if (isChangeMode && currentCategoryId) {
      if (!changeReason.trim()) {
        toast.error("Please provide a reason for the category change");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("category_change_requests" as any).insert({
        advertiser_id: user.id,
        current_category_id: currentCategoryId,
        requested_category_id: categoryId,
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
    const category = categories.find((c) => c.id === categoryId);
    const status = category?.is_active ? "active" : "waiting_list";
    const { error } = await supabase.from("advertiser_categories").insert({
      advertiser_id: user.id,
      category_id: categoryId,
      status,
      advertiser_type: selectedType,
      advertiser_subtype: selectedSubtype,
    } as any);
    if (error) {
      if (error.code === "23505") toast.error("You have already selected a category");
      else toast.error(error.message);
      setSubmitting(false);
      return;
    }

    await refreshAccessState();
    if (status === "active") {
      toast.success("Category activated! Welcome to Karbali Ads.");
      navigate("/dashboard");
    } else {
      toast.info("This category requires payment activation.");
      navigate("/wallet");
    }
    setSubmitting(false);
  };

  const selectedTypeData = AD_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">{isChangeMode ? "Change Advertiser Type" : "What type of advertiser are you?"}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === "type" && "Select the category that best describes your business"}
            {step === "subtype" && `Choose your specific type within ${selectedTypeData?.label}`}
            {step === "subcategory" && "Select your business subcategory"}
          </p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>
              {step === "type" && "Advertiser Type"}
              {step === "subtype" && selectedTypeData?.label}
              {step === "subcategory" && "Business Subcategory"}
            </GlassCardTitle>
            <GlassCardDescription>
              {step === "type" && "This determines your campaign features and pricing"}
              {step === "subtype" && "Select your specific role"}
              {step === "subcategory" && "Choose the category closest to your business"}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Step 1: Choose Ad Type */}
                {step === "type" && (
                  <MotionStagger className="grid gap-3">
                    {AD_TYPES.map((type) => (
                      <MotionItem key={type.id}>
                        <button
                          onClick={() => {
                            setSelectedType(type.id);
                            setSelectedSubtype(null);
                            setSelectedCategoryId(null);
                            setStep("subtype");
                          }}
                          className={`w-full text-left rounded-xl border p-5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 border-border/50`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <type.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{type.label}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                        </button>
                      </MotionItem>
                    ))}
                  </MotionStagger>
                )}

                {/* Step 2: Choose Subtype */}
                {step === "subtype" && selectedTypeData && (
                  <>
                    <button
                      onClick={() => { setStep("type"); setSelectedType(null); }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <MotionStagger className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {selectedTypeData.subcategories.map((sub) => (
                        <MotionItem key={sub.id}>
                          <button
                            onClick={() => {
                              setSelectedSubtype(sub.id);
                              // For performance ads, show subcategory picker from existing categories
                              if (selectedType === "performance") {
                                setStep("subcategory");
                              } else {
                                // For engagement & commerce, find the top-level category and proceed
                                const topCat = categories.find((c) => c.name === selectedTypeData.label);
                                setSelectedCategoryId(topCat?.id || null);
                              }
                            }}
                            className="w-full text-left rounded-xl border p-4 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 border-border/50"
                          >
                            <div className="flex items-start gap-3">
                              <sub.icon className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <p className="font-medium text-foreground">{sub.label}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">{sub.description}</p>
                              </div>
                            </div>
                          </button>
                        </MotionItem>
                      ))}
                    </MotionStagger>
                  </>
                )}

                {/* Step 3: Subcategory for performance ads */}
                {step === "subcategory" && selectedType === "performance" && (
                  <>
                    <button
                      onClick={() => { setStep("subtype"); setSelectedSubtype(null); }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <MotionStagger className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {performanceSubcategories.filter((c) => c.id !== currentCategoryId).map((cat) => (
                        <MotionItem key={cat.id}>
                          <button
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                              selectedCategoryId === cat.id
                                ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                                : "border-border/50 hover:border-border hover:bg-accent/5"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-foreground">{cat.name}</p>
                                {cat.description && <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>}
                              </div>
                              <div className="ml-2 mt-0.5">
                                {cat.is_active ? (
                                  <CheckCircle className={`h-5 w-5 ${selectedCategoryId === cat.id ? "text-primary" : "text-muted-foreground/30"}`} />
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
                  </>
                )}

                {/* Change mode reason */}
                {isChangeMode && (selectedCategoryId || (selectedType && selectedSubtype && selectedType !== "performance")) && (
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

                {/* Submit button */}
                {((selectedType && selectedSubtype && selectedType !== "performance") ||
                  (selectedType === "performance" && selectedCategoryId)) && (
                  <div className="mt-6">
                    <GlassButton
                      variant="glow"
                      className="w-full"
                      disabled={submitting || (isChangeMode && !changeReason.trim())}
                      onClick={handleSubmit}
                    >
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : isChangeMode ? (
                        "Submit Change Request"
                      ) : (
                        "Continue"
                      )}
                    </GlassButton>
                  </div>
                )}
              </>
            )}
          </GlassCardContent>
        </GlassCard>

        {(isChangeMode || step !== "type") && (
          <div className="mt-4 text-center">
            <button
              onClick={() => isChangeMode ? navigate("/dashboard") : setStep("type")}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              ← {isChangeMode ? "Back to Dashboard" : "Start Over"}
            </button>
          </div>
        )}
      </MotionWrapper>
    </div>
  );
}
