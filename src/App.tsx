import { Routes, Route } from "react-router";
import TabLayout from "@/components/TabLayout";
import ProfileTab from "@/pages/ProfileTab";
import ModuleToolTab from "@/pages/ModuleToolTab";
import BlogTab from "@/pages/BlogTab";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route index element={<ProfileTab />} />
        <Route path="module-tool" element={<ModuleToolTab />} />
        <Route path="blog" element={<BlogTab />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
