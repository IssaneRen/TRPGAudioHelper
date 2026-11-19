import { useState } from "react";
import { documentKinds, type Graph } from "@/features/knowledge/knowledge-client";

export function KnowledgeGraph({ graph, onOpen }: { graph: Graph; onOpen: (id: string) => void }) {
  const [selection, setSelection] = useState("");
  const [filter, setFilter] = useState("");
  const linked = new Set(graph.edges.flatMap((edge) => [edge.sourceId, edge.targetId]));
  const node = graph.nodes.find((item) => item.id === selection);
  const related = graph.edges.filter((edge) => edge.sourceId === node?.id || edge.targetId === node?.id);
  const neighborIds = new Set(related.flatMap((edge) => [edge.sourceId, edge.targetId]));
  const filtered = graph.nodes.filter((item) => item.title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()));
  // 未选中时按标题定位。选中一个节点后，优先展示该文章及其直接相关的文章。
  // 画布限制为 18 个节点，关系清单仍可逐条打开或继续跳转。
  const shown = node
    ? [node, ...graph.nodes.filter((item) => item.id !== node.id && neighborIds.has(item.id)).slice(0, 17)]
    : filtered.slice(0, 18);
  // 坐标在浏览器里计算。一个节点居中，两个横排，更多节点沿椭圆分布。
  const positions = new Map(shown.map((item, index) => {
    if (shown.length === 1) return [item.id, { x: 370, y: 190 }];
    if (shown.length === 2) return [item.id, { x: 216 + index * 308, y: 190 }];
    const angle = index * 2 * Math.PI / shown.length - Math.PI / 2;
    return [item.id, { x: 370 + 262 * Math.cos(angle), y: 190 + 146 * Math.sin(angle) }];
  }));
  const isolated = graph.nodes.filter((item) => !linked.has(item.id));
  const indexed = graph.nodes.reduce((total, item) => total + item.chunkCount, 0);

  return <div className="kb-stack">
    <div className="kb-metrics">
      <div><strong>{graph.nodes.length}</strong><span>文章</span></div>
      <div><strong>{graph.edges.length}</strong><span>关系</span></div>
      <div><strong>{indexed}</strong><span>检索切片</span></div>
      <div><strong>{isolated.length}</strong><span>未关联文章</span></div>
    </div>
    <section className="kb-panel kb-stack">
      <header className="kb-row kb-between">
        <h2>关系图</h2>
        <label className="kb-inline-field">定位文章
          <input value={filter} onChange={(event) => { setFilter(event.target.value); setSelection(""); }} placeholder="按标题查找" />
        </label>
      </header>
      {shown.length ? <svg className="kb-graph" viewBox="0 0 740 380" aria-label="当前世界观的文章关系图">
        <defs><marker id="kb-arrow" markerWidth="8" markerHeight="8" viewBox="0 0 10 10" refX="8" refY="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
        {graph.edges.map((edge) => {
          const from = positions.get(edge.sourceId);
          const to = positions.get(edge.targetId);
          if (!from || !to) return null;
          const distance = Math.hypot(to.x - from.x, to.y - from.y);
          // 让箭头在线的目标端提前停下，箭头能落在圆形节点外边缘。
          const margin = Math.min(distance * 0.3, 25);
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x + (from.x - to.x) * margin / distance}
            y2={to.y + (from.y - to.y) * margin / distance} markerEnd="url(#kb-arrow)"><title>{edge.label}</title></line>;
        })}
        {shown.map((item) => {
          const position = positions.get(item.id)!;
          return <g key={item.id} transform={`translate(${position.x} ${position.y})`} role="button" tabIndex={0}
            aria-label={`${documentKinds[item.kind]} ${item.title}`} aria-pressed={selection === item.id}
            onClick={() => setSelection(selection === item.id ? "" : item.id)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelection(selection === item.id ? "" : item.id); } }}>
            <circle r="18" /><text y="4">{documentKinds[item.kind][0]}</text>
            <text className="kb-graph-label" y="34">{item.title.length > 12 ? item.title.slice(0, 12) + "…" : item.title}</text>
          </g>;
        })}
      </svg> : <p className="kb-muted">暂无可显示的文章。</p>}
      {filtered.length > 18 && !node && <p className="kb-muted">图中显示前 18 篇文章，可通过标题定位其余节点。</p>}
      {node && <div className="kb-stack">
        <div className="kb-row kb-between"><h3>{node.title}</h3><button onClick={() => onOpen(node.id)}>打开文章</button></div>
        {related.map((edge) => {
          // 传入关系指向当前节点，传出关系从当前节点发起。箭头符号帮助读出引用方向。
          const incoming = edge.targetId === node.id;
          const other = graph.nodes.find((item) => item.id === (incoming ? edge.sourceId : edge.targetId));
          return <button type="button" className="kb-list-item" key={edge.id} onClick={() => other && setSelection(other.id)}>
            {incoming ? "←" : "→"} {edge.label} · {other?.title}
          </button>;
        })}
        <button className="kb-start" type="button" onClick={() => setSelection("")}>显示全图</button>
      </div>}
    </section>
    {isolated.length > 0 && <details className="kb-panel"><summary>检查未关联文章（{isolated.length}）</summary>
      <div className="kb-chip-list">{isolated.map((item) => <button key={item.id} type="button" onClick={() => onOpen(item.id)}>{item.title}</button>)}</div>
    </details>}
  </div>;
}
