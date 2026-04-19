import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { CheckCircle, Lock, Loader2, Music, MonitorPlay, ShoppingBag, Globe, Smartphone, Wrench, Home, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [expandedType, setExpandedType] = useState<AdType | null>(null);
  const [selectedType, setSelectedType] = useState<AdType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);

  // Category change mode
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");

  // Subtype chosen at signup ("musician" | "youtuber" | "app" | "startup" | "business")
  const signupSubtype = (user?.user_metadata as any)?.advertiser_subtype as string | undefined;
  const isCreator = signupSubtype === "musician" || signupSubtype === "youtuber";
  const isBusinessSignup = signupSubtype === "app" || signupSubtype === "startup" || signupSubtype === "business";

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      const cats = (data as Category[]) || [];
      setCategories(cats);

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

      // Auto-route creators straight to engagement; pre-expand for business signups
      if (!isChangeMode) {
        if (isCreator) {
          setExpandedType("engagement");
          setSelectedType("engagement");
          setSelectedSubtype(signupSubtype as Subtype);
          const topCat = cats.find((c) => c.name === "Engagement Ads");
          if (topCat) setSelectedCategoryId(topCat.id);
        } else if (isBusinessSignup) {
          setExpandedType("performance");
        }
      }

      setLoading(false);
    };
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasCategory]);

  // Hide Engagement card for business signups; hide Performance/Commerce for creators
  const visibleAdTypes = AD_TYPES.filter((t) => {
    if (isCreator) return t.id === "engagement";
    if (isBusinessSignup) return t.id !== "engagement";
    return true;
  });

  const performanceSubcategories = categories.filter(
    (c) => !["Engagement Ads", "Performance Ads", "Commerce Ads"].includes(c.name)
  );

  const handleSubtypeSelect = (type: AdType, subtype: Subtype) => {
    setSelectedType(type);
    setSelectedSubtype(subtype);
    setSelectedCategoryId(null);
    setShowSubcategoryPicker(false);

    if (type === "performance") {
      setShowSubcategoryPicker(true);
    } else {
      const topCat = categories.find((c) => c.name === AD_TYPES.find((t) => t.id === type)?.label);
      setSelectedCategoryId(topCat?.id || null);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedType || !selectedSubtype) return;
    setSubmitting(true);

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

  const isSelected = (type: AdType, subtype: Subtype) =>
    selectedType === type && selectedSubtype === subtype;

  const canSubmit =
    (selectedType && selectedSubtype && selectedType !== "performance") ||
    (selectedType === "performance" && selectedCategoryId);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">{isChangeMode ? "Change Advertiser Type" : "What type of advertiser are you?"}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Select your category and subcategory below</p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Choose Your Category</GlassCardTitle>
            <GlassCardDescription>Click a category to expand and select your subcategory</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-3">
                {AD_TYPES.map((type) => (
                  <Collapsible
                    key={type.id}
                    open={expandedType === type.id}
                    onOpenChange={(open) => setExpandedType(open ? type.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className={`w-full text-left rounded-xl border p-5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 ${
                        expandedType === type.id ? "border-primary/40 bg-primary/5" : "border-border/50"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <type.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground uppercase tracking-wide">{type.label}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">{type.description}</p>
                          </div>
                          <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            expandedType === type.id ? "rotate-180" : ""
                          }`} />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary/20 pl-4">
                        {type.subcategories.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleSubtypeSelect(type.id, sub.id)}
                            className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                              isSelected(type.id, sub.id)
                                ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                                : "border-border/50 hover:border-primary/20 hover:bg-accent/5"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <sub.icon className={`h-4 w-4 ${isSelected(type.id, sub.id) ? "text-primary" : "text-muted-foreground"}`} />
                              <div>
                                <p className="font-medium text-foreground text-sm">{sub.label}</p>
                                <p className="text-xs text-muted-foreground">{sub.description}</p>
                              </div>
                              {isSelected(type.id, sub.id) && (
                                <CheckCircle className="ml-auto h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {/* Performance subcategory picker */}
                {showSubcategoryPicker && selectedType === "performance" && (
                  <div className="mt-4 rounded-xl border border-border/50 p-4">
                    <p className="text-sm font-medium text-foreground mb-3">Select your business subcategory</p>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {performanceSubcategories.filter((c) => c.id !== currentCategoryId).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                            selectedCategoryId === cat.id
                              ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                              : "border-border/50 hover:border-border hover:bg-accent/5"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-foreground text-sm">{cat.name}</p>
                              {cat.description && <p className="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>}
                            </div>
                            <div className="ml-2 mt-0.5">
                              {cat.is_active ? (
                                <CheckCircle className={`h-4 w-4 ${selectedCategoryId === cat.id ? "text-primary" : "text-muted-foreground/30"}`} />
                              ) : (
                                <Lock className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                          </div>
                          {!cat.is_active && <p className="mt-1 text-xs text-amber-500">Requires payment activation</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change mode reason */}
                {isChangeMode && canSubmit && (
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
                {canSubmit && (
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
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {isChangeMode && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}
      </MotionWrapper>
    </div>
  );
}
