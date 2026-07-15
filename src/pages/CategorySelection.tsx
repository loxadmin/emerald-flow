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
  Home, ChevronDown, Truck, Fuel, Wifi, WifiOff, Users, Landmark, Store,
  UtensilsCrossed, Package, Radio, Gamepad2, Trophy,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ============================================================
// New taxonomy
// Online (3 groups):
//   engagement  → musician, youtuber, social_media_creator
//   commerce    → ecommerce, online_vendor, realtor
//   performance → app, website, fintech
// Offline (2 groups):
//   daily_essentials → food_beverage, household_items
//   mainstream       → telecom, oil_gas
// ============================================================

type AdMode = "online" | "offline";
type OnlineGroupSlug = "engagement" | "performance" | "commerce";
type OfflineGroupSlug = "daily_essentials" | "mainstream";
type GroupSlug = OnlineGroupSlug | OfflineGroupSlug;
type AdType = "engagement" | "performance" | "commerce" | "offline";
type Subtype =
  | "musician" | "youtuber" | "social_media_creator"
  | "app" | "website" | "fintech" | "game_developers" | "sports_betting"
  | "ecommerce" | "online_vendor" | "realtor"
  | "food_beverage" | "household_items"
  | "telecom" | "oil_gas";

interface SubtypeOption {
  id: Subtype;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface GroupDef {
  slug: GroupSlug;
  advertiserType: AdType;
  label: string;
  description: string;
  icon: React.ElementType;
  subtypes: SubtypeOption[];
}

const ONLINE_GROUPS: GroupDef[] = [
  {
    slug: "engagement",
    advertiserType: "engagement",
    label: "Engagement Ads",
    description: "Reward-based attention for creators — pay per listener, viewer, or engaged fan.",
    icon: Music,
    subtypes: [
      { id: "musician", label: "Musician", description: "Promote your music to listeners", icon: Music },
      { id: "youtuber", label: "YouTuber", description: "Promote your videos to viewers", icon: MonitorPlay },
      { id: "social_media_creator", label: "Social Media Creator", description: "Grow your social audience", icon: Users },
    ],
  },
  {
    slug: "commerce",
    advertiserType: "commerce",
    label: "Commerce Ads",
    description: "Sales-driven verticals — e-commerce, online vendors, real estate.",
    icon: ShoppingBag,
    subtypes: [
      { id: "ecommerce", label: "E-commerce", description: "Online store selling products", icon: ShoppingBag },
      { id: "online_vendor", label: "Online Vendor", description: "Independent digital seller", icon: Store },
      { id: "realtor", label: "Realtor / Real Estate", description: "Property sales and rentals", icon: Home },
    ],
  },
  {
    slug: "performance",
    advertiserType: "performance",
    label: "Performance Ads",
    description: "Trackable actions — installs, signups, KYC, transactions.",
    icon: Globe,
    subtypes: [
      { id: "app", label: "Mobile App Owner", description: "Drive installs and in-app actions", icon: Smartphone },
      { id: "website", label: "Website Owner", description: "Drive signups and web conversions", icon: Globe },
      { id: "fintech", label: "Fintech", description: "Accounts, KYC, deposits, transactions", icon: Landmark },
      { id: "game_developers", label: "Game Developers", description: "Drive game downloads, signups, and in-game events", icon: Gamepad2 },
      { id: "sports_betting", label: "Sports and Betting", description: "Drive signups, deposits, and sports bets", icon: Trophy },
    ],
  },
];

const OFFLINE_GROUPS: GroupDef[] = [
  {
    slug: "daily_essentials",
    advertiserType: "offline",
    label: "Daily Essentials",
    description: "Everyday goods bought in bulk — food, beverages, household items.",
    icon: UtensilsCrossed,
    subtypes: [
      { id: "food_beverage", label: "Food & Beverage Producer", description: "Manufacturers of food and drinks", icon: UtensilsCrossed },
      { id: "household_items", label: "Household Items Manufacturer", description: "Home & personal care goods", icon: Package },
    ],
  },
  {
    slug: "mainstream",
    advertiserType: "offline",
    label: "Mainstream",
    description: "Large-scale verticals — telecoms and oil & gas.",
    icon: Radio,
    subtypes: [
      { id: "telecom", label: "Telecommunications", description: "Mobile networks, data, ISPs", icon: Radio },
      { id: "oil_gas", label: "Oil & Gas", description: "Petroleum, lubricants, fuel", icon: Fuel },
    ],
  },
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

// Top-level catch-all row names per group
const GROUP_CATCHALL: Record<GroupSlug, string> = {
  engagement: "Engagement Ads",
  performance: "Performance Ads",
  commerce: "Commerce Ads",
  daily_essentials: "Daily Essentials Ads",
  mainstream: "Mainstream Ads",
};

const CREATOR_SUBTYPES: Subtype[] = ["musician", "youtuber", "social_media_creator"];
const OFFLINE_SUBTYPES: Subtype[] = ["food_beverage", "household_items", "telecom", "oil_gas"];

export default function CategorySelection() {
  const { user, refreshAccessState, hasCategory } = useAuth();
  const navigate = useNavigate();

  const [adMode, setAdMode] = useState<AdMode>("online");
  const [expandedGroup, setExpandedGroup] = useState<GroupSlug | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<GroupSlug | null>(null);
  const [selectedType, setSelectedType] = useState<AdType | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isChangeMode, setIsChangeMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");

  const signupSubtype = (user?.user_metadata as any)?.advertiser_subtype as Subtype | undefined;
  const isCreatorSignup = signupSubtype ? CREATOR_SUBTYPES.includes(signupSubtype) : false;
  const isOfflineSignup = signupSubtype ? OFFLINE_SUBTYPES.includes(signupSubtype) : false;

  useEffect(() => {
    const load = async () => {
      const [{ data: catData }, { data: grpData }] = await Promise.all([
        supabase.from("categories").select("id,name,description,is_active,is_partnership,group_id,mode").order("name"),
        supabase.from("category_groups").select("id,slug,name").order("display_order"),
      ]);
      setCategories((catData as CategoryRow[]) || []);
      setGroups((grpData as any[])?.filter((g) => ["engagement","performance","commerce","daily_essentials","mainstream"].includes(g.slug)) as GroupRow[] || []);

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

      if (isCreatorSignup) {
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

  const groupIdBySlug = useMemo(() => {
    const map: Partial<Record<GroupSlug, string>> = {};
    for (const g of groups) map[g.slug] = g.id;
    return map;
  }, [groups]);

  const catchallCategoryFor = (slug: GroupSlug): CategoryRow | undefined =>
    categories.find((c) => c.name === GROUP_CATCHALL[slug]);

  const handleSelect = (group: GroupDef, sub: SubtypeOption) => {
    setSelectedGroup(group.slug);
    setSelectedType(group.advertiserType);
    setSelectedSubtype(sub.id);
  };

  const isSelected = (group: GroupSlug, sub: Subtype) =>
    selectedGroup === group && selectedSubtype === sub;

  const canSubmit = !!selectedGroup && !!selectedSubtype && (!isChangeMode || !!changeReason.trim());

  const handleSubmit = async () => {
    if (!user || !selectedGroup || !selectedSubtype || !selectedType) return;
    setSubmitting(true);

    const cat = catchallCategoryFor(selectedGroup);
    if (!cat) {
      toast.error("Category not found. Please try again.");
      setSubmitting(false);
      return;
    }

    if (isChangeMode && currentCategoryId) {
      const { error } = await supabase.from("category_change_requests" as any).insert({
        advertiser_id: user.id,
        current_category_id: currentCategoryId,
        requested_category_id: cat.id,
        reason: changeReason.trim(),
        status: "pending",
      } as any);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      toast.success("Category change request submitted for admin review!");
      navigate("/dashboard");
      setSubmitting(false);
      return;
    }

    const status = cat.is_active ? "active" : "waiting_list";
    const { error } = await supabase.from("advertiser_categories").insert({
      advertiser_id: user.id,
      category_id: cat.id,
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

  const showOnline = !isOfflineSignup;
  const showOffline = !isCreatorSignup;

  const activeGroups = adMode === "online" ? ONLINE_GROUPS : OFFLINE_GROUPS;

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
            Pick <strong>Online</strong> or <strong>Offline</strong>, then choose the group and subtype that fits.
          </p>
        </div>

        <GlassCard variant="strong">
          <GlassCardHeader>
            <GlassCardTitle>Choose Your Category</GlassCardTitle>
            <GlassCardDescription>
              Online has 3 groups: Engagement, Commerce, Performance. Offline has 2 groups: Daily Essentials and Mainstream.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-5">
                {(showOnline && showOffline) && (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/20 p-1">
                    <button
                      onClick={() => { setAdMode("online"); setSelectedGroup(null); setSelectedType(null); setSelectedSubtype(null); setExpandedGroup(null); }}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        adMode === "online" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Wifi className="h-4 w-4" /> Online Ads
                    </button>
                    <button
                      onClick={() => { setAdMode("offline"); setSelectedGroup(null); setSelectedType(null); setSelectedSubtype(null); setExpandedGroup(null); }}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        adMode === "offline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <WifiOff className="h-4 w-4" /> Offline Ads
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {activeGroups
                    .filter((g) => !isCreatorSignup || g.slug === "engagement")
                    .map((group) => (
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
                          <div className="mt-2 ml-4 space-y-2 border-l-2 border-primary/20 pl-4">
                            {group.subtypes.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => handleSelect(group, sub)}
                                className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                                  isSelected(group.slug, sub.id)
                                    ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                                    : "border-border/50 hover:border-primary/20 hover:bg-accent/5"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <sub.icon className={`h-4 w-4 ${isSelected(group.slug, sub.id) ? "text-primary" : "text-muted-foreground"}`} />
                                  <div>
                                    <p className="font-medium text-foreground text-sm">{sub.label}</p>
                                    <p className="text-xs text-muted-foreground">{sub.description}</p>
                                  </div>
                                  {isSelected(group.slug, sub.id) && (
                                    <CheckCircle className="ml-auto h-4 w-4 text-primary shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                </div>

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
