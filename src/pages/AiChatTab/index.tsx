import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StableAvatar } from "@/components/StableAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAiChatHistory,
  fetchAiChatHistory,
  fetchAiNpcs,
  sendAiNpcMessage,
  type AiChatMessage,
  type AiNpcSummary,
} from "@/features/ai/ai-gateway-client";
import { useAiSession } from "@/features/ai/use-ai-session";

const PLAYER_PC_PROFILES: Record<string, { displayName: string; avatarUrl?: string }> = {
  "pl.ddd": {
    displayName: "达米安",
    avatarUrl: "/wiki/characters/char.damien-dufresne.jpg",
  },
  "pl.leina": {
    displayName: "塞巴斯",
    avatarUrl: "/wiki/characters/char.sebas-dufresne.jpg",
  },
  "pl.paojiang": {
    displayName: "布莱尔",
  },
  "pl.shitoubing": {
    displayName: "劳伦斯",
  },
  "pl.zote": {
    displayName: "哈兹雷德",
  },
  "pl.lemon": {
    displayName: "靛蓝",
  },
};

function resolvePlayerPcProfile(playerId?: string, fallbackName?: string) {
  if (playerId && PLAYER_PC_PROFILES[playerId]) return PLAYER_PC_PROFILES[playerId];
  return {
    displayName: fallbackName || "调查员",
  };
}

function LoginDialog({
  open,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (token: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/3 z-[71] w-[min(90vw,340px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-2xl"
      >
        <h3 className="text-base font-heading font-semibold">登录 PL</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          请输出pl的token码。如果你不知道要填什么，去询问你的kp。
        </p>
        <div className="mt-4 flex gap-2">
          <input
            autoFocus
            type="password"
            value={value}
            disabled={loading}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onConfirm(value.trim());
              if (event.key === "Escape") onClose();
            }}
            placeholder="输入 token"
            className="min-w-0 flex-1 rounded-md border bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button type="button" disabled={loading} onClick={() => onConfirm(value.trim())}>
            {loading ? "登录中" : "确认"}
          </Button>
        </div>
      </div>
    </>
  );
}

export default function AiChatTab() {
  const aiSession = useAiSession();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [npcs, setNpcs] = useState<AiNpcSummary[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [npcsLoading, setNpcsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedNpc = useMemo(
    () => npcs.find((npc) => npc.id === selectedNpcId) || null,
    [npcs, selectedNpcId]
  );
  const currentPcProfile = useMemo(
    () =>
      resolvePlayerPcProfile(
        aiSession.session?.playerId,
        aiSession.session?.displayName
      ),
    [aiSession.session?.displayName, aiSession.session?.playerId]
  );
  const canChat = Boolean(aiSession.token && aiSession.session?.playerId && selectedNpc);
  const canSubmit = input.trim().length > 0 && canChat && !sending;

  useEffect(() => {
    if (!aiSession.token || !aiSession.session?.playerId) {
      setNpcs([]);
      setSelectedNpcId("");
      setMessages([]);
      return;
    }

    let cancelled = false;
    setNpcsLoading(true);
    fetchAiNpcs(aiSession.token)
      .then((items) => {
        if (cancelled) return;
        setNpcs(items);
        setSelectedNpcId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          return items[0]?.id || "";
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setNpcs([]);
          setSelectedNpcId("");
          toast.error(error instanceof Error ? error.message : "NPC 列表加载失败");
        }
      })
      .finally(() => {
        if (!cancelled) setNpcsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [aiSession.session?.playerId, aiSession.token]);

  useEffect(() => {
    if (!aiSession.token || !selectedNpcId || !aiSession.session?.playerId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    fetchAiChatHistory(aiSession.token, selectedNpcId)
      .then((items) => {
        if (!cancelled) setMessages(items);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "聊天记录加载失败");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [aiSession.session?.playerId, aiSession.token, selectedNpcId]);

  const handleLogin = async (token: string) => {
    try {
      const session = await aiSession.login(token);
      toast.success(`已登录为 ${session.displayName}`);
      setShowLoginDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !canChat || sending) return;

    const optimisticMessage: AiChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);
    setInput("");
    setSending(true);

    try {
      const assistantMessage = await sendAiNpcMessage(aiSession.token, selectedNpcId, trimmed);
      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 对话请求失败");
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleDeleteHistory = async () => {
    if (!selectedNpcId || !aiSession.token || deleting) return;
    const confirmed = window.confirm("确定要删除当前 NPC 与当前 PL 的对话记录吗？full_log 会被改名备份。");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAiChatHistory(aiSession.token, selectedNpcId);
      setMessages([]);
      toast.success("聊天记录已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const blockedMessage = !aiSession.session
    ? "您未登录或者登录的pl不认识这个npc，还不能对话哦"
    : npcs.length === 0
      ? "您未登录或者登录的pl不认识这个npc，还不能对话哦"
      : "";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-5xl flex-col overflow-hidden rounded-lg border border-border/70 bg-card/70 shadow-sm">
      <header className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-semibold">AI 对话</h2>
            <p className="truncate text-xs text-muted-foreground">
              {aiSession.session ? `当前登录：${aiSession.session.displayName}` : "尚未登录"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aiSession.session ? (
            <Button variant="outline" size="sm" onClick={aiSession.logout}>
              退出
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowLoginDialog(true)}>
              登录
            </Button>
          )}
          <div className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
            beta
          </div>
        </div>
      </header>

      <div className="grid shrink-0 gap-3 border-b border-border/70 bg-background/45 p-3 sm:grid-cols-[1fr_auto] sm:p-4">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">可对话 NPC</span>
          <select
            value={selectedNpcId}
            disabled={!aiSession.session || npcsLoading || npcs.length === 0}
            onChange={(event) => setSelectedNpcId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            {npcs.length === 0 ? (
              <option value="">暂无可对话 NPC</option>
            ) : (
              npcs.map((npc) => (
                <option key={npc.id} value={npc.id}>
                  {npc.displayName}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            disabled={!canChat || deleting || messages.length === 0}
            onClick={handleDeleteHistory}
            className="gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            删除记录
          </Button>
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/35 p-3 sm:p-5">
        {blockedMessage ? (
          <div className="grid min-h-[22rem] place-items-center">
            <div className="w-full max-w-md rounded-lg border border-dashed border-border/80 bg-background/70 p-5 text-center">
              <Bot className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{blockedMessage}</p>
              {!aiSession.session ? (
                <Button className="mt-4" onClick={() => setShowLoginDialog(true)}>
                  登录 PL
                </Button>
              ) : null}
            </div>
          </div>
        ) : historyLoading ? (
          <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载聊天记录
          </div>
        ) : messages.length === 0 ? (
          <div className="grid min-h-[22rem] place-items-center">
            <div className="w-full max-w-xl rounded-lg border border-dashed border-border/80 bg-background/70 p-5">
              <div className="flex items-center gap-3">
                <StableAvatar
                  src={selectedNpc?.avatarUrl}
                  name={selectedNpc?.displayName || "NPC"}
                  size={48}
                />
                <div className="text-sm font-medium">{selectedNpc?.displayName || "开始交谈"}</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                这里会显示你与该 NPC 的独立对话记录。
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            const avatarName = isUser
              ? currentPcProfile.displayName
              : selectedNpc?.displayName || "NPC";
            const avatarUrl = isUser
              ? currentPcProfile.avatarUrl
              : selectedNpc?.avatarUrl;
            return (
              <article
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser ? (
                  <StableAvatar src={avatarUrl} name={avatarName} size={48} className="mt-1" />
                ) : null}
                <div
                  className={`max-w-[min(44rem,82%)] whitespace-pre-wrap break-words rounded-lg px-4 py-3 text-sm leading-7 ${
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/70 bg-card text-foreground"
                  }`}
                >
                  {message.content}
                </div>
                {isUser ? (
                  <StableAvatar src={avatarUrl} name={avatarName} size={48} className="mt-1" />
                ) : null}
              </article>
            );
          })
        )}
        {sending ? (
          <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            生成中
          </div>
        ) : null}
      </section>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border/70 bg-card p-3 sm:p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={canChat ? "输入你要问的内容" : "当前还不能对话"}
            className="max-h-36 min-h-12 resize-none"
            disabled={!canChat}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" size="icon-lg" disabled={!canSubmit} className="h-12 w-12">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </form>

      <LoginDialog
        open={showLoginDialog}
        loading={aiSession.loading}
        onClose={() => setShowLoginDialog(false)}
        onConfirm={handleLogin}
      />
    </div>
  );
}
