import { Link } from "react-router";
import { SiteFrame } from "./SiteFrame";
import profile from "@/content/personal-profile.json";

const destinations = [
  { number: "01", name: "个人介绍", href: "/profile", path: "/profile", description: "技术方向、项目与经历。" },
  { number: "02", name: "TRPG", href: "/trpg", path: "/trpg", description: "跑团、模组、世界 Wiki 和工具箱。" },
  { number: "03", name: "作品集", href: "/portfolio", path: "/portfolio", description: "公开的作品与创作记录。" },
  { number: "04", name: "工作台", href: "/workbench", path: "需登录", description: "计划、笔记和进行中的事情。" },
];

export default function HomePage() {
  return <SiteFrame>
    <main id="personal-main" className="personal-home" tabIndex={-1}>
      <section className="personal-home-intro" aria-labelledby="home-title">
        <p className="personal-eyebrow">个人主页</p>
        <h1 id="home-title">{profile.name}<span> / {profile.alias}</span><span className="personal-period">.</span></h1>
        <p className="personal-home-description">写代码，也做些自己的东西。<br />这里放个人介绍、项目和跑团相关内容。</p>
        <a className="personal-inline-link" href="https://github.com/IssaneRen" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      </section>
      <nav className="personal-directory" aria-label="网站入口">
        {destinations.map(item => <Link key={item.href} to={item.href} className="personal-directory-row">
          <span className="personal-directory-number" aria-hidden="true">{item.number}</span>
          <span className="personal-directory-copy"><strong>{item.name}</strong><span>{item.description}</span></span>
          <span className="personal-directory-path">{item.path}</span>
          <span className="personal-directory-arrow" aria-hidden="true">↗</span>
        </Link>)}
      </nav>
      <p className="personal-migration">原 TRPG 站点已迁移至 <Link to="/trpg">issane.cn/trpg</Link>，原有工具和内容仍可使用。</p>
    </main>
  </SiteFrame>;
}
