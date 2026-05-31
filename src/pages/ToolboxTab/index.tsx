import { Suspense } from "react";
import { Outlet } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";

function ToolLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ToolboxTab() {
  return (
    <Suspense fallback={<ToolLoader />}>
      <Outlet />
    </Suspense>
  );
}
