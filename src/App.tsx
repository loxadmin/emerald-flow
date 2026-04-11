import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, RequireAdmin } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CampaignRouter from "./pages/CampaignRouter";
import CreateCampaign from "./pages/CreateCampaign";
import CreateEngagementCampaign from "./pages/CreateEngagementCampaign";
import CreateCommerceCampaign from "./pages/CreateCommerceCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import CategorySelection from "./pages/CategorySelection";
import Ads from "./pages/Ads";
import Websites from "./pages/Websites";
import Wallet from "./pages/Wallet";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCampaignDetail from "./pages/AdminCampaignDetail";
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
import AdminExtension from "./pages/AdminExtension";
import About from "./pages/About";
import Docs from "./pages/Docs";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import WhatIsKarbali from "./pages/WhatIsKarbali";
import UseCases from "./pages/UseCases";
import Comparison from "./pages/Comparison";
import ReferralRedirect from "./pages/ReferralRedirect";
import ExtensionDownload from "./pages/ExtensionDownload";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/r/:code" element={<ReferralRedirect />} />
              
              {/* Advertiser routes */}
              <Route path="/category-select" element={<RequireAuth><CategorySelection /></RequireAuth>} />
              <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/ads" element={<RequireAuth><Ads /></RequireAuth>} />
              <Route path="/websites" element={<RequireAuth><Websites /></RequireAuth>} />
              <Route path="/campaigns/create" element={<RequireAuth><CampaignRouter /></RequireAuth>} />
              <Route path="/campaigns/create/performance" element={<RequireAuth><CreateCampaign /></RequireAuth>} />
              <Route path="/campaigns/create/engagement" element={<RequireAuth><CreateEngagementCampaign /></RequireAuth>} />
              <Route path="/campaigns/create/commerce" element={<RequireAuth><CreateCommerceCampaign /></RequireAuth>} />
              <Route path="/campaigns/:id" element={<RequireAuth><CampaignDetail /></RequireAuth>} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/about" element={<About />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/what-is-karbali" element={<WhatIsKarbali />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/vs/:competitor" element={<Comparison />} />
              <Route path="/extension" element={<RequireAuth><RequireAdmin><ExtensionDownload /></RequireAdmin></RequireAuth>} />

              {/* Admin routes (separate panel) */}
              <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />
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
              <Route path="/admin/extension" element={<RequireAuth><RequireAdmin><AdminExtension /></RequireAdmin></RequireAuth>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
