import { Link } from "react-router";
import styles from "./apps.module.css";

const apps = [
  {
    id: "reading",
    name: "阅读·书",
    summary: "收藏文章、划线和回顾。",
    href: "/apps/xinzhi-reader/",
    icon: "/apps/xinzhi-reader/reading-icon-192.png",
  },
  {
    id: "writing",
    name: "写作·笔",
    summary: "章节、大纲连线、关系图谱与设定档案，内容可导入导出。",
    href: "/apps/writing-pen/",
    icon: "/apps/writing-pen/pen-icon-192.png",
  },
  {
    id: "music",
    name: "音乐·听",
    summary: "听公开曲目，用四条音轨编曲，导出曲谱或 WAV。",
    href: "/apps/music-listen/studio/",
    icon: "/apps/music-listen/note.png",
  },
  {
    id: "aesthetics",
    name: "美学·画",
    summary: "浏览摄影与 AIGC 作品。",
    href: "/apps/gallery/",
    icon: "/apps/gallery/icon.png",
  },
] as const;

export default function AppsDirectory() {
  return (
    <div className={styles.directory}>
      <header className={styles.siteBar}>
        <nav className={`${styles.wrap} ${styles.siteNav}`} aria-label="站点导航">
          <Link className={styles.siteName} to="/">Issane</Link>
          <span aria-current="page">应用</span>
        </nav>
      </header>

      <main className={`${styles.wrap} ${styles.page}`}>
        <div className={styles.intro}>
          <h1>应用</h1>
          <p>在浏览器里打开 Issane 的小工具。</p>
        </div>

        <section aria-labelledby="app-list-heading">
          <h2 className={styles.sectionTitle} id="app-list-heading">所有应用</h2>
          <ul className={styles.appList} role="list">
            {apps.map((app) => (
              <li key={app.id}>
                <a className={styles.appRow} href={app.href} aria-labelledby={`${app.id}-name ${app.id}-open`} aria-describedby={`${app.id}-summary`}>
                  <img className={styles.appIcon} src={app.icon} width={74} height={74} alt="" />
                  <div>
                    <h3 className={styles.appName} id={`${app.id}-name`}>{app.name}</h3>
                    <p className={styles.appSummary} id={`${app.id}-summary`}>{app.summary}</p>
                  </div>
                  <span className={styles.open} id={`${app.id}-open`}>打开</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
