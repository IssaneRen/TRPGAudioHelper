// ==UserScript==
// @name         QQ Chatbot
// @author       白羽
// @version      0.1.0
// @description  通过 AI Gateway 复用网页端 NPC 对话记忆，提供 .chatbot talk/add-memory 指令。
// @timestamp    2026-08-26
// @license      MIT
// @homepageURL  https://docs.sealdice.com/advanced/js_start.html
// ==/UserScript==

var EXT_NAME = "lucius_qq_chatbot";
var EXT_AUTHOR = "白羽";
var EXT_VERSION = "0.1.0";

var ext = seal.ext.find(EXT_NAME);
if (!ext) {
  ext = seal.ext.new(EXT_NAME, EXT_AUTHOR, EXT_VERSION);
  seal.ext.register(ext);
}

seal.ext.registerStringConfig(ext, "gatewayUrl", "http://127.0.0.1:3001", "AI Gateway 地址", "连接");
seal.ext.registerStringConfig(ext, "internalToken", "", "QQ Chatbot 内部 token", "连接");
seal.ext.registerStringConfig(ext, "imageBasePath", "", "可选：立绘图片基础路径或 URL", "图片");
seal.ext.registerIntConfig(ext, "minAdminPrivilege", 50, "可追加记忆的最低权限：50 管理，60 群主，100 Master", "权限");

function ok() {
  return seal.ext.newCmdExecuteResult(true);
}

function reply(ctx, msg, text) {
  seal.replyToSender(ctx, msg, text);
}

function trimRightSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function configString(key) {
  return String(seal.ext.getStringConfig(ext, key) || "").trim();
}

function configInt(key, fallback) {
  var value = seal.ext.getIntConfig(ext, key);
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

function normalizeQqUserId(msg) {
  var raw = msg && msg.sender && msg.sender.userId ? String(msg.sender.userId) : "";
  var afterColon = raw.indexOf(":") >= 0 ? raw.split(":").pop() : raw;
  var match = String(afterColon || raw).match(/\d+/);
  return match ? match[0] : raw;
}

function gatewayHeaders() {
  var token = configString("internalToken");
  if (!token) throw new Error("未配置 internalToken");
  return {
    "content-type": "application/json",
    "x-trpg-internal-token": token
  };
}

function gatewayUrl(path) {
  var base = trimRightSlash(configString("gatewayUrl"));
  if (!base) throw new Error("未配置 gatewayUrl");
  return base + path;
}

async function postGateway(path, body) {
  var response = await fetch(gatewayUrl(path), {
    method: "POST",
    headers: gatewayHeaders(),
    body: JSON.stringify(body)
  });
  var text = await response.text();
  var data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data && data.error ? data.error : "Gateway 请求失败：" + response.status);
  }
  return data;
}

function helpText() {
  return [
    "QQ Chatbot：",
    ".chatbot talk <NPC名> <对话内容>",
    ".chatbot add-memory <NPC名> <公共记忆>",
    ".chatbot add-memory <NPC名> <PL名或playerId> <专属记忆>",
    ".chatbot add-memory-for <NPC名> <PL名或playerId> <专属记忆>"
  ].join("\n");
}

function hasAdminPrivilege(ctx) {
  return ctx && ctx.privilegeLevel >= configInt("minAdminPrivilege", 50);
}

function formatTalkReply(data) {
  var lines = [];
  var imageBasePath = trimRightSlash(configString("imageBasePath"));
  if (data.portraitFile && imageBasePath) {
    lines.push("[CQ:image,file=" + imageBasePath + "/" + data.portraitFile + "]");
  }
  lines.push("【" + (data.npcDisplayName || data.npcId || "NPC") + "】");
  lines.push(data.content || "");
  return lines.join("\n");
}

function isLikelyPlayerName(value) {
  if (!value) return false;
  if (String(value).indexOf("pl.") === 0) return true;
  return /^[A-Za-z0-9_.-]{1,32}$/.test(String(value));
}

async function handleTalk(ctx, msg, cmdArgs) {
  var npc = cmdArgs.getArgN(2);
  var message = cmdArgs.getRestArgsFrom(3);
  if (!npc || !message) {
    reply(ctx, msg, "格式：.chatbot talk <NPC名> <对话内容>");
    return ok();
  }

  var data = await postGateway("/api/internal/qq-chatbot/talk", {
    qqUserId: normalizeQqUserId(msg),
    npc: npc,
    message: message,
    groupId: msg.groupId || "",
    senderName: msg.sender && msg.sender.nickname ? msg.sender.nickname : ""
  });
  reply(ctx, msg, formatTalkReply(data));
  return ok();
}

async function handleAddMemory(ctx, msg, cmdArgs, forcePlayerMemory) {
  if (!hasAdminPrivilege(ctx)) {
    reply(ctx, msg, "权限不足。");
    return ok();
  }

  var npc = cmdArgs.getArgN(2);
  var third = cmdArgs.getArgN(3);
  if (!npc || !third) {
    reply(ctx, msg, forcePlayerMemory ? "格式：.chatbot add-memory-for <NPC名> <PL名或playerId> <记忆内容>" : "格式：.chatbot add-memory <NPC名> <记忆内容>");
    return ok();
  }

  var body = {
    adminQqUserId: normalizeQqUserId(msg),
    npc: npc,
    text: cmdArgs.getRestArgsFrom(3)
  };

  if (forcePlayerMemory || (cmdArgs.getArgN(4) && isLikelyPlayerName(third))) {
    body.player = third;
    body.text = cmdArgs.getRestArgsFrom(4);
  }

  if (!body.text) {
    reply(ctx, msg, "记忆内容不能为空。");
    return ok();
  }

  var data = await postGateway("/api/internal/qq-chatbot/memory", body);
  reply(ctx, msg, data.playerId ? "已追加专属记忆：" + data.npcId + " / " + data.playerId : "已追加公共记忆：" + data.npcId);
  return ok();
}

var cmd = seal.ext.newCmdItemInfo();
cmd.name = "chatbot";
cmd.help = helpText();
cmd.solve = async function (ctx, msg, cmdArgs) {
  var sub = cmdArgs.getArgN(1);
  try {
    if (!sub || sub === "help") {
      reply(ctx, msg, helpText());
      return ok();
    }
    if (sub === "talk") return await handleTalk(ctx, msg, cmdArgs);
    if (sub === "add-memory") return await handleAddMemory(ctx, msg, cmdArgs, false);
    if (sub === "add-memory-for") return await handleAddMemory(ctx, msg, cmdArgs, true);
    reply(ctx, msg, helpText());
    return ok();
  } catch (err) {
    console.log("[QQ Chatbot] " + String(err && err.stack ? err.stack : err));
    reply(ctx, msg, "Chatbot 请求失败：" + String(err && err.message ? err.message : err));
    return ok();
  }
};

ext.cmdMap.chatbot = cmd;
