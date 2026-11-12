import { useState } from "react";

interface Props { body: string; onChange: (body: string) => void; }
function contentModel(body: string) {
  const doc = new DOMParser().parseFromString(body, "text/html");
  const nodes: Text[] = [];
  const isBlank = !body.trim();
  if (isBlank) {
    doc.documentElement.lang = "zh-CN";
    const charset = doc.createElement("meta");
    charset.setAttribute("charset", "utf-8");
    doc.head.append(charset);
    const paragraph = doc.createElement("p");
    paragraph.setAttribute("data-workbench-body", "");
    paragraph.style.whiteSpace = "pre-wrap";
    const text = doc.createTextNode("");
    paragraph.append(text);
    doc.body.append(paragraph);
    nodes.push(text);
  }
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent?.trim() && !node.parentElement?.closest("script,style,noscript,code,pre,svg,template")) nodes.push(node);
  }
  const isPlainBody = nodes.length === 1 && doc.body.children.length === 1 && nodes[0].parentElement?.hasAttribute("data-workbench-body");
  return { doc, nodes, isPlainBody };
}
export function HtmlContentEditor({ body, onChange }: Props) {
  const [model] = useState(() => contentModel(body));
  const [values, setValues] = useState(() => model.nodes.map(n => n.textContent || ""));
  const [query, setQuery] = useState("");
  return <div className="studio-content-editor"><p className="studio-hint">{model.isPlainBody ? "直接输入正文，换行会保留。需要自定义页面布局时，可切换「高级源码」。" : "修改页面文案，样式和布局会保留。脚本动态生成的文字需要在「高级源码」中修改。"}</p>
    {!model.isPlainBody && <label>查找页面文案<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="输入要修改的文字" /></label>}
    {model.nodes.length === 0 && <p>当前没有可提取的静态文案。可切换「高级源码」添加页面结构。</p>}
    {model.nodes.map((node, i) => <label key={i} hidden={Boolean(query) && !values[i].toLowerCase().includes(query.toLowerCase())}>{model.isPlainBody ? "正文" : `${/^H[1-6]$/.test(node.parentElement?.tagName || "") ? "标题" : "文案"} ${i + 1}`}<textarea rows={model.isPlainBody ? 18 : values[i].length > 80 ? 3 : 1} maxLength={10_000} value={values[i]} placeholder={model.isPlainBody ? "从这里开始写正文…" : undefined} onChange={e => {
      const value = e.target.value;
      node.textContent = value;
      setValues(old => old.map((x, j) => j === i ? value : x));
      onChange(model.isPlainBody && !value.trim() ? "" : `<!doctype html>\n${model.doc.documentElement.outerHTML}`);
    }} /></label>)}
  </div>;
}
