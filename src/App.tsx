import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, RequireAdmin, useAuth } from "@/lib/auth";
import { AiModeProvider } from "@/lib/ai-mode";
import { ReactNode, Suspense, lazy, useEffect } from "react";
import { toast } from "sonner";

import { ThemeProvider } from "@/lib/theme";
import MetaPixelTracker from "@/components/MetaPixelTracker";
import AffiliateRefCapture from "@/components/AffiliateRefCapture";
import { PageSkeleton } from "@/components/skeletons";

// The landing page is the LCP route for most visitors, so it stays in the
// initial chunk. Everything else is code-split: three.js, recharts, jszip and
// the whole admin panel no longer ship to a first-time visitor.
import Index from "./pages/Index";

const AiMode = lazy(() => import("./pages/AiMode"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CampaignRouter = lazy(() => import("./pages/CampaignRouter"));
const CreateCampaign = lazy(() => import("./pages/CreateCampaign"));
const CreateEngagementCampaign = lazy(() => import("./pages/CreateEngagementCampaign"));
const CreateCommerceCampaign = lazy(() => import("./pages/CreateCommerceCampaign"));
const CreateManualCampaign = lazy(() => import("./pages/CreateManualCampaign"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const CategorySelection = lazy(() => import("./pages/CategorySelection"));
const Ads = lazy(() => import("./pages/Ads"));
const Websites = lazy(() => import("./pages/Websites"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCampaignDetail = lazy(() => import("./pages/AdminCampaignDetail"));
const AdminCampaigns = lazy(() => import("./pages/AdminCampaigns"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminBlogs = lazy(() => import("./pages/AdminBlogs"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminDesign = lazy(() => import("./pages/AdminDesign"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminAdvertisers = lazy(() => import("./pages/AdminAdvertisers"));
const AdminWallets = lazy(() => import("./pages/AdminWallets"));
const AdminPartnerships = lazy(() => import("./pages/AdminPartnerships"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const AdminBroadcast = lazy(() => import("./pages/AdminBroadcast"));
const AdminExtension = lazy(() => import("./pages/AdminExtension"));
const AdminOfferwall = lazy(() => import("./pages/AdminOfferwall"));
const AdminLettersOfIntent = lazy(() => import("./pages/AdminLettersOfIntent"));
const AdminCompanySignature = lazy(() => import("./pages/AdminCompanySignature"));
const AdminMigrationOpportunities = lazy(() => import("./pages/AdminMigrationOpportunities"));
const AdminPackages = lazy(() => import("./pages/AdminPackages"));
const AdminPackageDelivery = lazy(() => import("./pages/AdminPackageDelivery"));
const AdminMilestones = lazy(() => import("./pages/AdminMilestones"));
const Packages = lazy(() => import("./pages/Packages"));
const PackageOrders = lazy(() => import("./pages/PackageOrders"));
const SwitchOffers = lazy(() => import("./pages/SwitchOffers"));
const AdminSwitchOffers = lazy(() => import("./pages/AdminSwitchOffers"));
const OfflineLOI = lazy(() => import("./pages/OfflineLOI"));
const OfflineLOIStatus = lazy(() => import("./pages/OfflineLOIStatus"));
const OfflineCampaignLaunch = lazy(() => import("./pages/OfflineCampaignLaunch"));
const Admin2FA = lazy(() => import("./pages/Admin2FA"));
const About = lazy(() => import("./pages/About"));
const Docs = lazy(() => import("./pages/Docs"));
const Terms = lazy(() => import("./pages/Terms"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const WhatIsKarbali = lazy(() => import("./pages/WhatIsKarbali"));
const UseCases = lazy(() => import("./pages/UseCases"));
const Comparison = lazy(() => import("./pages/Comparison"));
const ProblemSolution = lazy(() => import("./pages/ProblemSolution"));
const ReferralRedirect = lazy(() => import("./pages/ReferralRedirect"));
const LearnHub = lazy(() => import("./pages/LearnHub"));
const LearnArticle = lazy(() => import("./pages/LearnArticle"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Client-side server-state defaults.
//  - staleTime > 0 stops React 18 StrictMode double-mounts and route revisits
//    from re-hitting Postgres for data that has not changed.
//  - refetchOnWindowFocus off by default; hooks that need it opt back in.
//  - bounded, backed-off retries so a Supabase blip does not turn into a
//    self-inflicted request storm.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false; // never retry auth/validation errors
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: 0 },
  },
});

// Blocks direct navigation to a create-campaign page that doesn't match the
// advertiser's approved category. Redirects back to the router with a toast.
function RequireCampaignType({ allow, children }: { allow: "performance" | "engagement" | "commerce"; children: ReactNode }) {
  const { advertiserType, isLoading } = useAuth() as any;
  useEffect(() => {
    if (!isLoading && advertiserType && advertiserType !== allow) {
      toast.error(advertiserType === "offline" ? "Offline advertisers create offers, not online campaigns." : `This campaign type isn't available for your ${advertiserType} account.`);
    }
  }, [isLoading, advertiserType, allow]);
  if (isLoading) return null;
  if (advertiserType && advertiserType !== allow) {
    return <Navigate to={advertiserType === "offline" ? "/offline/loi" : "/campaigns/create"} replace />;
  }
  return <>{children}</>;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AiModeProvider>
            <MetaPixelTracker />
            <AffiliateRefCapture />
            <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/ai" element={<RequireAuth><AiMode /></RequireAuth>} />

              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/r/:code" element={<ReferralRedirect />} />
              <Route path="/affiliates" element={<Affiliates />} />
              <Route path="/affiliate/dashboard" element={<RequireAuth><AffiliateDashboard /></RequireAuth>} />
              <Route path="/ella/affiliates" element={<RequireAuth><RequireAdmin><AdminAffiliates /></RequireAdmin></RequireAuth>} />
              
              {/* Advertiser routes */}
              <Route path="/category-select" element={<RequireAuth><CategorySelection /></RequireAuth>} />
              <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/ads" element={<RequireAuth><Ads /></RequireAuth>} />
              <Route path="/websites" element={<RequireAuth><Websites /></RequireAuth>} />
              <Route path="/packages" element={<RequireAuth><Packages /></RequireAuth>} />
              <Route path="/packages/orders" element={<RequireAuth><PackageOrders /></RequireAuth>} />
              <Route path="/switch-offers" element={<RequireAuth><SwitchOffers /></RequireAuth>} />
              <Route path="/ella/switch-offers" element={<RequireAuth><RequireAdmin><AdminSwitchOffers /></RequireAdmin></RequireAuth>} />

              {/* Offline Ads */}
              <Route path="/offline/loi" element={<RequireAuth><OfflineLOI /></RequireAuth>} />
              <Route path="/offline/loi/status" element={<RequireAuth><OfflineLOIStatus /></RequireAuth>} />
              <Route path="/offline/campaign" element={<RequireAuth><OfflineCampaignLaunch /></RequireAuth>} />
              
              <Route path="/campaigns/create" element={<RequireAuth><CampaignRouter /></RequireAuth>} />
              <Route path="/campaigns/create/performance" element={<RequireAuth><RequireCampaignType allow="performance"><CreateCampaign /></RequireCampaignType></RequireAuth>} />
              <Route path="/campaigns/create/engagement" element={<RequireAuth><RequireCampaignType allow="engagement"><CreateEngagementCampaign /></RequireCampaignType></RequireAuth>} />
              <Route path="/campaigns/create/commerce" element={<RequireAuth><RequireCampaignType allow="commerce"><CreateCommerceCampaign /></RequireCampaignType></RequireAuth>} />
              <Route path="/campaigns/create/manual" element={<RequireAuth><CreateManualCampaign /></RequireAuth>} />

              <Route path="/campaigns/:id" element={<RequireAuth><CampaignDetail /></RequireAuth>} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/learn" element={<LearnHub />} />
              <Route path="/learn/:slug" element={<LearnArticle />} />
              <Route path="/what-is-karbali" element={<WhatIsKarbali />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/vs/:competitor" element={<Comparison />} />

              {/* Problem -> Solution SEO routes */}
              <Route path="/get-customers-for-my-business" element={<ProblemSolution />} />
              <Route path="/how-to-get-users-for-my-app" element={<ProblemSolution />} />
              <Route path="/how-to-increase-sales-online" element={<ProblemSolution />} />
              <Route path="/how-to-get-first-100-customers" element={<ProblemSolution />} />
              <Route path="/customer-acquisition-for-startups" element={<ProblemSolution />} />

              {/* Admin routes (separate panel) */}
              <Route path="/ella/2fa" element={<RequireAuth><Admin2FA /></RequireAuth>} />
              <Route path="/ella" element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/campaigns" element={<RequireAuth><RequireAdmin><AdminCampaigns /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/orders" element={<RequireAuth><RequireAdmin><AdminOrders /></RequireAdmin></RequireAuth>} />

              <Route path="/ella/campaigns/:id" element={<RequireAuth><RequireAdmin><AdminCampaignDetail /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/analytics" element={<RequireAuth><RequireAdmin><AdminAnalytics /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/settings" element={<RequireAuth><RequireAdmin><AdminSettings /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/blogs" element={<RequireAuth><RequireAdmin><AdminBlogs /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/content" element={<RequireAuth><RequireAdmin><AdminContent /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/design" element={<RequireAuth><RequireAdmin><AdminDesign /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/categories" element={<RequireAuth><RequireAdmin><AdminCategories /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/partnerships" element={<RequireAuth><RequireAdmin><AdminPartnerships /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/advertisers" element={<RequireAuth><RequireAdmin><AdminAdvertisers /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/wallets" element={<RequireAuth><RequireAdmin><AdminWallets /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/messages" element={<RequireAuth><RequireAdmin><AdminMessages /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/broadcast" element={<RequireAuth><RequireAdmin><AdminBroadcast /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/extension" element={<RequireAuth><RequireAdmin><AdminExtension /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/offerwall" element={<RequireAuth><RequireAdmin><AdminOfferwall /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/loi" element={<RequireAuth><RequireAdmin><AdminLettersOfIntent /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/signature" element={<RequireAuth><RequireAdmin><AdminCompanySignature /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/migration-opportunities" element={<RequireAuth><RequireAdmin><AdminMigrationOpportunities /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/packages" element={<RequireAuth><RequireAdmin><AdminPackages /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/packages/orders/:orderId/deliver" element={<RequireAuth><RequireAdmin><AdminPackageDelivery /></RequireAdmin></RequireAuth>} />
              <Route path="/ella/milestones" element={<RequireAuth><RequireAdmin><AdminMilestones /></RequireAdmin></RequireAuth>} />


              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </AiModeProvider>
          </AuthProvider>
        </BrowserRouter>

      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
