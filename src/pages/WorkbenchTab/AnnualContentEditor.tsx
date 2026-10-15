import type { AnnualDocument } from "@/features/workbench/annual-document";

interface Props { document: AnnualDocument; onChange: (document: AnnualDocument) => void; }
export function AnnualContentEditor({ document: doc, onChange }: Props) {
  const field = (label: string, value: string, update: (value: string) => void, rows = 3) => <label>{label}<textarea rows={rows} maxLength={10_000} value={value} onChange={e => update(e.target.value)} /></label>;
  return <div className="studio-content-editor">
    <p className="studio-hint">直接修改下方内容，切换「预览效果」查看排版。保存后，内容和页面一起更新。</p>
    <div className="studio-fields"><label>页面标题<input maxLength={200} value={doc.title} onChange={e => onChange({ ...doc, title: e.target.value })} /></label><label>年份<select value={doc.year} onChange={e => onChange({ ...doc, year: Number(e.target.value) })}>{Array.from({ length: 101 }, (_, i) => 2000 + i).map(year => <option key={year} value={year}>{year}</option>)}</select></label></div>
    {field("开头说明", doc.intro, intro => onChange({ ...doc, intro }), 2)}
    <h3>年度主线</h3>
    {doc.themes.map((t, i) => {
      const patch = (values: Partial<typeof t>) => onChange({ ...doc, themes: doc.themes.map((x, j) => j === i ? { ...x, ...values } : x) });
      return <details className="studio-content-section" key={t.id} open={i === 0}><summary>{t.title || `主线 ${i + 1}`}</summary>
        {field("主线名称", t.title, title => patch({ title }), 1)}{field("一句话重点", t.headline, headline => patch({ headline }), 1)}
        {field("要解决的问题", t.goal, goal => patch({ goal }))}<p className="studio-hint">代表项目由下方项目的「所属主线」自动关联。</p>
        {field("阶段结果与已有材料", t.stage, stage => patch({ stage }))}{field("年底需要讲清楚什么", t.reviewQuestion, reviewQuestion => patch({ reviewQuestion }))}{field("下一步", t.next, next => patch({ next }))}
        <fieldset><legend>关联材料</legend>{doc.sources.map(s => <label className="studio-check" key={s.id}><input type="checkbox" checked={t.sourceIds.includes(s.id)} onChange={e => patch({ sourceIds: e.target.checked ? [...t.sourceIds, s.id] : t.sourceIds.filter(id => id !== s.id) })} />{s.label || "未命名材料"}</label>)}</fieldset>
      </details>;
    })}
    <button type="button" className="studio-button" disabled={doc.themes.length >= 20} onClick={() => onChange({ ...doc, themes: [...doc.themes, { id: crypto.randomUUID(), title: "新主线", headline: "", goal: "", projects: [], stage: "", reviewQuestion: "", next: "", sourceIds: [] }] })}>添加主线</button>
    <h3>代表项目</h3>
    {doc.projects.map((p, i) => {
      const patch = (values: Partial<typeof p>) => onChange({ ...doc, projects: doc.projects.map((x, j) => j === i ? { ...x, ...values } : x) });
      return <details className="studio-content-section" key={i}><summary>{p.title || `项目 ${i + 1}`}</summary>
        {field("项目名称", p.title, title => patch({ title }), 1)}<label>所属主线<select value={p.theme} onChange={e => patch({ theme: e.target.value })}><option value="">未分类</option>{doc.themes.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
        {field("解决什么问题", p.focus, focus => patch({ focus }))}{field("本人负责什么", p.contribution, contribution => patch({ contribution }))}{field("阶段结果", p.stage, stage => patch({ stage }))}{field("还需核实什么", p.gap, gap => patch({ gap }))}
        <fieldset><legend>关联材料</legend>{doc.sources.map(s => <label className="studio-check" key={s.id}><input type="checkbox" checked={p.sourceIds.includes(s.id)} onChange={e => patch({ sourceIds: e.target.checked ? [...p.sourceIds, s.id] : p.sourceIds.filter(id => id !== s.id) })} />{s.label || "未命名材料"}</label>)}</fieldset>
      </details>;
    })}
    <button type="button" className="studio-button" disabled={doc.projects.length >= 100} onClick={() => onChange({ ...doc, projects: [...doc.projects, { theme: doc.themes[0]?.id || "", title: "新项目", focus: "", stage: "", gap: "", contribution: "", sourceIds: [] }] })}>添加项目</button>
    <details className="studio-content-section"><summary>材料与证据（{doc.sources.length}）</summary>{doc.sources.map((s, i) => {
      const patch = (values: Partial<typeof s>) => onChange({ ...doc, sources: doc.sources.map((x, j) => j === i ? { ...x, ...values } : x) });
      return <fieldset key={s.id}><legend>{s.label || "新材料"}</legend>{field("材料名称", s.label, label => patch({ label }), 1)}{field("日期或范围", s.date, date => patch({ date }), 1)}{field("证据状态", s.type, type => patch({ type }), 1)}{field("链接、提交或文档路径", s.path, path => patch({ path }), 2)}</fieldset>;
    })}<button type="button" className="studio-button" disabled={doc.sources.length >= 300} onClick={() => onChange({ ...doc, sources: [...doc.sources, { id: crypto.randomUUID(), label: "新材料", date: "", type: "待核实", path: "" }] })}>添加证据</button></details>
    <details className="studio-content-section"><summary>数据覆盖与口径</summary>{field("本次整理了哪些数据、有哪些缺失", doc.coverage, coverage => onChange({ ...doc, coverage }), 6)}</details>
    <p className="studio-hint">原始笔记保留 {doc.notes.length} 条，作为本次汇报快照。日常笔记继续在「学习笔记」维护。</p>
  </div>;
}
