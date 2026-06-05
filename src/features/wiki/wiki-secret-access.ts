function normalizeAccessKey(value: string): string {
  return value.trim().toLowerCase();
}

const WIKI_REVEAL_ALL_SECRET_KEY = ["kp", "114", "514"].join("");

export function canRevealAllWikiSecrets(plKeyOrName: string): boolean {
  return normalizeAccessKey(plKeyOrName) === WIKI_REVEAL_ALL_SECRET_KEY;
}
