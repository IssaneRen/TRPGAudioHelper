import assert from "node:assert/strict";
import {
  createBlankBlog,
  createBlankWiki,
  formatDelimitedList,
  parseDelimitedList
} from "./content-admin-model";

const now = "2026-08-25T00:00:00.000Z";
const blog = createBlankBlog(now);
assert.deepEqual(blog, {
  id: "",
  title: "",
  tags: [],
  renderMode: "markdown",
  createdAt: now,
  updatedAt: now,
  markdown: ""
});

const wiki = createBlankWiki(now);
assert.equal(wiki.category, "character");
assert.deepEqual(wiki.content, []);
assert.equal(wiki.createdAt, now);

assert.deepEqual(parseDelimitedList(" a, b\na\n"), ["a", "b"]);
assert.equal(formatDelimitedList(["a", "b"]), "a\nb");

console.log("content-admin-model verification passed");
