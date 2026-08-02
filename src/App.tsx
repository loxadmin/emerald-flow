import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, RequireAdmin, useAuth } from "@/lib/auth";
import { AiModeProvider } from "@/lib/ai-mode";
import AiMode from "@/pages/AiMode";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";

import { ThemeProvider } from "@/lib/theme";
import MetaPixelTracker from "@/components/MetaPixelTracker";


import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CampaignRouter from "./pages/CampaignRouter";
import CreateCampaign from "./pages/CreateCampaign";
import CreateEngagementCampaign from "./pages/CreateEngagementCampaign";
import CreateCommerceCampaign from "./pages/CreateCommerceCampaign";
import CreateManualCampaign from "./pages/CreateManualCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import CategorySelection from "./pages/CategorySelection";

import Ads from "./pages/Ads";
import Websites from "./pages/Websites";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCampaignDetail from "./pages/AdminCampaignDetail";
import AdminCampaigns from "./pages/AdminCampaigns";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSettings from "./pages/AdminSettings";
import AdminBlogs from "./pages/AdminBlogs";
import AdminContent from "./pages/AdminContent";
import AdminDesign from "./pages/AdminDesign";
import AdminCategories from "./pages/AdminCategories";
import AdminAdvertisers from "./pages/AdminAdvertisers";
import AdminWallets from "./pages/AdminWallets";
import AdminPartnerships from "./pages/AdminPartnerships";
import AdminMessages from "./pages/AdminMessages";
import AdminBroadcast from "./pages/AdminBroadcast";
import AdminExtension from "./pages/AdminExtension";
import AdminOfferwall from "./pages/AdminOfferwall";
import AdminLettersOfIntent from "./pages/AdminLettersOfIntent";
import AdminCompanySignature from "./pages/AdminCompanySignature";
import AdminMigrationOpportunities from "./pages/AdminMigrationOpportunities";
import AdminPackages from "./pages/AdminPackages";
import AdminPackageDelivery from "./pages/AdminPackageDelivery";
import AdminMilestones from "./pages/AdminMilestones";

import Packages from "./pages/Packages";
import PackageOrders from "./pages/PackageOrders";
import SwitchOffers from "./pages/SwitchOffers";
import AdminSwitchOffers from "./pages/AdminSwitchOffers";
import OfflineLOI from "./pages/OfflineLOI";
import OfflineLOIStatus from "./pages/OfflineLOIStatus";
import OfflineCampaignLaunch from "./pages/OfflineCampaignLaunch";
import Admin2FA from "./pages/Admin2FA";
import About from "./pages/About";
import Docs from "./pages/Docs";
import Terms from "./pages/Terms";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import WhatIsKarbali from "./pages/WhatIsKarbali";
import UseCases from "./pages/UseCases";
import Comparison from "./pages/Comparison";
import ProblemSolution from "./pages/ProblemSolution";
import ReferralRedirect from "./pages/ReferralRedirect";
import LearnHub from "./pages/LearnHub";
import LearnArticle from "./pages/LearnArticle";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Routes>
              <Route path="/ai" element={<RequireAuth><AiMode /></RequireAuth>} />

              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/r/:code" element={<ReferralRedirect />} />
              
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
              <Route path="/admin/switch-offers" element={<RequireAuth><RequireAdmin><AdminSwitchOffers /></RequireAdmin></RequireAuth>} />

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
              <Route path="/admin/2fa" element={<RequireAuth><Admin2FA /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/campaigns" element={<RequireAuth><RequireAdmin><AdminCampaigns /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/campaigns/:id" element={<RequireAuth><RequireAdmin><AdminCampaignDetail /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/analytics" element={<RequireAuth><RequireAdmin><AdminAnalytics /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/settings" element={<RequireAuth><RequireAdmin><AdminSettings /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/blogs" element={<RequireAuth><RequireAdmin><AdminBlogs /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/content" element={<RequireAuth><RequireAdmin><AdminContent /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/design" element={<RequireAuth><RequireAdmin><AdminDesign /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/categories" element={<RequireAuth><RequireAdmin><AdminCategories /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/partnerships" element={<RequireAuth><RequireAdmin><AdminPartnerships /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/advertisers" element={<RequireAuth><RequireAdmin><AdminAdvertisers /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/wallets" element={<RequireAuth><RequireAdmin><AdminWallets /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/messages" element={<RequireAuth><RequireAdmin><AdminMessages /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/broadcast" element={<RequireAuth><RequireAdmin><AdminBroadcast /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/extension" element={<RequireAuth><RequireAdmin><AdminExtension /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/offerwall" element={<RequireAuth><RequireAdmin><AdminOfferwall /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/loi" element={<RequireAuth><RequireAdmin><AdminLettersOfIntent /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/signature" element={<RequireAuth><RequireAdmin><AdminCompanySignature /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/migration-opportunities" element={<RequireAuth><RequireAdmin><AdminMigrationOpportunities /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/packages" element={<RequireAuth><RequireAdmin><AdminPackages /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/packages/orders/:orderId/deliver" element={<RequireAuth><RequireAdmin><AdminPackageDelivery /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/milestones" element={<RequireAuth><RequireAdmin><AdminMilestones /></RequireAdmin></RequireAuth>} />


              <Route path="*" element={<NotFound />} />
            </Routes>
            </AiModeProvider>
          </AuthProvider>
        </BrowserRouter>

      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
