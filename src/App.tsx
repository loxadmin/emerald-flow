import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth, RequireAdmin } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateCampaign from "./pages/CreateCampaign";
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
import About from "./pages/About";
import Docs from "./pages/Docs";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import WhatIsKarbali from "./pages/WhatIsKarbali";
import UseCases from "./pages/UseCases";
import Comparison from "./pages/Comparison";
import ReferralRedirect from "./pages/ReferralRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/r/:code" element={<PageTransition><ReferralRedirect /></PageTransition>} />

        {/* Advertiser routes */}
        <Route path="/category-select" element={<RequireAuth><PageTransition><CategorySelection /></PageTransition></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth><PageTransition><Wallet /></PageTransition></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><PageTransition><Dashboard /></PageTransition></RequireAuth>} />
        <Route path="/ads" element={<RequireAuth><PageTransition><Ads /></PageTransition></RequireAuth>} />
        <Route path="/websites" element={<RequireAuth><PageTransition><Websites /></PageTransition></RequireAuth>} />
        <Route path="/campaigns/create" element={<RequireAuth><PageTransition><CreateCampaign /></PageTransition></RequireAuth>} />
        <Route path="/campaigns/:id" element={<RequireAuth><PageTransition><CampaignDetail /></PageTransition></RequireAuth>} />
        <Route path="/docs" element={<PageTransition><Docs /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><BlogList /></PageTransition>} />
        <Route path="/blog/:slug" element={<PageTransition><BlogPost /></PageTransition>} />
        <Route path="/what-is-karbali" element={<PageTransition><WhatIsKarbali /></PageTransition>} />
        <Route path="/use-cases" element={<PageTransition><UseCases /></PageTransition>} />
        <Route path="/vs/:competitor" element={<PageTransition><Comparison /></PageTransition>} />

        {/* Admin routes (separate panel) */}
        <Route path="/admin" element={<RequireAuth><RequireAdmin><PageTransition><AdminDashboard /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/campaigns/:id" element={<RequireAuth><RequireAdmin><PageTransition><AdminCampaignDetail /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/analytics" element={<RequireAuth><RequireAdmin><PageTransition><AdminAnalytics /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/settings" element={<RequireAuth><RequireAdmin><PageTransition><AdminSettings /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/blogs" element={<RequireAuth><RequireAdmin><PageTransition><AdminBlogs /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/content" element={<RequireAuth><RequireAdmin><PageTransition><AdminContent /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/design" element={<RequireAuth><RequireAdmin><PageTransition><AdminDesign /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/categories" element={<RequireAuth><RequireAdmin><PageTransition><AdminCategories /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/partnerships" element={<RequireAuth><RequireAdmin><PageTransition><AdminPartnerships /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/advertisers" element={<RequireAuth><RequireAdmin><PageTransition><AdminAdvertisers /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/wallets" element={<RequireAuth><RequireAdmin><PageTransition><AdminWallets /></PageTransition></RequireAdmin></RequireAuth>} />
        <Route path="/admin/messages" element={<RequireAuth><RequireAdmin><PageTransition><AdminMessages /></PageTransition></RequireAdmin></RequireAuth>} />

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
