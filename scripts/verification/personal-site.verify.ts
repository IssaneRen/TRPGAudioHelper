import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { legacyTrpgTarget } from "../../src/lib/trpg-routes";

for (const [before, after] of [
  ["/tools", "/trpg/tools"],
  ["/tools/", "/trpg/tools/"],
  ["/tools/world-wiki/modules/module.example", "/trpg/tools/world-wiki/modules/module.example"],
  ["/blog/%E8%AE%B0%E5%BD%95", "/trpg/blog/%E8%AE%B0%E5%BD%95"],
  ["/soundboard", "/trpg/tools/soundboard"],
  ["/module-tool/", "/trpg/tools/module-clue"],
  ["/admin/wiki", "/trpg/admin/wiki"],
]) assert.equal(legacyTrpgTarget(before), after);
for (const path of ["/", "/profile", "/workbench", "/portfolio", "/trpg", "/trpg/tools", "/toolsmith", "/blogger", "/api/admin/content/blog/a"]) {
  assert.equal(legacyTrpgTarget(path), null, `must not redirect ${path}`);
}

const profile = JSON.parse(readFileSync(new URL("../../src/content/personal-profile.json", import.meta.url), "utf8"));
assert.match(profile.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(typeof profile.name, "string");
assert.ok(profile.intro.length && profile.projects.length);
for (const item of [...profile.education, ...profile.experience]) {
  for (const key of ["organization", "title", "period", "description"]) assert.equal(typeof item[key], "string");
}
for (const link of [...profile.links, ...profile.projects.flatMap((project: { links: unknown[] }) => project.links)]) {
  assert.ok(/^\/(?!\/)|^https:\/\//.test(link.href), `unsupported public link ${link.href}`);
}
const serialized = JSON.stringify(profile);
assert.doesNotMatch(serialized, /codex:\/\/|\/Users\/|192\.168\.|KP Token|待确认|可公开的公司名称/);
console.log("个人资料结构与公开链接、TRPG 迁移边界验证通过。");
