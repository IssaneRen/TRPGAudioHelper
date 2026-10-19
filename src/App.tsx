import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import TabLayout from "@/components/TabLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { legacyTrpgTarget } from "@/lib/trpg-routes";
import { SiteMetadata } from "@/components/SiteMetadata";
import { AnalyticsRouteTracker } from "@/features/analytics/AnalyticsRouteTracker";

const HomePage = lazy(() => import("@/pages/PersonalSite/HomePage"));
const PersonalProfile = lazy(() => import("@/pages/PersonalSite/PersonalProfile"));
const ProfileTab = lazy(() => import("@/pages/ProfileTab"));
const ToolboxTab = lazy(() => import("@/pages/ToolboxTab"));
const WorldWikiTab = lazy(() => import("@/pages/WorldWikiTab"));
const WorldWikiModulesTab = lazy(() => import("@/pages/WorldWikiModulesTab"));
const WorldWikiModuleDetailTab = lazy(() => import("@/pages/WorldWikiModuleDetailTab"));
const ModuleClueReviewTab = lazy(() => import("@/pages/ModuleClueReviewTab"));
const SoundboardTab = lazy(() => import("@/pages/SoundboardTab"));
const BattleSimulator = lazy(() => import("@/pages/ToolboxTab/BattleSimulator"));
const AiChatTab = lazy(() => import("@/pages/AiChatTab"));
const AnalyticsDashboardTab = lazy(() => import("@/pages/AnalyticsDashboardTab"));
const ContentAdminTab = lazy(() => import("@/pages/ContentAdminTab"));
const WorkbenchTab = lazy(() => import("@/pages/WorkbenchTab"));
const PortfolioTab = lazy(() => import("@/pages/PortfolioTab"));
const BlogTab = lazy(() => import("@/pages/BlogTab"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const WikiAdminTab = import.meta.env.DEV ? lazy(() => import("@/pages/WikiAdminTab")) : null;

function LegacyTrpgRedirect() {
  const location = useLocation();
  const pathname = legacyTrpgTarget(location.pathname);
  return pathname ? <Navigate to={{ pathname, search: location.search, hash: location.hash }} replace /> : <NotFound />;
}

function PageLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <AnalyticsRouteTracker />
      <SiteMetadata />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<PersonalProfile />} />
          <Route path="admin/content" element={<ContentAdminTab />} />
          <Route path="workbench" element={<WorkbenchTab />} />
          <Route path="portfolio" element={<PortfolioTab />} />
          <Route path="portfolio/:workId" element={<PortfolioTab />} />
          <Route path="trpg" element={<TabLayout />}>
            <Route index element={<ProfileTab />} />
            {import.meta.env.DEV && WikiAdminTab ? (
              <Route path="admin/wiki" element={<WikiAdminTab />} />
            ) : null}
            <Route path="tools" element={<ToolboxTab />}>
              <Route index element={<Navigate to="battle" replace />} />
              <Route path="battle" element={<BattleSimulator />} />
              <Route path="world-wiki" element={<WorldWikiTab />} />
              <Route path="world-wiki/:entryId" element={<WorldWikiTab />} />
              <Route path="world-wiki/modules" element={<WorldWikiModulesTab />} />
              <Route path="world-wiki/modules/:moduleId" element={<WorldWikiModuleDetailTab />} />
              <Route path="soundboard" element={<SoundboardTab />} />
              <Route path="module-clue" element={<ModuleClueReviewTab />} />
              <Route path="ai-chat" element={<AiChatTab />} />
              <Route path="dashboard" element={<AnalyticsDashboardTab />} />
            </Route>
            <Route path="blog" element={<BlogTab />} />
            <Route path="blog/:postId" element={<BlogTab />} />
          </Route>
          {/* 旧路由兼容重定向 */}
          <Route path="tools/*" element={<LegacyTrpgRedirect />} />
          <Route path="blog/*" element={<LegacyTrpgRedirect />} />
          <Route path="module-tool" element={<LegacyTrpgRedirect />} />
          <Route path="soundboard" element={<LegacyTrpgRedirect />} />
          {import.meta.env.DEV && <Route path="admin/wiki" element={<LegacyTrpgRedirect />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
    </>
  );
}
