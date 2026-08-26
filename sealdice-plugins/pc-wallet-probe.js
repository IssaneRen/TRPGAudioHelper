// ==UserScript==
// @name         钱包与背包
// @author       白羽
// @version      0.3.0
// @description  记录当前 .pc 角色的多币种钱包和物品；普通玩家可查询，管理员/群主/Master 可增减货币和物品。
// @timestamp    2026-07-14
// @license      MIT
// @homepageURL  https://docs.sealdice.com/advanced/js_start.html
// ==/UserScript==

var EXT_NAME = "lucius_wallet_inventory";
var EXT_AUTHOR = "白羽";
var EXT_VERSION = "0.3.0";
var MIN_EDIT_PRIVILEGE = 50; // 50 管理，60 群主，100 Master
var MAX_LOGS = 30;
var DEFAULT_CURRENCY = "货币";

var ext = seal.ext.find(EXT_NAME);
if (!ext) {
  ext = seal.ext.new(EXT_NAME, EXT_AUTHOR, EXT_VERSION);
  seal.ext.register(ext);
}

function ok() {
  return seal.ext.newCmdExecuteResult(true);
}

function getGroupId(ctx) {
  if (ctx && ctx.group && ctx.group.groupId) return ctx.group.groupId;
  return "private";
}

function getStorageKey(ctx) {
  return "wallet:v1:" + getGroupId(ctx);
}

function emptyStore() {
  return {
    pcs: {},
    logs: []
  };
}

function loadStore(ctx) {
  var raw = ext.storageGet(getStorageKey(ctx));
  if (!raw) return emptyStore();
  try {
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyStore();
    if (!data.pcs || typeof data.pcs !== "object") data.pcs = {};
    if (!data.logs || !Array.isArray(data.logs)) data.logs = [];
    return data;
  } catch (err) {
    console.log("[钱包与背包] storage parse error: " + String(err));
    return emptyStore();
  }
}

function saveStore(ctx, data) {
  ext.storageSet(getStorageKey(ctx), JSON.stringify(data));
}

function getPcName(ctx) {
  if (ctx && ctx.player && ctx.player.name) return String(ctx.player.name);
  return "";
}

function ensurePc(data, pcName) {
  if (!data.pcs[pcName]) {
    data.pcs[pcName] = {
      wallet: {},
      items: {}
    };
  }
  if (!data.pcs[pcName].wallet || typeof data.pcs[pcName].wallet !== "object") data.pcs[pcName].wallet = {};
  if (typeof data.pcs[pcName].money === "number" && data.pcs[pcName].money !== 0) {
    data.pcs[pcName].wallet[DEFAULT_CURRENCY] = data.pcs[pcName].money;
  }
  delete data.pcs[pcName].money;
  if (!data.pcs[pcName].items || typeof data.pcs[pcName].items !== "object") data.pcs[pcName].items = {};
  return data.pcs[pcName];
}

function hasEditPrivilege(ctx) {
  return ctx && ctx.privilegeLevel >= MIN_EDIT_PRIVILEGE;
}

function parseAmount(text) {
  if (text === undefined || text === null || text === "") return null;
  var n = Number(text);
  if (!isFinite(n)) return null;
  return n;
}

function fmtAmount(n) {
  if (Math.round(n) === n) return String(n);
  return String(Math.round(n * 100) / 100);
}

function normalizeCurrency(text) {
  if (!text) return DEFAULT_CURRENCY;
  var s = String(text).trim();
  var lower = s.toLowerCase();
  var aliases = {
    "$": "美元",
    "usd": "美元",
    "dollar": "美元",
    "dollars": "美元",
    "美金": "美元",
    "刀": "美元",
    "£": "英镑",
    "gbp": "英镑",
    "pound": "英镑",
    "pounds": "英镑",
    "sp": "先令",
    "shilling": "先令",
    "shillings": "先令",
    "p": "便士",
    "penny": "便士",
    "pence": "便士",
    "franc": "法郎",
    "francs": "法郎",
    "jpy": "日元",
    "yen": "日元"
  };
  return aliases[lower] || s;
}

function getCurrencyAmount(pc, currency) {
  if (!pc.wallet || typeof pc.wallet !== "object") pc.wallet = {};
  if (typeof pc.wallet[currency] !== "number") pc.wallet[currency] = 0;
  return pc.wallet[currency];
}

function setCurrencyAmount(pc, currency, amount) {
  if (!pc.wallet || typeof pc.wallet !== "object") pc.wallet = {};
  if (amount === 0) {
    delete pc.wallet[currency];
  } else {
    pc.wallet[currency] = amount;
  }
}

function reply(ctx, msg, text) {
  seal.replyToSender(ctx, msg, text);
}

function nowText() {
  var d = new Date();
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function pushLog(ctx, data, text) {
  var who = getPcName(ctx) || (ctx.player && ctx.player.userId) || "unknown";
  data.logs.unshift(nowText() + " " + who + " " + text);
  if (data.logs.length > MAX_LOGS) data.logs = data.logs.slice(0, MAX_LOGS);
}

function showWallet(ctx, msg) {
  var pcName = getPcName(ctx);
  if (!pcName) {
    reply(ctx, msg, "没有找到当前 PC 名。请先使用 .pc new <角色名> 或 .pc tag <角色名>。");
    return ok();
  }

  var data = loadStore(ctx);
  var pc = ensurePc(data, pcName);
  saveStore(ctx, data);

  var currencies = [];
  for (var currency in pc.wallet) {
    if (pc.wallet[currency] !== 0) currencies.push(currency);
  }
  currencies.sort();

  if (currencies.length === 0) {
    reply(ctx, msg, pcName + " 的钱包是空的。");
    return ok();
  }

  var lines = [pcName + " 的钱包："];
  for (var i = 0; i < currencies.length; i++) {
    lines.push("- " + currencies[i] + "：" + fmtAmount(pc.wallet[currencies[i]]));
  }
  reply(ctx, msg, lines.join("\n"));
  return ok();
}

function showInventory(ctx, msg) {
  var pcName = getPcName(ctx);
  if (!pcName) {
    reply(ctx, msg, "没有找到当前 PC 名。请先使用 .pc new <角色名> 或 .pc tag <角色名>。");
    return ok();
  }

  var data = loadStore(ctx);
  var pc = ensurePc(data, pcName);
  saveStore(ctx, data);

  var names = [];
  for (var itemName in pc.items) {
    if (pc.items[itemName] > 0) names.push(itemName);
  }
  names.sort();

  if (names.length === 0) {
    reply(ctx, msg, pcName + " 的背包是空的。");
    return ok();
  }

  var lines = [pcName + " 的背包："];
  for (var i = 0; i < names.length; i++) {
    lines.push("- " + names[i] + " x" + fmtAmount(pc.items[names[i]]));
  }
  reply(ctx, msg, lines.join("\n"));
  return ok();
}

function walletHelp(ctx, msg) {
  reply(ctx, msg, [
    "钱包与背包插件",
    "",
    "普通玩家：",
    ".钱包 - 查看当前 .pc 角色的钱包",
    ".背包 - 查看当前 .pc 角色的背包",
    ".钱包探测 - 查看当前识别到的 PC 和权限",
    "",
    "管理员/群主/Master：",
    ".钱包 add <PC名> <币种> <金额>",
    ".钱包 spend <PC名> <币种> <金额>",
    ".钱包 set <PC名> <币种> <金额>",
    ".钱包 add <PC名> <金额> - 兼容旧格式，币种记为“货币”",
    ".背包 add <PC名> <物品> <数量>",
    ".背包 del <PC名> <物品> <数量>",
    ".背包 set <PC名> <物品> <数量>",
    ".钱包 log - 查看最近操作记录",
    "",
    "例：",
    ".钱包 add 测试用 美元 20",
    ".钱包 spend 测试用 英镑 1",
    ".背包 add 测试用 急救包 1"
  ].join("\n"));
  return ok();
}

function showProbe(ctx, msg) {
  var pcName = getPcName(ctx);
  reply(ctx, msg, [
    "钱包插件探测",
    "当前 PC: " + (pcName || "<未识别>"),
    "用户ID: " + ((ctx.player && ctx.player.userId) || "<未知>"),
    "群ID: " + getGroupId(ctx),
    "权限等级: " + ctx.privilegeLevel,
    "可改账: " + (hasEditPrivilege(ctx) ? "是" : "否")
  ].join("\n"));
  return ok();
}

function showLogs(ctx, msg) {
  if (!hasEditPrivilege(ctx)) {
    reply(ctx, msg, "权限不足：只有管理员/群主/Master 可以查看钱包操作记录。");
    return ok();
  }

  var data = loadStore(ctx);
  if (!data.logs.length) {
    reply(ctx, msg, "暂无钱包/背包操作记录。");
    return ok();
  }

  reply(ctx, msg, "最近操作记录：\n" + data.logs.slice(0, 10).join("\n"));
  return ok();
}

function handleWalletEdit(ctx, msg, cmdArgs) {
  if (!hasEditPrivilege(ctx)) {
    reply(ctx, msg, "权限不足：只有管理员/群主/Master 可以修改钱包。");
    return ok();
  }

  var op = cmdArgs.getArgN(1);
  var pcName = cmdArgs.getArgN(2);
  var currency = DEFAULT_CURRENCY;
  var amount = null;
  var third = cmdArgs.getArgN(3);
  var fourth = cmdArgs.getArgN(4);

  if (fourth) {
    currency = normalizeCurrency(third);
    amount = parseAmount(fourth);
  } else {
    amount = parseAmount(third);
  }

  if (!pcName || amount === null) {
    reply(ctx, msg, "格式：.钱包 add/spend/set <PC名> <币种> <金额>\n兼容旧格式：.钱包 add/spend/set <PC名> <金额>");
    return ok();
  }

  var data = loadStore(ctx);
  var pc = ensurePc(data, pcName);
  var current = getCurrencyAmount(pc, currency);

  if (op === "add" || op === "增加" || op === "+") {
    current += amount;
    setCurrencyAmount(pc, currency, current);
    pushLog(ctx, data, "给 " + pcName + " 增加 " + currency + " " + fmtAmount(amount) + "，余额 " + fmtAmount(current));
    saveStore(ctx, data);
    reply(ctx, msg, pcName + " 增加 " + currency + " " + fmtAmount(amount) + "。\n当前余额：" + fmtAmount(current));
    return ok();
  }

  if (op === "spend" || op === "del" || op === "减少" || op === "消耗" || op === "-") {
    current -= amount;
    setCurrencyAmount(pc, currency, current);
    pushLog(ctx, data, pcName + " 消耗 " + currency + " " + fmtAmount(amount) + "，余额 " + fmtAmount(current));
    saveStore(ctx, data);
    reply(ctx, msg, pcName + " 消耗 " + currency + " " + fmtAmount(amount) + "。\n当前余额：" + fmtAmount(current));
    return ok();
  }

  if (op === "set" || op === "设置") {
    setCurrencyAmount(pc, currency, amount);
    pushLog(ctx, data, "将 " + pcName + " 的 " + currency + " 设置为 " + fmtAmount(amount));
    saveStore(ctx, data);
    reply(ctx, msg, pcName + " 的 " + currency + " 已设置为 " + fmtAmount(amount) + "。");
    return ok();
  }

  reply(ctx, msg, "未知操作：" + op + "\n可用：add / spend / set");
  return ok();
}

function handleInventoryEdit(ctx, msg, cmdArgs) {
  if (!hasEditPrivilege(ctx)) {
    reply(ctx, msg, "权限不足：只有管理员/群主/Master 可以修改背包。");
    return ok();
  }

  var op = cmdArgs.getArgN(1);
  var pcName = cmdArgs.getArgN(2);
  var itemName = cmdArgs.getArgN(3);
  var amount = parseAmount(cmdArgs.getArgN(4));
  if (!pcName || !itemName || amount === null) {
    reply(ctx, msg, "格式：.背包 add/del/set <PC名> <物品> <数量>");
    return ok();
  }

  var data = loadStore(ctx);
  var pc = ensurePc(data, pcName);
  if (!pc.items[itemName]) pc.items[itemName] = 0;

  if (op === "add" || op === "增加" || op === "+") {
    pc.items[itemName] += amount;
    pushLog(ctx, data, "给 " + pcName + " 增加物品 " + itemName + " x" + fmtAmount(amount));
    saveStore(ctx, data);
    reply(ctx, msg, pcName + " 获得 " + itemName + " x" + fmtAmount(amount) + "。\n当前数量：" + fmtAmount(pc.items[itemName]));
    return ok();
  }

  if (op === "del" || op === "remove" || op === "减少" || op === "消耗" || op === "-") {
    pc.items[itemName] -= amount;
    if (pc.items[itemName] <= 0) delete pc.items[itemName];
    pushLog(ctx, data, pcName + " 消耗物品 " + itemName + " x" + fmtAmount(amount));
    saveStore(ctx, data);
    reply(ctx, msg, pcName + " 消耗 " + itemName + " x" + fmtAmount(amount) + "。");
    return ok();
  }

  if (op === "set" || op === "设置") {
    if (amount <= 0) {
      delete pc.items[itemName];
    } else {
      pc.items[itemName] = amount;
    }
    pushLog(ctx, data, "将 " + pcName + " 的 " + itemName + " 设置为 x" + fmtAmount(amount));
    saveStore(ctx, data);
    reply(ctx, msg, pcName + " 的 " + itemName + " 已设置为 x" + fmtAmount(amount) + "。");
    return ok();
  }

  reply(ctx, msg, "未知操作：" + op + "\n可用：add / del / set");
  return ok();
}

var cmdWallet = seal.ext.newCmdItemInfo();
cmdWallet.name = "钱包";
cmdWallet.help = ".钱包 查看当前 PC 钱包；.钱包 add/spend/set <PC名> <币种> <金额> 管理员改账";
cmdWallet.solve = function (ctx, msg, cmdArgs) {
  var op = cmdArgs.getArgN(1);
  if (!op) return showWallet(ctx, msg);
  if (op === "help" || op === "帮助") return walletHelp(ctx, msg);
  if (op === "log" || op === "日志") return showLogs(ctx, msg);
  return handleWalletEdit(ctx, msg, cmdArgs);
};
ext.cmdMap["钱包"] = cmdWallet;

var cmdInventory = seal.ext.newCmdItemInfo();
cmdInventory.name = "背包";
cmdInventory.help = ".背包 查看当前 PC 背包；.背包 add/del/set <PC名> <物品> <数量> 管理员改物品";
cmdInventory.solve = function (ctx, msg, cmdArgs) {
  var op = cmdArgs.getArgN(1);
  if (!op) return showInventory(ctx, msg);
  if (op === "help" || op === "帮助") return walletHelp(ctx, msg);
  return handleInventoryEdit(ctx, msg, cmdArgs);
};
ext.cmdMap["背包"] = cmdInventory;

var cmdProbe = seal.ext.newCmdItemInfo();
cmdProbe.name = "钱包探测";
cmdProbe.help = ".钱包探测 查看钱包插件识别到的当前 PC、用户和权限";
cmdProbe.solve = function (ctx, msg, cmdArgs) {
  return showProbe(ctx, msg);
};
ext.cmdMap["钱包探测"] = cmdProbe;

var cmdWalletHelp = seal.ext.newCmdItemInfo();
cmdWalletHelp.name = "钱包帮助";
cmdWalletHelp.help = ".钱包帮助 查看钱包与背包插件帮助";
cmdWalletHelp.solve = function (ctx, msg, cmdArgs) {
  return walletHelp(ctx, msg);
};
ext.cmdMap["钱包帮助"] = cmdWalletHelp;
