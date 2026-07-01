# Webpage Automation Notes

Use these notes when a newspaper artifact task needs browser control, screenshots, or investigation of a live web page.

## Available Tool Paths

- In-app Browser MCP via the `browser:control-in-app-browser` skill: best for opening local pages, inspecting DOM, clicking controls, and taking screenshots inside Codex. It runs through `node_repl` and the browser client.
- Chrome MCP via the `chrome:control-chrome` skill: use when the task depends on the user's existing Chrome profile, logged-in sessions, or browser extensions.
- Computer Use: use only when a native app or browser UI must be operated visually. It can click, type, scroll, drag, and read the screen, but has more external-state risk.
- Webapp-testing / Playwright scripts: best for deterministic verification of local web applications and screenshot generation.
- Figma MCP capture tools: useful for pushing a page or layout into Figma, but not a general webpage automation API.

## Practical Guidance

- Prefer deterministic HTML/CSS plus a browser screenshot for final newspaper images.
- If the screenshot API writes a JPEG stream to a `.png` path, verify with `file` and convert or rename it before delivery.
- Always inspect the rendered image visually after export. Check masthead, date line, source-supported real news, and text overflow.
- For historical props, keep citation notes outside the image unless the user wants an annotated artifact.
