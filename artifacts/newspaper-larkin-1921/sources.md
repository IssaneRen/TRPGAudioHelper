# 来源说明：Daily Express 拉金秘鲁招募首版重构

本文件用于 Keeper / 制作者核查。报纸本体 `newspaper.html` 为英文沉浸式道具，不在版面内显示来源脚注。

## 总体说明

- 产物性质：1921 年 2 月 28 日伦敦《Daily Express》首版风格重构，不是原版逐字复刻。
- 报纸标题：`Daily Express`。公开资料显示该报 1900 年创刊，1921 年已存在；公开资料还称它属于较早把新闻而非广告放上头版的英国报纸之一。
- 档案限制：本轮没有直接访问付费报纸档案或 `UK Press Online` 原版扫描页，因此不能声称这些条目同日在真实《Daily Express》同版出现。
- 虚构钩子：`Augustus Larkin`、秘鲁古物探险招募、`Continental Hotel` 投递方式及同内容小广告服务于《奈亚拉托提普的面具》秘鲁篇情境，不作为真实历史事件。
- 真实新闻：除拉金招募及其相关小广告外，版面新闻均选自 1921 年 2 月下旬至 1921 年春前后可核验事件，并按伦敦读者可能关注的外交、爱尔兰、航空、海外争端和赔偿议题改写。

## 条目来源

| 版面条目 | 事实依据 | 来源 | 置信度 |
| --- | --- | --- | --- |
| 报头 `Daily Express` | 《Daily Express》1900 年创刊，1921 年已存在；资料称其早期采用头版新闻风格，并提示完整报纸档案可在 UK Press Online 查询。 | [Daily Express - Wikipedia](https://en.wikipedia.org/wiki/Daily_Express) | 中高。用于验证报纸存在性和风格倾向；未核对 1921-02-28 原版馆藏页。 |
| `Explorers Sought For Peruvian Antiquities Expedition` | 拉金、秘鲁高地、古物探险招募为模组故事钩子，不是真实新闻。 | 项目内条目 `public/wiki/entities/entries/module.profile.masks-of-nyarlathotep.peru-prologue.json`；用户任务说明。 | 虚构条目；项目内设定置信度高，历史置信度不适用。 |
| `Near East Parley Holds In London` | 1921 年伦敦会议第一阶段在 1921-02-21 至 1921-03-12 于伦敦举行，讨论一战后和约问题，尤其是《塞夫尔条约》及土耳其民族运动反对该安排。 | [Conference of London of 1921-1922 - Wikipedia](https://en.wikipedia.org/wiki/Conference_of_London_of_1921%E2%80%931922) | 中。事件日期和主题可用，但该页面自身引用较弱；正文只采用保守概括。 |
| `Heavy Losses Reported Near Midleton` | Clonmult ambush 发生于 1921-02-20，地点在 County Cork 的 Clonmult / Midleton 附近，造成 IRA 一方重大伤亡。 | [Clonmult ambush - Wikipedia](https://en.wikipedia.org/wiki/Clonmult_ambush)，该条目引用 Eunan O'Halpin 与 Daithí Ó Corráin, *The Dead of the Irish Revolution* (Yale, 2020) 等二手历史著作。 | 中。争议细节没有写死，只写可稳妥支撑的时间、地点和重大伤亡。 |
| `British Air Services Face A Stop` | Aircraft Transport and Travel 是英国早期航空公司，运营伦敦-巴黎商业航线；资料列 1921-02-28 英国公司因法方补贴争议停航。 | [Aircraft Transport and Travel - Wikipedia](https://en.wikipedia.org/wiki/Aircraft_Transport_and_Travel)；[British Airways heritage page](https://www.britishairways.com/en-gb/information/about-ba/history-and-heritage/explore-our-past/1910-1919) 用于交叉确认 AT&T 与 1919 年伦敦-巴黎商业航线背景。 | 中。停航日期依赖二手资料；航线背景由 BA 官方历史页交叉支持。 |
| `Coto River Dispute Alarms Panama` | Coto War / Guerra de Coto 发生于 1921-02-21 至 1921-03-05，起因是 Costa Rica force 占领 Pueblo Nuevo de Coto，引发 Panama 与 Costa Rica 军事冲突。 | [Coto War - Wikipedia](https://en.wikipedia.org/wiki/Coto_War)；条目参考 Elbridge Colby, “The United States and the Coto Dispute between Panama and Costa Rica,” *The Journal of International Relations*, 1922。 | 中。事件、日期和基本地理可靠；版面文字以 “telegrams report” 处理消息传递的不确定性。 |
| `Reparations Question Still Presses Europe` | 1921 年德国赔偿问题持续成为协约国政治经济焦点，随后 1921-05-05 的 London Schedule of Payments 确立赔偿责任与支付安排。 | [World War I reparations - Wikipedia](https://en.wikipedia.org/wiki/World_War_I_reparations) | 中。版面只写成趋势性背景短讯，未声称 1921-02-28 已有 5 月最终方案。 |
| 未采用候选：英国失业保险法案 | `Unemployment Insurance Act 1921` 于 1921-03-03 获 Royal Assent，接近本期时间，但不适合作为 1921-02-28 已成法新闻。 | [legislation.gov.uk 原文](https://www.legislation.gov.uk/ukpga/Geo5/11-12/1/contents/enacted) | 高。作为候选背景保留，未写入报纸正文。 |

## 处理原则

- 这是一张可跑团使用的“历史感重构报纸”，不是史料复刻。
- 所有非虚构新闻都保持在来源能支撑的范围内；对争议或引用较弱处采用概括写法。
- 报纸图片中不显示来源脚注，避免破坏玩家沉浸；来源存放在本文件和 `spec.json`。
