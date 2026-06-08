import { useMemo, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function buildNpcSystemPrompt(era: string, role: string, profile: string): string {
  return [
    `你是一个${era.trim()}的${role.trim()}。`,
    "你正在进行 TRPG 模组中的沉浸式 NPC 对话。",
    "你的回答必须符合人设、时代背景、社会常识、语言习惯和当前场景压力。",
    "你只能说这个角色会知道、会相信、会隐瞒或会误解的内容。",
    "不要跳出角色，不要解释自己是 AI，不要替主持人总结剧情，不要主动泄露未被问到的真相。",
    profile.trim() ? `补充人设：${profile.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function requestAiReply(params: {
  message: string;
  era: string;
  role: string;
  profile: string;
}): Promise<string> {
  const systemPrompt = buildNpcSystemPrompt(params.era, params.role, params.profile);
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.message }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `AI request failed: ${response.status}`);
  }

  const data = (await response.json()) as { content?: string };
  if (!data.content) throw new Error("AI response is empty");
  return data.content;
}

export default function AiChatTab() {
  const [era, setEra] = useState("1920 年代新英格兰");
  const [role, setRole] = useState("小镇旅馆老板");
  const [profile, setProfile] = useState("说话谨慎，熟悉镇上的流言，但会回避让自己惹麻烦的细节。");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const content = await requestAiReply({ message: trimmed, era, role, profile });
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content
        }
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI 对话请求失败");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-5xl flex-col overflow-hidden rounded-lg border border-border/70 bg-card/70 shadow-sm">
      <header className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-semibold">AI 对话</h2>
            <p className="truncate text-xs text-muted-foreground">{era} / {role}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground">
          beta
        </div>
      </header>

      <div className="grid shrink-0 gap-3 border-b border-border/70 bg-background/45 p-3 sm:grid-cols-[1fr_1fr_1.4fr] sm:p-4">
        <div className="space-y-1.5">
          <Label htmlFor="npc-era">时代</Label>
          <Input
            id="npc-era"
            value={era}
            onChange={(event) => setEra(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npc-role">身份</Label>
          <Input
            id="npc-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npc-profile">人设</Label>
          <Input
            id="npc-profile"
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
          />
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/35 p-3 sm:p-5">
        {messages.length === 0 ? (
          <div className="grid min-h-[22rem] place-items-center">
            <div className="w-full max-w-xl rounded-lg border border-dashed border-border/80 bg-background/70 p-5">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium">开始交谈</div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {["昨晚码头那边是不是出事了？", "你认识那个总在教堂附近徘徊的人吗？"].map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => {
                      setInput(text);
                      inputRef.current?.focus();
                    }}
                    className="min-h-14 rounded-md border border-border/70 bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            const Icon = isUser ? UserRound : Bot;
            return (
              <article
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser ? (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
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
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
        {loading ? (
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
            placeholder="输入你要问的内容"
            className="max-h-36 min-h-12 resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" size="icon-lg" disabled={!canSubmit} className="h-12 w-12">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
