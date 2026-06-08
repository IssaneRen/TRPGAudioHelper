import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import TabLayout from "@/components/TabLayout";
import { Skeleton } from "@/components/ui/skeleton";

const ProfileTab = lazy(() => import("@/pages/ProfileTab"));
const ToolboxTab = lazy(() => import("@/pages/ToolboxTab"));
const WorldWikiTab = lazy(() => import("@/pages/WorldWikiTab"));
const WorldWikiModulesTab = lazy(() => import("@/pages/WorldWikiModulesTab"));
const WorldWikiModuleDetailTab = lazy(() => import("@/pages/WorldWikiModuleDetailTab"));
const ModuleToolTab = lazy(() => import("@/pages/ModuleToolTab"));
const SoundboardTab = lazy(() => import("@/pages/SoundboardTab"));
const BattleSimulator = lazy(() => import("@/pages/ToolboxTab/BattleSimulator"));
const AiChatTab = lazy(() => import("@/pages/AiChatTab"));
const BlogTab = lazy(() => import("@/pages/BlogTab"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const WikiAdminTab = import.meta.env.DEV ? lazy(() => import("@/pages/WikiAdminTab")) : null;

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<TabLayout />}>
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
              <Route path="module-clue" element={<ModuleToolTab />} />
              <Route path="ai-chat" element={<AiChatTab />} />
            </Route>
            <Route path="blog" element={<BlogTab />} />
            <Route path="blog/:postId" element={<BlogTab />} />
          </Route>
          {/* 旧路由兼容重定向 */}
          <Route path="module-tool" element={<Navigate to="/tools/module-clue" replace />} />
          <Route path="soundboard" element={<Navigate to="/tools/soundboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
    </>
  );
}
