import assert from "node:assert/strict";
import { focusPlans, localDate, matchesDate, parseBackup } from "../../src/features/workbench/workbench-model";
import { startWorkflow, workFromTemplate, workflowTemplates } from "../../src/features/workbench/workbench-templates";
import type { Plan } from "../../src/features/workbench/workbench-client";

const now = new Date(2026, 8, 29, 23, 40);
const plan = (id: string, dueDate: string, status: Plan["status"] = "todo"): Plan => ({ id, title: id, detail: "", dueDate, status });
assert.equal(localDate(now), "2026-09-29");
assert.equal(matchesDate(plan("today", "2026-09-29"), "today", now), true);
assert.equal(matchesDate(plan("past", "2026-09-28"), "overdue", now), true);
assert.equal(matchesDate(plan("done", "2026-09-28", "done"), "overdue", now), false);
assert.equal(matchesDate(plan("none", ""), "overdue", now), false);
assert.equal(matchesDate(plan("sunday", "2026-10-04"), "week", now), true);
assert.equal(matchesDate(plan("monday", "2026-10-05"), "week", now), false);
assert.equal(matchesDate(plan("past", "2026-09-28"), "week", now), false);
assert.deepEqual(focusPlans([plan("future", "2026-10-02"), plan("doing", "", "doing"), plan("today", "2026-09-29"), plan("past", "2026-09-28"), plan("done", "2026-09-28", "done")], now).map(p => p.id), ["past", "today", "doing", "future"]);

for (const template of workflowTemplates) {
  const first = startWorkflow(template);
  const second = startWorkflow(template);
  const work = workFromTemplate(template);
  assert.equal(first.plans.length, 4);
  assert.equal(first.plans.filter(p => p.status === "doing").length, 1);
  assert.equal(first.learning.status, "learning");
  assert.notEqual(first.learning.id, second.learning.id);
  assert.equal(new Set([...first.plans, ...second.plans].map(p => p.id)).size, 8);
  assert.equal(work.status, "draft");
  assert.ok(work.body.length > 0);
  const value = { version: 1, plans: first.plans, learning: [first.learning], works: [work] };
  assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(value))), value);
}
assert.throws(() => parseBackup({ version: 1, plans: [{}], learning: [], works: [] }));
assert.throws(() => parseBackup({ version: 1, plans: [plan("same", ""), plan("same", "")], learning: [], works: [] }));
assert.throws(() => parseBackup({ version: 1, plans: [{ ...plan("bad", ""), status: "deleted" }], learning: [], works: [] }));
assert.throws(() => parseBackup({ version: 2, plans: [], learning: [], works: [] }));
console.log("Workbench: date filters, priority ordering, six workflow templates and backup validation passed.");
