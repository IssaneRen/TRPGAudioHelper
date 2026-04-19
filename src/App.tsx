import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import TabLayout from "@/components/TabLayout";
import { Skeleton } from "@/components/ui/skeleton";

const ProfileTab = lazy(() => import("@/pages/ProfileTab"));
const ModuleToolTab = lazy(() => import("@/pages/ModuleToolTab"));
const SoundboardTab = lazy(() => import("@/pages/SoundboardTab"));
const BlogTab = lazy(() => import("@/pages/BlogTab"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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
            <Route path="module-tool" element={<ModuleToolTab />} />
            <Route path="soundboard" element={<SoundboardTab />} />
            <Route path="blog" element={<BlogTab />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
    </>
  );
}
