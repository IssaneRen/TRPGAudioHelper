import assert from "node:assert/strict";
import {
  buildClueReviewLayout,
  getHighlightState,
  getVisibleClueGraph,
  type ModuleClueReviewData,
} from "./clue-layout";

const fixture: ModuleClueReviewData = {
  module: { id: "naimen-prologue", name: "奈面序章" },
  clues: [
    {
      id: "arrival",
      title: "抵达奈面町",
      summary: "起点",
      detail: "抵达记录",
      tags: ["序章"],
      order: 1,
      reveals: ["letter", "clock"],
    },
    {
      id: "letter",
      title: "密信",
      summary: "中间线索",
      detail: "信件记录",
      tags: ["密信"],
      order: 2,
      reveals: ["clock"],
    },
    {
      id: "clock",
      title: "停摆的站钟",
      summary: "最远线索",
      detail: "站钟记录",
      tags: ["时间"],
      order: 3,
      reveals: [],
    },
    {
      id: "isolated",
      title: "孤立记录",
      summary: "无关系线索",
      detail: "独立记录",
      tags: ["旁支"],
      order: 4,
      reveals: [],
    },
  ],
  edges: [
    { id: "arrival->letter", source: "arrival", target: "letter" },
    { id: "letter->clock", source: "letter", target: "clock" },
    { id: "arrival->clock", source: "arrival", target: "clock" },
  ],
  tags: ["序章", "密信", "时间", "旁支"],
};

const layout = buildClueReviewLayout(fixture);
assert.deepEqual(
  layout.columns.map((column) => column.clues.map((clue) => clue.id)),
  [["arrival", "isolated"], ["letter"], ["clock"]],
  "线索应按最长推导距离横向分列，同列按 order 排序",
);

const tagHighlight = getHighlightState(fixture, { type: "tag", tag: "序章" });
assert.deepEqual([...tagHighlight.highlightedClueIds].sort(), ["arrival", "clock", "letter"]);
assert.deepEqual([...tagHighlight.highlightedEdgeIds].sort(), [
  "arrival->clock",
  "arrival->letter",
  "letter->clock",
]);

const itemHighlight = getHighlightState(fixture, { type: "clue", clueId: "letter" });
assert.deepEqual([...itemHighlight.highlightedClueIds].sort(), ["clock", "letter"]);
assert.deepEqual([...itemHighlight.highlightedEdgeIds], ["letter->clock"]);

const visible = getVisibleClueGraph(fixture, new Set(["arrival", "clock"]));
assert.deepEqual(visible.clues.map((clue) => clue.id), ["arrival", "clock"]);
assert.deepEqual(visible.edges, [{ id: "arrival->clock", source: "arrival", target: "clock" }]);
assert.deepEqual(visible.tags, ["序章", "时间"]);

console.log("module clue layout verification passed");
