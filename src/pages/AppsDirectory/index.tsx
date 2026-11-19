import { Link } from "react-router";
import styles from "./apps.module.css";

const apps = [
  {
    id: "baiyu",
    name: "白羽阅读",
    summary: "收藏文章、划线和回顾。",
    href: "/apps/xinzhi-reader/",
    icon: "/apps/xinzhi-reader/baiyu-icon-192.png",
  },
];

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
            {apps.map(({ id, name, summary, href, icon }) => (
              <li key={id}>
                <a className={styles.appRow} href={href} aria-labelledby={`${id}-name ${id}-open`} aria-describedby={`${id}-summary`}>
                  <img className={styles.appIcon} src={icon} width={74} height={74} alt="" />
                  <div>
                    <h3 className={styles.appName} id={`${id}-name`}>{name}</h3>
                    <p className={styles.appSummary} id={`${id}-summary`}>{summary}</p>
                  </div>
                  <span className={styles.open} id={`${id}-open`}>打开</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
