import { z } from "zod";

const text = z.string().max(10_000);
const ids = z.array(z.string().max(100)).max(300);
export const annualDocumentSchema = z.object({
  version: z.literal(1), title: z.string().max(200), intro: text, year: z.number().int().min(2000).max(2100), coverage: text,
  themes: z.array(z.object({ id: z.string().max(100), title: text, headline: text, goal: text, projects: z.array(text).max(100), stage: text, reviewQuestion: text, next: text, sourceIds: ids })).max(20),
  projects: z.array(z.object({ theme: z.string().max(100), title: text, focus: text, stage: text, gap: text, contribution: text.default(""), sourceIds: ids })).max(100),
  sources: z.array(z.object({ id: z.string().max(100), label: text, type: text, path: text, date: text })).max(300),
  notes: z.array(z.object({ title: text, track: text, date: text, scope: text, quote: text, source: text, evidence: text })).max(300),
});
export type AnnualDocument = z.infer<typeof annualDocumentSchema>;
const marker = /<script id="workbench-annual" type="application\/json">([\s\S]*?)<\/script>/;
export const detachAnnualDocument = (body: string) => body.replace(marker, "");
export function readAnnualDocument(body: string): AnnualDocument | null {
  const match = marker.exec(body);
  if (!match) return null;
  try { const result = annualDocumentSchema.safeParse(JSON.parse(match[1])); return result.success ? result.data : null; }
  catch { return null; }
}
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function renderAnnualDocument(input: AnnualDocument): string {
  const doc = annualDocumentSchema.parse(input);
  // One project collection owns names and theme membership, including summary cards.
  doc.themes = doc.themes.map(t => ({ ...t, projects: doc.projects.filter(p => p.theme === t.id).map(p => p.title) }));
  const p = (value: string) => `<p>${escape(value).replace(/\n/g, "<br>")}</p>`;
  const sources = (refs: string[]) => `<details><summary>材料依据</summary>${refs.map(id => doc.sources.find(s => s.id === id)).filter(s => s !== undefined).map(s => `<h4>${escape(s.label)}</h4>${p(`${s.date} · ${s.type}`)}<code>${escape(s.path)}</code>`).join("")}</details>`;
  const themes = doc.themes.map((t, i) => `<article><small>0${i + 1} / ${escape(t.title)}</small><h2>${escape(t.headline)}</h2>${p(t.goal)}<h3>代表项目</h3>${p(t.projects.join(" · "))}<h3>阶段结果</h3>${p(t.stage)}<h3>年底讲清楚</h3>${p(t.reviewQuestion)}<aside><b>下一步</b>${p(t.next)}</aside>${sources(t.sourceIds)}</article>`).join("");
  const projects = doc.projects.map(t => `<article><small>${escape(doc.themes.find(x => x.id === t.theme)?.title || "其他项目")}</small><h2>${escape(t.title)}</h2>${p(t.focus)}<h3>本人负责</h3>${p(t.contribution || "待补充") }<h3>阶段结果</h3>${p(t.stage)}<h3>还需核实</h3>${p(t.gap)}${sources(t.sourceIds)}</article>`).join("");
  const notes = doc.notes.map(n => `<article data-note><small>${escape(n.track)} / ${escape(n.scope)} / ${escape(n.date)}</small><h2>${escape(n.title)}</h2>${p(n.quote)}<details><summary>来源与结果</summary>${p(n.evidence)}<code>${escape(n.source)}</code></details></article>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(doc.title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f8f6ee;color:#213b33;font:14px/1.7 'PingFang SC','Microsoft YaHei',sans-serif}main{max-width:1200px;margin:auto;padding:30px}header{border-bottom:2px solid #213b33;padding-bottom:20px}h1{font:36px/1.3 'Songti SC',serif;margin:12px 0}small{color:#9a573d;font-size:12px}header p{color:#667168}nav{display:flex;gap:24px;border-bottom:1px solid #d7ddcf;margin:22px 0}button{font:inherit;cursor:pointer;background:transparent;border:0;border-bottom:3px solid transparent;padding:10px 0;color:inherit}button[aria-selected=true]{border-color:#213b33;font-weight:bold}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.projects{grid-template-columns:repeat(2,minmax(0,1fr))}article{background:#fffef9;border:1px solid #d7ddcf;border-radius:8px;padding:22px;overflow-wrap:anywhere}h2{font:23px/1.5 'Songti SC',serif;margin:14px 0}h3{font-size:12px;color:#69746b;font-weight:500;border-top:1px solid #e1e5db;padding-top:14px;margin-top:20px}p{white-space:normal}aside{background:#ecf0e4;padding:12px;margin-top:20px;font-size:12px}aside p{margin:5px 0}details{font-size:12px;margin-top:20px}summary{cursor:pointer}code{overflow-wrap:anywhere;font-size:11px}input{font:inherit;padding:10px 14px;background:white;border:1px solid #d7ddcf;border-radius:6px;width:100%;margin-bottom:20px}footer{margin-top:24px;color:#6a756b;font-size:12px}.coverage{margin:18px 0;padding:12px 16px;border:1px solid #d7ddcf;border-radius:6px}[hidden]{display:none!important}:focus-visible{outline:2px solid #a75737;outline-offset:3px}@media(max-width:620px){main{padding:18px}.grid{grid-template-columns:1fr}h1{font-size:29px}}
</style></head><body><main><header><small>LUCIUS / ${doc.year} / WORK REVIEW</small><h1>${escape(doc.title)}</h1>${p(doc.intro)}</header><details class="coverage"><summary>数据覆盖与统计口径</summary>${p(doc.coverage)}</details><nav role="tablist" aria-label="年度资料层级"><button role="tab" aria-selected="true" data-tab="themes">年度主线</button><button role="tab" aria-selected="false" data-tab="projects">代表项目</button><button role="tab" aria-selected="false" data-tab="notes">原始笔记</button></nav><section id="themes" role="tabpanel"><div class="grid">${themes}</div></section><section id="projects" role="tabpanel" hidden><div class="grid projects">${projects}</div></section><section id="notes" role="tabpanel" hidden><input type="search" aria-label="搜索原始笔记" placeholder="搜索技术方向、原话或项目"><div class="grid projects">${notes}</div><p id="note-count" aria-live="polite"></p></section><footer>已有材料、本人贡献和待核实结果分别记录。原始笔记为过程依据；个人实验不计作公司成果。</footer></main><script id="workbench-annual" type="application/json">${JSON.stringify(doc).replace(/</g, "\\u003c")}</script><script>
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!==b.dataset.tab)}));document.querySelector('input').addEventListener('input',e=>{const q=e.target.value.toLowerCase();let count=0;document.querySelectorAll('[data-note]').forEach(n=>{n.hidden=!n.textContent.toLowerCase().includes(q);if(!n.hidden)count++});document.querySelector('#note-count').textContent=count+' 条过程记录'});
</script></body></html>`;
}
