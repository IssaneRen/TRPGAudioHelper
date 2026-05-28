import { Link } from "react-router";
import { LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { WikiBlock, WikiIndexEntry, WikiInlineToken } from "@/types/wiki";

function maskSecretText(value: string): string {
  return value.replace(/[^\s]/g, "█");
}

function canRevealSecret(
  playerIds: string[] | undefined,
  currentPlayerId: string | null,
  revealAllSecrets: boolean
): boolean {
  if (revealAllSecrets) return true;
  if (!playerIds || playerIds.length === 0) return false;
  if (!currentPlayerId) return false;
  return playerIds.includes(currentPlayerId);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveCurrentPlayerIdByName(
  lookup: Record<string, string> | undefined,
  plName: string
): string | null {
  if (!lookup || !plName.trim()) return null;
  return lookup[normalizeText(plName)] ?? null;
}

function LockedSecretBlock({
  title,
  previewText,
}: {
  title: string;
  previewText: string;
}) {
  return (
    <button
      type="button"
      onClick={() => toast("请探索更多故事解锁~", { duration: 1800 })}
      className="relative my-6 w-full overflow-hidden rounded-xl border border-black/70 bg-black p-4 text-left shadow-inner transition-transform hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%,rgba(255,255,255,0.04))]" />
      <div className="relative z-10 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary-foreground/70">
        <LockKeyhole className="h-3.5 w-3.5" />
        {title}
      </div>
      <pre className="relative z-10 mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-neutral-700">
        {maskSecretText(previewText)}
      </pre>
    </button>
  );
}

function LockedInlineSecret({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => toast("请探索更多故事解锁~", { duration: 1800 })}
      className="inline-block rounded-sm bg-black px-1.5 py-0.5 align-baseline text-neutral-700"
    >
      {maskSecretText(text)}
    </button>
  );
}

function collectPreviewText(blocks: WikiBlock[]): string {
  const fragments: string[] = [];

  const appendTokens = (tokens: WikiInlineToken[] | undefined) => {
    for (const token of tokens || []) {
      if (token.type === "text" || token.type === "secret-inline") {
        fragments.push(token.text || "");
      }
      if (token.type === "ref") {
        fragments.push(token.label || "");
      }
    }
  };

  for (const block of blocks) {
    if (block.text) fragments.push(block.text);
    appendTokens(block.tokens);
    for (const item of block.items || []) appendTokens(item);
    if (block.blocks) fragments.push(collectPreviewText(block.blocks));
  }

  return fragments.join(" ").trim();
}

function resolveEntryName(entryId: string, entriesById: Map<string, WikiIndexEntry>): string {
  return entriesById.get(entryId)?.displayName || entryId;
}

function renderTextWithNewlines(value: string | undefined) {
  if (!value) return null;
  const parts = value.split("\n");
  return parts.map((part, index) => (
    <span key={`${index}-${part}`}>
      {index > 0 ? <br /> : null}
      {part}
    </span>
  ));
}

function InlineTokens({
  tokens,
  currentPlayerId,
  entriesById,
  revealAllSecrets,
  entryBaseRoute,
}: {
  tokens: WikiInlineToken[];
  currentPlayerId: string | null;
  entriesById: Map<string, WikiIndexEntry>;
  revealAllSecrets: boolean;
  entryBaseRoute: string;
}) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === "text") {
          return (
            <span
              key={`text-${index}`}
              className={[
                token.bold ? "font-semibold" : "",
                token.strikethrough ? "line-through" : "",
              ].filter(Boolean).join(" ") || undefined}
              style={token.color ? { color: token.color } : undefined}
            >
              {renderTextWithNewlines(token.text)}
            </span>
          );
        }

        if (token.type === "ref" && token.entryId) {
          const label = token.label || resolveEntryName(token.entryId, entriesById);
          return (
            <Link
              key={`ref-${index}`}
              to={`${entryBaseRoute}/${token.entryId}`}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              {label}
            </Link>
          );
        }

        if (token.type === "secret-inline") {
          const text = token.text || "";
          return canRevealSecret(token.playerIds, currentPlayerId, revealAllSecrets) ? (
            <span
              key={`secret-inline-${index}`}
              className="rounded-sm bg-primary/10 px-1 py-0.5 text-primary"
            >
              {renderTextWithNewlines(text)}
            </span>
          ) : (
            <LockedInlineSecret key={`secret-inline-${index}`} text={text} />
          );
        }

        return null;
      })}
    </>
  );
}

export function WikiContentRenderer({
  blocks,
  currentPlayerId,
  entriesById,
  revealAllSecrets = false,
  entryBaseRoute = "/tools/world-wiki",
}: {
  blocks: WikiBlock[];
  currentPlayerId: string | null;
  entriesById: Map<string, WikiIndexEntry>;
  revealAllSecrets?: boolean;
  entryBaseRoute?: string;
}) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={`heading-${index}`} className="font-heading text-2xl font-semibold">
              {block.text}
            </h3>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`paragraph-${index}`} className="leading-8 text-foreground/95">
              <InlineTokens
                tokens={block.tokens || []}
                currentPlayerId={currentPlayerId}
                entriesById={entriesById}
                revealAllSecrets={revealAllSecrets}
                entryBaseRoute={entryBaseRoute}
              />
            </p>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`quote-${index}`}
              className="border-l-2 border-primary/40 bg-primary/5 px-4 py-3 italic text-muted-foreground"
            >
              <InlineTokens
                tokens={block.tokens || []}
                currentPlayerId={currentPlayerId}
                entriesById={entriesById}
                revealAllSecrets={revealAllSecrets}
                entryBaseRoute={entryBaseRoute}
              />
            </blockquote>
          );
        }

        if (block.type === "image") {
          const src = block.src || "";
          const alt = block.alt || "";
          const caption = block.caption;
          return (
            <figure key={`image-${index}`} className="my-4 mx-auto w-full max-w-[560px]">
              <img
                src={src}
                alt={alt}
                loading="lazy"
                className="max-h-[720px] w-full rounded-xl border border-border/70 bg-card/60 object-contain"
              />
              {caption ? (
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                  {caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="list-disc space-y-2 pl-6">
              {(block.items || []).map((item, itemIndex) => (
                <li key={`item-${itemIndex}`} className="leading-7">
                  <InlineTokens
                    tokens={item}
                    currentPlayerId={currentPlayerId}
                    entriesById={entriesById}
                    revealAllSecrets={revealAllSecrets}
                    entryBaseRoute={entryBaseRoute}
                  />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "coc-sheet") {
          const statusEntries = Object.entries(block.cocData?.status || {});
          const skillEntries = Object.entries(block.cocData?.skill || {});
          return (
            <div key={`coc-sheet-${index}`} className="rounded-2xl border border-primary/20 bg-card/60 p-4">
              <div className="mb-3 text-sm font-semibold">COC人物卡</div>
              {block.cocData?.avatar ? <img src={block.cocData.avatar} alt="avatar" className="mb-3 h-28 w-28 rounded-md object-cover" /> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">属性</div>
                  <div className="space-y-1">{statusEntries.map(([k,v])=><div key={k} className="flex justify-between text-sm"><span>{k.toUpperCase()}</span><span>{v}</span></div>)}</div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">技能</div>
                  <div className="space-y-1">{skillEntries.map(([k,v])=><div key={k} className="flex justify-between text-sm"><span>{k}</span><span>{v}</span></div>)}</div>
                </div>
              </div>
            </div>
          );
        }

        if (block.type === "secret-panel") {
          return canRevealSecret(block.playerIds, currentPlayerId, revealAllSecrets) ? (
            <div
              key={`secret-panel-${index}`}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {block.title || "已解锁档案"}
              </div>
              <WikiContentRenderer
                blocks={block.blocks || []}
                currentPlayerId={currentPlayerId}
                entriesById={entriesById}
                revealAllSecrets={revealAllSecrets}
                entryBaseRoute={entryBaseRoute}
              />
            </div>
          ) : block.hiddenMode === "collapse" ? null : (
            <LockedSecretBlock
              key={`secret-panel-${index}`}
              title={block.title || "档案未解锁"}
              previewText={collectPreviewText(block.blocks || [])}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
