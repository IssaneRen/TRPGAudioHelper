import {
  getStoredAiToken,
  loadAiGatewayUrl,
  type AiSession,
} from "@/features/ai/ai-gateway-client";

const ANONYMOUS_ID_KEY = "analytics-anonymous-id";
const SESSION_ID_KEY = "analytics-session-id";
const PAGE_VIEW_DEDUPE_MS = 750;

let lastPageViewKey = "";
let lastPageViewAt = 0;
let lastIdentifiedKey = "";

export interface AnalyticsSummary {
  totals: {
    events: number;
    pageViews: number;
    clicks: number;
    uniqueVisitors: number;
  };
  topPages: Array<{ pagePath: string; pv: number; uv: number }>;
  topClicks: Array<{ eventName: string; pv: number; uv: number }>;
  players: Array<{ playerId: string; displayName: string; events: number }>;
  recentEvents: Array<{
    eventName: string;
    eventTime: string;
    pagePath?: string;
    playerDisplayName?: string;
  }>;
}

interface TrackEventOptions {
  eventName: string;
  properties?: Record<string, unknown>;
}

function canTrack() {
  return typeof window !== "undefined" && navigator.doNotTrack !== "1";
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getAnonymousId() {
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  const next = randomId("anon");
  localStorage.setItem(ANONYMOUS_ID_KEY, next);
  return next;
}

function getSessionId() {
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const next = randomId("session");
  sessionStorage.setItem(SESSION_ID_KEY, next);
  return next;
}

async function postAnalyticsEvent(options: TrackEventOptions) {
  if (!canTrack()) return;

  try {
    const token = getStoredAiToken();
    const aiGatewayUrl = await loadAiGatewayUrl();
    const headers = new Headers({ "content-type": "application/json" });
    if (token) headers.set("authorization", `Bearer ${token}`);

    await fetch(`${aiGatewayUrl}/api/analytics/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        eventName: options.eventName,
        eventTime: new Date().toISOString(),
        anonymousId: getAnonymousId(),
        sessionId: getSessionId(),
        pagePath: `${window.location.pathname}${window.location.search}`,
        pageUrl: window.location.href,
        pageTitle: document.title,
        referrer: document.referrer || undefined,
        properties: options.properties,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics must never interrupt the user-facing app.
  }
}

export function trackAnalyticsEvent(options: TrackEventOptions) {
  void postAnalyticsEvent(options);
}

export function trackPageView(pathKey: string) {
  const now = Date.now();
  if (pathKey === lastPageViewKey && now - lastPageViewAt < PAGE_VIEW_DEDUPE_MS) return;
  lastPageViewKey = pathKey;
  lastPageViewAt = now;
  trackAnalyticsEvent({
    eventName: "page_view",
    properties: { source: "route" },
  });
}

export function identifyAnalyticsSession(session: AiSession | null) {
  if (!session) {
    lastIdentifiedKey = "";
    return;
  }
  const key = `${session.playerId || "keeper"}:${session.displayName}:${session.isKeeper}`;
  if (key === lastIdentifiedKey) return;
  lastIdentifiedKey = key;
  trackAnalyticsEvent({
    eventName: "identify",
    properties: {
      playerId: session.playerId,
      displayName: session.displayName,
      isKeeper: session.isKeeper,
    },
  });
}

export async function fetchAnalyticsSummary(token: string): Promise<AnalyticsSummary> {
  const aiGatewayUrl = await loadAiGatewayUrl();
  const response = await fetch(`${aiGatewayUrl}/api/analytics/summary`, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.text();
    throw new Error(data || `统计数据加载失败：${response.status}`);
  }

  return response.json() as Promise<AnalyticsSummary>;
}
