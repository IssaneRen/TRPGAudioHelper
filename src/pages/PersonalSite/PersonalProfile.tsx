import { Link } from "react-router";
import type { ReactNode } from "react";
import { SiteFrame } from "./SiteFrame";
import data from "@/content/personal-profile.json";

interface HistoryItem { organization: string; title: string; period: string; description: string; }
const experience: HistoryItem[] = data.experience;
function ProfileLink({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("/") ? <Link to={href}>{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export default function PersonalProfile() {
  const sections = [
    { id: "about", title: "个人简介" },
    { id: "focus", title: "技术方向" },
    ...(experience.length ? [{ id: "experience", title: "工作经历" }] : []),
    { id: "practice", title: "工作实践" },
    { id: "projects", title: "个人项目" },
    ...(data.education.length ? [{ id: "education", title: "教育背景" }] : []),
    { id: "links", title: "相关链接" },
  ];
  return <SiteFrame profile>
    <main id="personal-main" tabIndex={-1}>
      <header className="personal-profile-heading">
        <div><p className="personal-eyebrow">个人介绍</p><h1>{data.name}<span> / {data.alias}</span></h1><p>{data.role}</p></div>
        <div className="personal-profile-actions"><span>更新于 {data.updatedAt}</span><button type="button" onClick={() => window.print()}>打印 / 保存 PDF <span aria-hidden="true">↗</span></button></div>
      </header>
      <div className="personal-profile-grid">
        <aside className="personal-contents"><p>本页目录</p><nav aria-label="个人介绍目录">{sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</nav></aside>
        <div className="personal-profile-body">
          <section id="about"><h2>个人简介</h2>{data.intro.map(text => <p key={text}>{text}</p>)}</section>
          <section id="focus"><h2>技术方向</h2><dl className="personal-focus">{data.directions.map(direction => <div key={direction.title}><dt>{direction.title}</dt><dd>{direction.detail}</dd></div>)}</dl></section>
          {experience.length > 0 && <section id="experience"><h2>工作经历</h2>{experience.map(item => <article className="personal-history" key={`${item.organization}-${item.period}`}><span>{item.period}</span><div><h3>{item.organization}</h3><p>{item.title}</p>{item.description && <p>{item.description}</p>}</div></article>)}</section>}
          <section id="practice"><h2>工作实践</h2>{data.practice.map(item => <article className="personal-history" key={item.title}><span>{item.period}</span><div><h3>{item.title}</h3><p>{item.summary}</p></div></article>)}</section>
          <section id="projects"><h2>个人项目</h2>{data.projects.map(project => <article className="personal-project" key={project.name}><div className="personal-project-title"><h3>{project.name}</h3><span>{project.category}</span></div><p>{project.description}</p><p className="personal-project-stack">{project.stack}</p><div className="personal-project-links">{project.links.map(link => <ProfileLink key={link.href} href={link.href}>{link.label} <span aria-hidden="true">↗</span></ProfileLink>)}</div></article>)}</section>
          {data.education.length > 0 && <section id="education"><h2>教育背景</h2>{data.education.map(item => <article className="personal-history" key={item.organization}>{item.period && <span>{item.period}</span>}<div><h3>{item.organization}</h3><p>{item.title}</p>{item.description && <p>{item.description}</p>}</div></article>)}</section>}
          <section id="links"><h2>相关链接</h2><dl className="personal-links">{data.links.map(link => <div key={link.label}><dt>{link.label}</dt><dd><ProfileLink href={link.href}>{link.value} <span aria-hidden="true">↗</span></ProfileLink></dd></div>)}</dl></section>
        </div>
      </div>
    </main>
  </SiteFrame>;
}
