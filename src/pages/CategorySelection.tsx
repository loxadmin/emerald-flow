import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import FluidCanvas from "@/components/FluidCanvas";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import {
  CheckCircle, Loader2, Music, MonitorPlay, ShoppingBag, Globe, Smartphone,
  Wrench, Home, ChevronDown, Truck, Fuel, Wifi, WifiOff,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// =============================================================
// Top-level taxonomy
//   Ad Type:  online | offline
//   Online splits into 3 Groups: engagement | performance | commerce
//   Each group has a fixed list of subtypes (the enum stored on advertiser_categories.advertiser_subtype)
//   AND an open list of DB sub-categories (rows in `categories` with that group_id)
//   Offline is its own ad type with two subtypes.
// =============================================================

type AdMode = "online" | "offline";
type GroupSlug = "engagement" | "performance" | "commerce";
type AdType = "engagement" | "performance" | "commerce" | "offline";
type Subtype =
  | "musician" | "youtuber"
  | "app" | "website"
  | "ecommerce" | "service" | "real_estate"
  | "oil_gas" | "distributor";

interface SubtypeOption {
  id: Subtype;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface OnlineGroup {
  slug: GroupSlug;
  advertiserType: AdType;
  label: string;
  description: string;
  icon: React.ElementType;
  subtypes: SubtypeOption[];
}

const ONLINE_GROUPS: OnlineGroup[] = [
  {
    slug: "engagement",
    advertiserType: "engagement",
    label: "Engagement",
    description: "Reward-based attention for creators — musicians and YouTubers earn per listener/viewer.",
    icon: Music,
    subtypes: [
      { id: "musician", label: "Musician", description: "Promote your music to listeners", icon: Music },
      { id: "youtuber", label: "YouTuber", description: "Promote your videos to viewers", icon: MonitorPlay },
    ],
  },
  {
    slug: "performance",
    advertiserType: "performance",
    label: "Performance",
    description: "Trackable actions for apps and websites — downloads, signups, and purchases.",
    icon: Globe,
    subtypes: [
      { id: "app", label: "App Owner", description: "Mobile or desktop application", icon: Smartphone },
      { id: "website", label: "Website Owner", description: "Web-based platform or service", icon: Globe },
    ],
  },
  {
    slug: "commerce",
    advertiserType: "commerce",
    label: "Commerce",
    description: "Sales-driven verticals — e-commerce, services, real estate, fintech, vendors.",
    icon: ShoppingBag,
    subtypes: [
      { id: "ecommerce", label: "E-commerce Vendor", description: "Online store selling products", icon: ShoppingBag },
      { id: "service", label: "Service Provider", description: "Offer professional services", icon: Wrench },
      { id: "real_estate", label: "Real Estate", description: "Property sales and rentals", icon: Home },
    ],
  },
];

const OFFLINE_SUBTYPES: SubtypeOption[] = [
  { id: "oil_gas", label: "Oil & Gas", description: "Petroleum, lubricants, fuel sales", icon: Fuel },
  { id: "distributor", label: "Distributor", description: "Bulk product distribution", icon: Truck },
];

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_partnership: boolean;
  group_id: string | null;
  mode: "online" | "offline";
}

interface GroupRow {
  id: string;
  slug: GroupSlug;
  name: string;
}

export default function CategorySelection() {
  const { user, refreshAccessState, hasCategory } = useAuth();
  const navigate = useNavigate();

  const [adMode, setAdMode] = useState<AdMode>("online");
  const [expandedGroup, setExpandedGroup] = useState<GroupSlug | null>(null);

  const [selectedType, setSelectedType] = useState<AdType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | null>(null);
  // Optional sub-category row (e.g. Fintech, Product Vendors) — only required when a group exposes them
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Category change mode
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");

  // Subtype chosen at signup
  const signupSubtype = (user?.user_metadata as any)?.advertiser_subtype as string | undefined;
  const isCreator = signupSubtype === "musician" || signupSubtype === "youtuber";
  const isOfflineSignup = signupSubtype === "oil_gas" || signupSubtype === "distributor";

  useEffect(() => {
    const load = async () => {
      const [{ data: catData }, { data: grpData }] = await Promise.all([
        supabase.from("categories").select("id,name,description,is_active,is_partnership,group_id,mode").order("name"),
        supabase.from("category_groups").select("id,slug,name").order("display_order"),
      ]);
      setCategories((catData as CategoryRow[]) || []);
      setGroups((grpData as GroupRow[]) || []);

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

      // Auto-route per signup hint
      if (isCreator) {
        setAdMode("online");
        setExpandedGroup("engagement");
      } else if (isOfflineSignup) {
        setAdMode("offline");
      }

      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasCategory]);

  // DB sub-categories per group (Fintech, Product Vendors etc.)
  const subCategoriesByGroup = useMemo(() => {
    const map: Record<GroupSlug, CategoryRow[]> = { engagement: [], performance: [], commerce: [] };
    for (const g of groups) {
      const slug = g.slug;
      map[slug] = categories.filter(
        (c) =>
          c.group_id === g.id &&
          // Hide the catch-all top-level row (e.g. "Engagement Ads") — it's the default landing row, not a sub-niche
          !["Engagement Ads", "Performance Ads", "Commerce Ads", "Offline Ads"].includes(c.name) &&
          !c.is_partnership,
      );
    }
    return map;
  }, [groups, categories]);

  const topLevelCategoryFor = (type: AdType): CategoryRow | undefined => {
    const map: Record<AdType, string> = {
      engagement: "Engagement Ads",
      performance: "Performance Ads",
      commerce: "Commerce Ads",
      offline: "Offline Ads",
    };
    return categories.find((c) => c.name === map[type]);
  };

  const handleSelect = (type: AdType, subtype: Subtype) => {
    setSelectedType(type);
    setSelectedSubtype(subtype);
    setSelectedSubCategoryId(null);
  };

  const canSubmit =
    !!selectedType && !!selectedSubtype && (!isChangeMode || !!changeReason.trim());

  const handleSubmit = async () => {
    if (!user || !selectedType || !selectedSubtype) return;
    setSubmitting(true);

    // Resolve target category_id: prefer chosen sub-category row, fallback to the top-level row for the ad type
    const topCat = topLevelCategoryFor(selectedType);
    const categoryId = selectedSubCategoryId || topCat?.id || null;

    if (!categoryId) {
      toast.error("Category not found. Please try again.");
      setSubmitting(false);
      return;
    }

    if (isChangeMode && currentCategoryId) {
      const { error } = await supabase.from("category_change_requests" as any).insert({
        advertiser_id: user.id,
        current_category_id: currentCategoryId,
        requested_category_id: categoryId,
        reason: changeReason.trim(),
        status: "pending",
      } as any);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
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

  // Restrict mode tabs based on signup hint
  const showOnline = !isOfflineSignup;
  const showOffline = !isCreator;

  const isSelected = (type: AdType, subtype: Subtype) =>
    selectedType === type && selectedSubtype === subtype;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-background">
      <FluidCanvas />
      <MotionWrapper className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Logo size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">{isChangeMode ? "Change Advertiser Type" : "What type of advertiser are you?"}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">First pick how you advertise, then pick the group that fits.</p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Choose Your Category</GlassCardTitle>
            <GlassCardDescription>
              Two ad types: <strong>Online</strong> (3 groups) or <strong>Offline</strong>.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Mode tabs */}
                {(showOnline && showOffline) && (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/20 p-1">
                    <button
                      onClick={() => { setAdMode("online"); setSelectedType(null); setSelectedSubtype(null); }}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        adMode === "online" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Wifi className="h-4 w-4" /> Online Ads
                    </button>
                    <button
                      onClick={() => { setAdMode("offline"); setSelectedType("offline"); setSelectedSubtype(null); setExpandedGroup(null); }}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        adMode === "offline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <WifiOff className="h-4 w-4" /> Offline Ads
                    </button>
                  </div>
                )}

                {/* ONLINE: three group cards */}
                {adMode === "online" && (
                  <div className="space-y-3">
                    {ONLINE_GROUPS.filter((g) => !isCreator || g.slug === "engagement").map((group) => {
                      const subCats = subCategoriesByGroup[group.slug] || [];
                      return (
                        <Collapsible
                          key={group.slug}
                          open={expandedGroup === group.slug}
                          onOpenChange={(open) => setExpandedGroup(open ? group.slug : null)}
                        >
                          <CollapsibleTrigger asChild>
                            <button className={`w-full text-left rounded-xl border p-5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 ${
                              expandedGroup === group.slug ? "border-primary/40 bg-primary/5" : "border-border/50"
                            }`}>
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <group.icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground uppercase tracking-wide">{group.label}</p>
                                  <p className="mt-0.5 text-sm text-muted-foreground">{group.description}</p>
                                </div>
                                <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                                  expandedGroup === group.slug ? "rotate-180" : ""
                                }`} />
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 ml-4 space-y-3 border-l-2 border-primary/20 pl-4">
                              {/* Fixed subtypes */}
                              <div className="space-y-2">
                                {group.subtypes.map((sub) => (
                                  <button
                                    key={sub.id}
                                    onClick={() => handleSelect(group.advertiserType, sub.id)}
                                    className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                                      isSelected(group.advertiserType, sub.id)
                                        ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                                        : "border-border/50 hover:border-primary/20 hover:bg-accent/5"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <sub.icon className={`h-4 w-4 ${isSelected(group.advertiserType, sub.id) ? "text-primary" : "text-muted-foreground"}`} />
                                      <div>
                                        <p className="font-medium text-foreground text-sm">{sub.label}</p>
                                        <p className="text-xs text-muted-foreground">{sub.description}</p>
                                      </div>
                                      {isSelected(group.advertiserType, sub.id) && (
                                        <CheckCircle className="ml-auto h-4 w-4 text-primary shrink-0" />
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>

                              {/* Optional DB sub-categories (Fintech, Product Vendors, etc.) */}
                              {subCats.length > 0 && selectedType === group.advertiserType && selectedSubtype && (
                                <div className="rounded-xl border border-border/50 p-3">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Pick your specific niche (optional)
                                  </p>
                                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                                    {subCats.filter((c) => c.id !== currentCategoryId).map((cat) => (
                                      <button
                                        key={cat.id}
                                        onClick={() => setSelectedSubCategoryId(
                                          selectedSubCategoryId === cat.id ? null : cat.id
                                        )}
                                        className={`text-left rounded-lg border p-2.5 transition-all ${
                                          selectedSubCategoryId === cat.id
                                            ? "border-primary/50 bg-primary/10"
                                            : "border-border/50 hover:border-border hover:bg-accent/5"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">{cat.name}</p>
                                            {cat.description && (
                                              <p className="text-[11px] text-muted-foreground line-clamp-2">{cat.description}</p>
                                            )}
                                          </div>
                                          <CheckCircle className={`h-4 w-4 shrink-0 ${selectedSubCategoryId === cat.id ? "text-primary" : "text-muted-foreground/30"}`} />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                )}

                {/* OFFLINE: direct subtype list */}
                {adMode === "offline" && (
                  <div className="rounded-xl border border-border/50 p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground uppercase tracking-wide">Offline Ads</p>
                      <p className="text-sm text-muted-foreground">
                        Submit product offers; the admin team relays orders from buyers and you fulfil offline.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {OFFLINE_SUBTYPES.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSelect("offline", sub.id)}
                          className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                            isSelected("offline", sub.id)
                              ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                              : "border-border/50 hover:border-primary/20 hover:bg-accent/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <sub.icon className={`h-4 w-4 ${isSelected("offline", sub.id) ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <p className="font-medium text-foreground text-sm">{sub.label}</p>
                              <p className="text-xs text-muted-foreground">{sub.description}</p>
                            </div>
                            {isSelected("offline", sub.id) && <CheckCircle className="ml-auto h-4 w-4 text-primary shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change mode reason */}
                {isChangeMode && canSubmit && (
                  <div className="space-y-1.5">
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

                {/* Submit */}
                {canSubmit && (
                  <GlassButton
                    variant="glow"
                    className="w-full"
                    disabled={submitting}
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
