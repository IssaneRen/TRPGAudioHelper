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
    if (description) description.content = isTrpg ? "TRPG 跑团主页、模组、世界 Wiki 与工具箱。" : "Issane / Lucius 的个人主页。客户端与跨端开发、前端工具和 AI 研发实践。";
  }, [pathname]);
  return null;
}
