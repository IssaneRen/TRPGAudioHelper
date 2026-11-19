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
  { id: "writing", name: "写作·笔", letter: "笔" },
  { id: "aesthetics", name: "美学·画", letter: "画" },
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
                {"href" in app ? (
                  <a className={styles.appRow} href={app.href} aria-labelledby={`${app.id}-name ${app.id}-open`} aria-describedby={`${app.id}-summary`}>
                    <img className={styles.appIcon} src={app.icon} width={74} height={74} alt="" />
                    <div>
                      <h3 className={styles.appName} id={`${app.id}-name`}>{app.name}</h3>
                      <p className={styles.appSummary} id={`${app.id}-summary`}>{app.summary}</p>
                    </div>
                    <span className={styles.open} id={`${app.id}-open`}>打开</span>
                  </a>
                ) : (
                  <div className={styles.appRow}>
                    <span className={`${styles.appIcon} ${styles.placeholderIcon}`} aria-hidden="true">{app.letter}</span>
                    <h3 className={styles.appName}>{app.name}</h3>
                    <span className={styles.pending}>未开放</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
