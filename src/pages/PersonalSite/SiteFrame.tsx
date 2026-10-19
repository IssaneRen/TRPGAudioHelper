import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import "./personal-site.css";

export function SiteFrame({ children, profile = false }: { children: ReactNode; profile?: boolean }) {
  return <div className={`personal-site${profile ? " personal-profile" : ""}`}>
    <a className="personal-skip" href="#personal-main">跳到正文</a>
    <div className="personal-shell">
      <header className="personal-header">
        <Link className="personal-brand" to="/">issane<span>.cn</span></Link>
        <nav aria-label="个人网站导航">
          <NavLink to="/" end>首页</NavLink>
          <NavLink to="/profile">关于我</NavLink>
          <Link to="/trpg">TRPG ↗</Link>
        </nav>
      </header>
      {children}
      <footer className="personal-footer">
        <span>Issane / Lucius</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">沪ICP备2025112187号-2</a>
      </footer>
    </div>
  </div>;
}
