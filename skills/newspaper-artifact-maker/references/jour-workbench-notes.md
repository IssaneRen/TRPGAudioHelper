# Jour Newspaper Workbench Notes

These notes summarize the observed behavior of `https://jour.yjykmedia.com/` for future replication or comparison.

## What The Page Does

- It is a single-page newspaper workbench titled `报纸制作台`.
- It provides an A4 preview canvas with a 720 px desktop paper-width baseline and A4 ratio height.
- It supports cover and inner pages, masthead presets, title-block presets, page layout presets, theme presets, page background color or image, page wireframes, and a 24-cell alignment guide.
- Content blocks include text, images, and brief/news items. Text controls include fonts, size, line height, spacing, alignment, vertical writing, and visible rules.
- Image upload appears capped around 4 MB and routes through `/api/upload/...`.
- Export paths include browser image capture approaches such as `html-to-image` / SnapDOM, plus a Playwright/PDF-style server path and print output.
- Projects can be saved/imported as JSON and reset to defaults.

## Replication Assessment

- A full clone is not a trivial static copy: the public JavaScript and CSS are large, preset-heavy, and include upload/export paths that depend on server behavior.
- A project-local MVP should start with deterministic specs, HTML/CSS rendering, and browser screenshot export.
- If integrating into the app, the likely route is a dedicated `/tools/newspaper` page with:
  - structured article/classified/source fields,
  - a live A4 preview,
  - masthead/template/theme presets,
  - JSON import/export,
  - PNG/PDF export via browser automation or client-side capture.

## Current Skill Scope

This skill intentionally implements the lower-risk core: historical research discipline, structured newspaper specs, deterministic HTML rendering, and export verification. It does not yet implement a full interactive editor inside the app.
