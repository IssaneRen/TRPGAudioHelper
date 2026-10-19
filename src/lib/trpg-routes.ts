/** Browser routes only. Static /blog, /wiki, /config and API URLs stay unchanged. */
export function legacyTrpgTarget(pathname: string): string | null {
  if (pathname === "/module-tool" || pathname === "/module-tool/") return "/trpg/tools/module-clue";
  if (pathname === "/soundboard" || pathname === "/soundboard/") return "/trpg/tools/soundboard";
  if (pathname === "/admin/wiki" || pathname === "/admin/wiki/") return "/trpg/admin/wiki";
  if (["/tools", "/blog"].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return `/trpg${pathname}`;
  return null;
}
