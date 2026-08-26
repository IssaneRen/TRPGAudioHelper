const examples = [
  ["heading", { type: "heading", text: "章节标题" }],
  ["paragraph + text", { type: "paragraph", tokens: [{ type: "text", text: "公开文本", bold: true, strikethrough: false, color: "#8f6b32" }] }],
  ["ref", { type: "paragraph", tokens: [{ type: "ref", entryId: "loc.arkham", label: "阿卡姆" }] }],
  ["secret-inline", { type: "paragraph", tokens: [{ type: "secret-inline", playerIds: ["pl.cici"], text: "句内秘密" }] }],
  ["list", { type: "list", items: [[{ type: "text", text: "第一项" }], [{ type: "ref", entryId: "char.allen", label: "艾伦" }]] }],
  ["quote", { type: "quote", tokens: [{ type: "text", text: "引文" }] }],
  ["image", { type: "image", src: "/content-assets/2026/08/cover.png", alt: "替代文本", caption: "图片说明" }],
  ["secret-panel / mask", { type: "secret-panel", title: "加密档案", hiddenMode: "mask", playerIds: ["pl.cici"], blocks: [{ type: "paragraph", tokens: [{ type: "text", text: "整块隐藏" }] }] }],
  ["secret-panel / collapse", { type: "secret-panel", title: "完全隐藏", hiddenMode: "collapse", playerIds: ["pl.cici"], blocks: [] }],
  ["coc-sheet", { type: "coc-sheet", cocData: { avatar: "/content-assets/avatar.png", attributes: { str: 50, con: 50, siz: 50, dex: 50, int: 50, pow: 50, app: 50, edu: 50, hp: 10, maxHp: 10, mp: 10, maxMp: 10, san: 50, maxSan: 50 }, skills: { 侦查: { base: 50, growth: 5, changes: [{ delta: 5, reason: "场次成长" }] } } } }]
] as const;

export function ContentGuide() {
  return (
    <aside className="content-guide" aria-label="内容格式说明">
      <div className="content-guide__sticky">
        <p className="content-kicker">FORMAT LEDGER</p>
        <h2>格式账簿</h2>
        <p className="content-guide__intro">
          结构化模式覆盖当前全部 Wiki JSON。复杂字段可切换“原始 JSON”直接编辑。
        </p>
        <div className="content-guide__notes">
          <p><b>mask</b>：保留黑色遮罩占位。</p>
          <p><b>collapse</b>：未授权时整块不渲染。</p>
          <p><b>空 playerIds</b>：默认无人可见。</p>
          <p><b>图片</b>：上传后使用 `/content-assets/...`。</p>
        </div>
        <div className="content-guide__examples">
          {examples.map(([label, example]) => (
            <details key={label} open={label === "secret-panel / mask"}>
              <summary>{label}</summary>
              <pre>{JSON.stringify(example, null, 2)}</pre>
            </details>
          ))}
        </div>
        <details className="content-guide__zip">
          <summary>ZIP 目录</summary>
          <pre>{`manifest.json\nblog/\nwiki/\nuploads/`}</pre>
        </details>
      </div>
    </aside>
  );
}
