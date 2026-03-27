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
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCampaignDetail from "./pages/AdminCampaignDetail";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSettings from "./pages/AdminSettings";
import AdminContent from "./pages/AdminContent";
import Docs from "./pages/Docs";
import ReferralRedirect from "./pages/ReferralRedirect";
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
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/campaigns/create" element={<RequireAuth><CreateCampaign /></RequireAuth>} />
              <Route path="/campaigns/:id" element={<RequireAuth><CampaignDetail /></RequireAuth>} />
              <Route path="/docs" element={<Docs />} />

              {/* Admin routes */}
              <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminDashboard /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/campaigns/:id" element={<RequireAuth><RequireAdmin><AdminCampaignDetail /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/analytics" element={<RequireAuth><RequireAdmin><AdminAnalytics /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/settings" element={<RequireAuth><RequireAdmin><AdminSettings /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/content" element={<RequireAuth><RequireAdmin><AdminContent /></RequireAdmin></RequireAuth>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
