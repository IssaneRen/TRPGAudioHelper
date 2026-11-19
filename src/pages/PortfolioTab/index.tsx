import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { WorkMarkdown } from "@/features/workbench/WorkMarkdown";
import { readPortfolio, readPublishedWork, type PublishedWork, type WorkSummary } from "@/features/workbench/workbench-client";
import "../WorkbenchTab/workbench.css";

const labels: Record<PublishedWork["kind"], string> = { "ai-comic": "AI 漫剧", "trpg-log": "跑团 Log", "ai-image": "AI 生图", "ai-novel": "AI 小说", novel: "自写小说", html: "HTML 作品", module: "模组", setting: "设定" };

export default function PortfolioTab() {
  const { workId } = useParams();
  // 作品变化时重建阅读页状态，读取下一篇期间清除旧标题、正文和错误提示。
  return <PortfolioView key={workId ?? "list"} workId={workId} />;
}

// 公共列表和正文直接读取作品 API，进入这个页面无需建立维护者会话。
function PortfolioView({ workId }: { workId?: string }) {
  const [list, setList] = useState<WorkSummary[]>([]);
  const [work, setWork] = useState<PublishedWork | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (workId) readPublishedWork(workId).then((item) => { if (active) setWork(item); }).catch(() => { if (active) setError("作品不存在或尚未发布。"); });
    else readPortfolio().then((items) => { if (active) setList(items); }).catch(() => { if (active) setError("作品列表暂时不可用。"); });
    return () => { active = false; };
  }, [workId]);
  return <main className="portfolio"><header><Link to="/portfolio">ISSANE / PORTFOLIO</Link><h1>{work?.title ?? "作品集"}</h1><p>{work?.summary ?? "故事、图像与实验。"}</p></header>{error && <p role="alert">{error}</p>}{workId ? work && <section className="portfolio-work"><p className="wb-eyebrow">{labels[work.kind]}</p>{work.coverUrl && <img src={work.coverUrl} alt="" />}{work.kind === "html" ? <iframe title={work.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={work.body} /> : <article className="prose prose-invert"><WorkMarkdown body={work.body} /></article>}</section> : <div className="portfolio-list">{list.map((item) => <Link key={item.id} to={`/portfolio/${item.id}`} className="portfolio-card">{item.coverUrl && <img src={item.coverUrl} alt="" />}<span>{labels[item.kind]}</span><h2>{item.title}</h2><p>{item.summary}</p></Link>)}{!list.length && !error && <p>暂无已发布作品。</p>}</div>}</main>;
}
