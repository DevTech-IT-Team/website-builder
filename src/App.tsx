import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import React, { Suspense } from "react";

const Index = React.lazy(() => import("./pages/Index"));
const DashboardLayout = React.lazy(() => import("./layouts/DashboardLayout"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const DashboardUsers = React.lazy(() => import("./pages/DashboardUsers"));
const DashboardWebsites = React.lazy(() => import("./pages/DashboardWebsites"));
const DashboardTemplates = React.lazy(() => import("./pages/DashboardTemplates"));
const DashboardDeployment = React.lazy(() => import("./pages/DashboardDeployment"));
const DashboardAssets = React.lazy(() => import("./pages/DashboardAssets"));
const DashboardSettings = React.lazy(() => import("./pages/DashboardSettings"));
const TemplateEditor = React.lazy(() => import("./pages/TemplateEditor"));
const Organizations = React.lazy(() => import("./pages/dashboard/Organizations"));
const WebsiteEditor = React.lazy(() => import("./components/editor/WebsiteEditor").then(m => ({ default: m.WebsiteEditor })));
const EditorShell = React.lazy(() => import("./features/editor").then(m => ({ default: m.EditorShell })));
const Login = React.lazy(() => import("./pages/Login"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));
const Features = React.lazy(() => import("./pages/Features"));
const Services = React.lazy(() => import("./pages/Services"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Start = React.lazy(() => import("./pages/Start"));
const Templates = React.lazy(() => import("./pages/Templates"));
const Resources = React.lazy(() => import("./pages/Resources"));
const About = React.lazy(() => import("./pages/About"));
const Blog = React.lazy(() => import("./pages/Blog"));
const Careers = React.lazy(() => import("./pages/Careers"));
const Help = React.lazy(() => import("./pages/Help"));
const Status = React.lazy(() => import("./pages/Status"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const GoogleCallback = React.lazy(() => import("./pages/GoogleCallback"));
const DashboardMessages = React.lazy(() => import("./pages/DashboardMessages"));
const DashboardAuditLogs = React.lazy(() => import("./pages/DashboardAuditLogs"));
const DashboardProfile = React.lazy(() => import("./pages/DashboardProfile"));

import { ScrollToTop } from "./components/utils/ScrollToTop";
import { JumpToTop } from "./components/ui/JumpToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthSessionProvider } from "./components/auth/AuthSessionProvider";
import Loading from "./components/Common/LoadingUI";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthSessionProvider>
          <ScrollToTop />
          <JumpToTop />
          <Suspense fallback={<Loading fullScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route element={<ProtectedRoute />}>
              {/* User dashboard — /dashboard/* */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="templates" element={<DashboardTemplates />} />
                <Route path="assets" element={<DashboardAssets />} />
                <Route path="messages" element={<DashboardMessages />} />
                {/* <Route path="settings" element={<DashboardSettings />} /> */}
                <Route path="profile" element={<DashboardProfile />} />
                {/* Old admin paths — redirect to /admin/* */}
                <Route path="users" element={<Navigate to="/admin/users" replace />} />
                <Route path="organizations" element={<Navigate to="/admin/organizations" replace />} />
                <Route path="websites" element={<Navigate to="/admin/websites" replace />} />
                <Route path="deployment" element={<Navigate to="/admin/deployment" replace />} />
                <Route path="audit" element={<Navigate to="/admin/audit" replace />} />
              </Route>
              {/* Admin dashboard — /admin/* */}
              <Route path="/admin" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<DashboardUsers />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="websites" element={<DashboardWebsites />} />
                <Route path="templates" element={<DashboardTemplates />} />
                <Route path="deployment" element={<DashboardDeployment />} />
                <Route path="assets" element={<DashboardAssets />} />
                <Route path="messages" element={<DashboardMessages />} />
                <Route path="audit" element={<DashboardAuditLogs />} />
                <Route path="profile" element={<DashboardProfile />} />
              </Route>
              <Route path="/builder/:id" element={<WebsiteEditor />} />
              <Route path="/editor" element={<EditorShell />} />
              <Route path="/template-builder/:id" element={<TemplateEditor />} />
            </Route>
            <Route path="/features" element={<Features />} />
            <Route path="/services" element={<Services />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/start" element={<Start />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/help" element={<Help />} />
            <Route path="/status" element={<Status />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </AuthSessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;
