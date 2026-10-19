import { useEffect } from "react";
import { useLocation } from "react-router";
import { legacyTrpgTarget } from "@/lib/trpg-routes";

export function SiteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = legacyTrpgTarget(pathname) ?? pathname;
    const isTrpg = path === "/trpg" || path.startsWith("/trpg/");
    document.title = path === "/" ? "Issane · 个人主页" : path === "/profile" ? "Issane / Lucius · 个人介绍" : isTrpg ? "TRPG Lucius Helper" : path.startsWith("/workbench") ? "Issane · 工作台" : path.startsWith("/portfolio") ? "Issane · 作品集" : "Issane";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = isTrpg ? "TRPG 跑团主页、模组、世界 Wiki 与工具箱。" : path === "/profile" ? "个人资料页样式预览，内容待填写。" : "Issane / Lucius 的个人网站入口。";
  }, [pathname]);
  return null;
}
