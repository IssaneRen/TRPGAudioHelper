# CoC 人物卡图片生成器

用于把 CoC 调查员 JSON 或本项目 Wiki 人物卡渲染成稳定风格的分享图。默认由 Python 直接绘制底图、分区、文字和头像，不依赖生成式 AI 写字。

## 目录

```text
tools/coc-card-renderer/
  render_coc_card.py
  download_fonts.py
  sample_character.json
  requirements.txt
  assets/
    NotoSerifSC-Regular.otf # 可选，download_fonts.py 下载
    NotoSerifSC-Bold.otf    # 可选，download_fonts.py 下载
    prompts.md
    avatar_frame.png      # 可选，从参考图裁出的透明头像框
    card_shell.png        # 可选，若存在则作为底图
    qr.png                # 可选，真实二维码
  output/
```

## 本地运行

```bash
python3 -m pip install -r tools/coc-card-renderer/requirements.txt
python3 tools/coc-card-renderer/download_fonts.py
python3 tools/coc-card-renderer/render_coc_card.py \
  tools/coc-card-renderer/sample_character.json \
  --out tools/coc-card-renderer/output/demo.png
```

从 Wiki 人物卡生成：

```bash
python3 tools/coc-card-renderer/render_coc_card.py \
  public/wiki/entities/entries/char.leina.json \
  --wiki-entry \
  --project-root . \
  --era classic_1920s \
  --out tools/coc-card-renderer/output/leina.png
```

从参考图裁头像框：

```bash
python3 tools/coc-card-renderer/render_coc_card.py \
  tools/coc-card-renderer/sample_character.json \
  --reference-image "/path/to/reference.png" \
  --extract-avatar-frame tools/coc-card-renderer/assets/avatar_frame.png
```

## 服务器运行

```bash
cd /opt/trpg-card-renderer
python3 -m pip install -r requirements.txt
python3 render_coc_card.py sample_character.json --out output/demo.png
```

如果要让 NapCat 发送图片，建议把输出目录放在海豹/NapCat 共享目录下，例如：

```text
/opt/sealdice-dice/data/rendered-cards/
```

## JSON 字段

必填：

```json
{
  "name": "调查员姓名",
  "birth_date": "出生年月日",
  "occupation": "职业",
  "birthplace": "出生地",
  "residence": "居住地",
  "native_language": "母语",
  "nationality": "目前国籍",
  "attributes": {
    "STR": 45,
    "CON": 55,
    "SIZ": 50,
    "DEX": 60,
    "APP": 70,
    "INT": 80,
    "POW": 65,
    "EDU": 75
  }
}
```

可选：

```json
{
  "player": "玩家",
  "occupation": "职业",
  "age": 29,
  "era": "classic_1920s",
  "residence": "阿卡姆",
  "avatar_path": "头像图片路径",
  "derived": {
    "hp": "10/10",
    "mp": "13/13",
    "san": "65/99",
    "mov": 8,
    "db": "0",
    "build": 0
  },
  "skills": {
    "图书馆使用": 75
  },
  "weapons": [
    {
      "name": "小型左轮",
      "skill": "手枪 45",
      "damage": "1D8"
    }
  ],
  "notes": "背景摘要",
  "notes_extra": "背景补充",
  "social": {
    "name": "白羽",
    "handle": "社媒账号: @baiyu_trpg",
    "channel": "二维码: 主页 / 频道 / 群入口"
  }
}
```

## 测试

```bash
python3 -m unittest discover -s tools/coc-card-renderer/tests -v
```

## 图层逻辑

推荐图层：

```text
Layer 0: Python 绘制底图
  1200x1800，包含牛皮档案纸、全部区域划分、固定标签、头像相框、边框和装饰。

Layer 1: 头像图片
  从 avatar_path 或 Wiki cocData.avatar 读取，裁切到右上头像框。

Layer 2: Python 动态文字
  调查员姓名、出生年月日、职业、出生地、居住地、属性数值、衍生数值、技能、随身物品、背景故事、社群信息、二维码。
```

`assets/card_shell.png` 存在时，脚本会优先使用它作为底图；不存在时使用 Python 自绘底图。当前推荐不再依赖 AI 底图。

时代技能：

- `--era classic_1920s`：不包含计算机使用、电子学，包含骑术等 1920s 常见技能。
- `--era modern`：包含计算机使用、电子学；Wiki 或 JSON 中已有技能优先显示，空位再按时代模板补齐。

二维码：

- `assets/qr.png` 存在时，脚本会贴入二维码区域。
- 不存在时，脚本会画一个假二维码占位。

需要用 ChatGPT Image 生成素材时，见 [assets/prompts.md](assets/prompts.md)。
