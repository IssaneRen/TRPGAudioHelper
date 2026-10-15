import assert from "node:assert/strict";
import { detachAnnualDocument, readAnnualDocument, renderAnnualDocument, type AnnualDocument } from "../../src/features/workbench/annual-document";
import { parseBackup } from "../../src/features/workbench/workbench-model";

const doc: AnnualDocument = {
  version: 1, year: 2026, title: "年度记录", intro: "原始介绍", coverage: "只读本机记录",
  themes: [{ id: "one", title: "业务交付", headline: "交付结果", goal: "明确贡献", projects: ["项目A"], stage: "待核实", reviewQuestion: "结果是什么", next: "补证据", sourceIds: ["s1"] }],
  projects: [{ theme: "one", title: "项目A", focus: "业务问题", contribution: "本人负责", stage: "阶段结果", gap: "待验证", sourceIds: ["s1"] }],
  sources: [{ id: "s1", label: "原始提交", type: "已核验产物", path: "repo / commit", date: "2026-01" }],
  notes: [{ title: "原话", track: "客户端", date: "2026-01-01", scope: "公司", quote: "记录保留", source: "codex://threads/example", evidence: "待核实" }],
};
const body = renderAnnualDocument(doc);
assert.deepEqual(readAnnualDocument(body), doc);
assert.equal(readAnnualDocument(detachAnnualDocument(body)), null);
assert.ok(detachAnnualDocument(body).includes("年度记录"));
const renamed = readAnnualDocument(renderAnnualDocument({ ...doc, projects: [{ ...doc.projects[0], title: "新项目名" }] }))!;
assert.deepEqual(renamed.themes[0].projects, ["新项目名"]);
const moved = readAnnualDocument(renderAnnualDocument({ ...doc, projects: [{ ...doc.projects[0], theme: "" }] }))!;
assert.deepEqual(moved.themes[0].projects, []);
const manySources = { ...doc, sources: Array.from({ length: 300 }, (_, i) => ({ ...doc.sources[0], id: `s${i}` })), themes: [{ ...doc.themes[0], sourceIds: Array.from({ length: 300 }, (_, i) => `s${i}`) }] };
assert.equal(readAnnualDocument(renderAnnualDocument(manySources))?.themes[0].sourceIds.length, 300);
const malicious = { ...doc, title: '</script><script>alert("x")</script>', intro: '<img src=x onerror="alert(1)"> & 引号', themes: [{ ...doc.themes[0], stage: "改过的结果\n第二行" }] };
const rendered = renderAnnualDocument(malicious);
assert.deepEqual(readAnnualDocument(rendered), malicious);
assert.equal((rendered.match(/<script[ >]/g) || []).length, 2);
assert.ok(!rendered.includes('<img src=x'));
assert.ok(rendered.includes("改过的结果<br>第二行"));
const work = { id: "annual", title: "年度记录", kind: "html", summary: "", body: rendered, coverUrl: "", status: "draft", updatedAt: "2026-10-15T00:00:00Z" };
const roundtrip = parseBackup(JSON.parse(JSON.stringify({ version: 1, plans: [], learning: [], works: [work] })));
assert.deepEqual(readAnnualDocument(roundtrip.works[0].body), malicious);
assert.equal(readAnnualDocument('<html><p>旧作品</p></html>'), null);
assert.equal(readAnnualDocument('<script id="workbench-annual" type="application/json">{bad}</script>'), null);
assert.throws(() => renderAnnualDocument({ ...doc, title: "x".repeat(201) }));
console.log("Annual editor: round-trip persistence, escaping, edit-to-preview and legacy fallback passed.");
