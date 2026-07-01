# xxt 人物卡录入阅读与工作记录

## 本次任务范围

- 检查当前项目中 PL、Wiki 人物词条、CoC 人物卡、隐藏内容和 token 鉴权的存放方式。
- 读取 `/Users/hongfei_ren/Documents/personal/奈面带团/Alvyn Brooke 阿尔文·布鲁克.xlsx`。
- 新增 PL `xxt`。
- 将阿尔文·布鲁克的人物卡录入世界 Wiki，并把人物卡和绝大部分背景内容放入仅 `pl.xxt` 与 KP 可见的隐藏块。
- 为阿尔文背景故事中的哥哥里斯·布鲁克创建人物词条，保留公开索引，详细内容对所有 PL 隐藏。

## 阅读记录：知识存放位置

| 主题 | 位置 | 本次读到的结论 |
| --- | --- | --- |
| 项目总览 | `README.md` | 本项目是 React/Vite 静态站点；世界 Wiki 数据源在 `public/wiki/entities/`，索引由 `pnpm generate:wiki` 生成。 |
| 业务规则 | `docs/business.md` | Wiki 面向 PL 跑后回顾；正文使用结构化 block；支持 `secret-panel`、`secret-inline`、`coc-sheet`。 |
| Wiki 类型 | `src/types/wiki.ts` | `WikiEntryRecord` 是词条；`WikiPlayer` 是 PL；`WikiBlock` 支持 `secret-panel` 与 `coc-sheet`；`CocSheetData` 存属性和技能。 |
| Wiki 数据工具 | `scripts/wiki-data.ts` | `players.json`、`modules.json`、`entries/*.json` 共同生成 `public/wiki/index.json`；脚本会校验 `playerIds`、`relatedEntryIds`、隐藏块权限引用。 |
| Wiki 渲染 | `src/features/wiki/WikiContentRenderer.tsx` | 只有 `secret-panel` 与 `secret-inline` 会按 `playerIds` 和 `revealAllSecrets` 解锁；裸 `coc-sheet` 不会自动隐藏。 |
| 人物卡渲染 | `src/features/wiki/CocSheetPanel.tsx`、`src/utils/coc-sheet.ts` | `coc-sheet` 会归一化为属性面板和技能面板；技能的 `growth` 代表后续成长，不应拿建卡投入当成长。 |
| Wiki 页面 | `src/pages/WorldWikiTab/index.tsx` | 当前登录身份来自 AI Gateway session；KP 由 `isKeeper` 解锁所有隐藏内容；详情页顶层 `coc-sheet` 会公开显示。 |
| 前端鉴权客户端 | `src/features/ai/ai-gateway-client.ts`、`src/features/ai/use-ai-session.ts` | 前端只保存 token；刷新后请求 `/api/session` 得到 `playerId`、`displayName`、`isKeeper`。 |
| 服务端 token 校验 | `trpg-ai-gateway/src/auth/tokens.ts`、`trpg-ai-gateway/src/config.ts`、`trpg-ai-gateway/src/server.ts` | token 使用 `TOKEN_HASH_PEPPER` 加盐 SHA-256；服务端用 `timingSafeEqual` 比较；`/api/session` 返回会话。 |
| token 哈希数据 | `trpg-ai-gateway/data/auth/token-hashes.json` | 当前仓库只保存 token hash，不保存明文 token。没有 `xxt` 的 token 与 pepper 时，不能安全生成 `pl.xxt` 的登录记录。 |
| 子仓规则 | `repo.json`、`manage-subrepositories` skill | 涉及 `trpg-ai-gateway` 时应先跑 `pnpm sync:subrepos`；本次执行被 pnpm 非交互审批策略阻断，详见工作记录。 |
| 人物卡源文件 | `Alvyn Brooke 阿尔文·布鲁克.xlsx` 的 `人物卡` / `简化卡 骰娘导入` | 读出阿尔文的姓名、PL、属性、派生值、非默认技能、背景、资产、随身物品、武器和肖像。 |

## 当前人物卡存放方法

1. PL 列表在 `public/wiki/entities/players.json`，使用 `pl.xxx` 作为唯一 key。
2. 人物词条在 `public/wiki/entities/entries/char.*.json`。
3. 人物卡数据写在词条 `content` 的 `coc-sheet` block 中，字段为 `attributes` 与 `skills`。
4. 如果 `coc-sheet` 放在顶层，详情页和部分列表/导入逻辑会把它当作公开人物卡读取。
5. 因此本次把阿尔文的 `coc-sheet` 放进 `secret-panel`，授权 `playerIds: ["pl.xxt"]`，避免无权限页面直接展示。

## 当前加密/校验方法

项目里的“加密”实际分两层：

1. Wiki 内容隐藏：
   - `secret-panel.playerIds` 或 `secret-inline.playerIds` 控制 PL 可见性。
   - `playerIds: []` 或缺少授权时，普通 PL 不能看；KP 的 `isKeeper` 可全局查看。
   - 这是前端遮罩隐藏，不是对 JSON 源文件做加密。
2. 登录 token 校验：
   - 主站前端只保存 token。
   - AI Gateway 用 `TOKEN_HASH_PEPPER + token` 生成 SHA-256 hash，并用 `timingSafeEqual` 与 `token-hashes.json` 比对。
   - `token-hashes.json` 只应保存 hash，不应保存 token 原文。

## Excel 录入摘要

来源工作表：`人物卡` 与 `简化卡 骰娘导入`，使用 `data_only=True` 读取缓存值。

- 姓名：`Alvyn Brooke 阿尔文·布鲁克`
- 玩家：`xxt`
- 时代：`1920s`
- 职业：`学生`
- 年龄：`21`
- 性别：`男`
- 住地 / 故乡：`英国` / `英国`
- 当前时间：`公元 1920 年 1 月 1 日 0:00`
- 属性：STR 45、CON 65、SIZ 85、DEX 65、INT 75、POW 60、APP 60、EDU 55、LUCK 55
- 派生：HP 15/15、SAN 60/99、MP 12/12、MOV 7、DB `+1D4`、Build 1、闪避 60
- 初始状态技能录入：信用评级 10、闪避 60、格斗：斗殴 60、历史 60、外语：罗曼语族 80、母语 55、图书馆使用 50、聆听 60、说服 60、侦查 68
- 资产：生活水平标准，消费水平 10，其他资产 500，当前现金 20 美元
- 随身物品：挎包；钢笔、笔记本、简易语言工具书、小词典、小型放大镜、护照、英国银币、手提灯、镇痛药、便携罐头、防身用的小刀
- 武器：徒手斗殴；小刀

## 本次变更记录

- 新增 PL：`public/wiki/entities/players.json` 中加入 `pl.xxt`。
- 新增阿尔文词条：`public/wiki/entities/entries/char.alvyn-brooke.json`。
- 新增里斯词条：`public/wiki/entities/entries/char.rees-brooke.json`。
- 新增阿尔文肖像资源：`public/wiki/characters/char.alvyn-brooke.png`。
- 重新生成索引：`public/wiki/index.json`。

## 执行异常记录

- 按子仓规则执行 `pnpm sync:subrepos` 时，第一次被非交互 `node_modules` 清理确认阻断。
- 使用 `CI=true PNPM_CONFIG_CONFIRM_MODULES_PURGE=false pnpm sync:subrepos` 重试后，pnpm 重建了根目录 `node_modules`，但仍因 build-script 审批策略停在 `esbuild`，脚本没有完成子仓同步逻辑。
- 重试过程中产生了无关的 `pnpm-workspace.yaml` 占位文件，已删除。

## 需要向 KP 确认的问题

1. 是否需要给 `pl.xxt` 配置可登录 token？如果需要，请提供明文 token 并在安全环境中生成 hash，或直接提供按当前 `TOKEN_HASH_PEPPER` 生成后的 `tokenHash`。我不应臆造 token，也不能从现有 hash 反推出 token。
2. 里斯·布鲁克是否需要完整 CoC 数值卡？当前 Excel 只给出了姓名、兄弟关系、年龄线索、战地记者经历、旅行爱好和钢笔相关信息，属性/技能/资产/现状均未出现。
3. 阿尔文背景故事最后一个单元格以 `...` 结尾。我按原文录入了省略号；如果这里不是刻意省略，而是 Excel 中尚未写完，需要补充原始文本。
