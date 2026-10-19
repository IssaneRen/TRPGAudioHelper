import { useEffect } from "react";
import { Link } from "react-router";
import data from "@/content/personal-profile.json";
import "./profile-preview.css";

type HistoryItem = { organization: string; title: string; period: string; description: string };
type Profile = {
  name: string; alias: string; role: string; photo: string; intro: string[];
  contacts: { label: string; value: string }[];
  directions: { title: string; detail: string }[];
  experience: HistoryItem[]; education: HistoryItem[];
  projects: { name: string; description: string }[];
  awards: { period: string; title: string; description: string }[];
};
const profile: Profile = data;
function History({ items, placeholder }: { items: HistoryItem[]; placeholder: string }) {
  return items.length ? <ul>{items.map((item, i) => <li key={i}>{item.period} · {item.organization} · {item.title}{item.description && <p>{item.description}</p>}</li>)}</ul> : <p className="profile-placeholder">{placeholder}</p>;
}

export default function PersonalProfile() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  return <div className="profile-preview">
    <header className="profile-preview-masthead"><div className="profile-preview-width"><Link to="/">个人主页</Link><Link to="/">返回首页</Link></div></header>
    <main>
      <header className="profile-preview-banner">
        <div className="profile-preview-width profile-preview-identity">
          {profile.photo ? <img src={profile.photo} alt="个人照片" className="profile-preview-photo" /> : <div className="profile-preview-photo profile-preview-photo-placeholder">照片占位</div>}
          <div className="profile-preview-name"><h1>{profile.name} / {profile.alias}</h1><p>{profile.role || "职位 / 身份（待填写）"}</p></div>
        </div>
      </header>
      <div className="profile-preview-width profile-preview-content">
        <p className="profile-preview-notice">样式预览 · 以下内容均为占位，尚未填写个人资料。</p>
        <section><h2>基本信息</h2><dl className="profile-preview-info">{(profile.contacts.length ? profile.contacts : [{ label: "联系电话", value: "" }, { label: "电子邮件", value: "" }, { label: "联系地址", value: "" }, { label: "个人网站", value: "" }]).map(item => <div key={item.label}><dt>{item.label}：</dt><dd className={item.value ? undefined : "profile-placeholder"}>{item.value || "待填写"}</dd></div>)}</dl></section>
        <section><h2>个人简介</h2>{profile.intro.length ? profile.intro.map((text, i) => <p key={i}>{text}</p>) : <p className="profile-placeholder">个人简介（待填写）</p>}</section>
        <section><h2>教育经历</h2><History items={profile.education} placeholder="起止时间 · 学校 / 专业 / 学历（待填写）" /></section>
        <section><h2>工作经历</h2><History items={profile.experience} placeholder="起止时间 · 单位 / 职位（待填写）" /></section>
        <section><h2>研究与技术方向</h2>{profile.directions.length ? <ul>{profile.directions.map(item => <li key={item.title}>{item.title}<p>{item.detail}</p></li>)}</ul> : <p className="profile-placeholder">方向名称及说明（待填写）</p>}</section>
        <section><h2>项目与作品</h2>{profile.projects.length ? profile.projects.map((item, i) => <article key={i}><h3>{item.name}</h3><p>{item.description}</p></article>) : <p className="profile-placeholder">项目 / 作品名称及说明（待填写）</p>}</section>
        <section><h2>奖项与荣誉</h2>{profile.awards.length ? <ul>{profile.awards.map((item, i) => <li key={i}>{item.period} · {item.title}{item.description && <p>{item.description}</p>}</li>)}</ul> : <p className="profile-placeholder">年份 · 奖项 / 荣誉名称（待填写）</p>}</section>
      </div>
    </main>
    <footer className="profile-preview-footer"><div className="profile-preview-width"><span>Issane / Lucius</span><a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">沪ICP备2025112187号-2</a></div></footer>
  </div>;
}
