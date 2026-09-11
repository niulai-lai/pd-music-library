# 音乐数据添加指南（含批量导入）

本站一切馆藏来自一个 JSON 文件：`data/music.json`。添加音乐 = **往数组里加对象**（或用「数据管理」页批量导入）。本文说明字段、流程、批量导入与常见问题。

## 一、最快的路径

用网页完成：打开本站 → `#/data`（数据管理）→ 导入 CSV 或 JSON → 校验通过后条目立即出现在馆藏中（保存在浏览器本地）。

要让**所有访客**都能看到，把审核通过的条目合并进 `data/music.json`（见第四节「合并回 JSON」）。

## 二、字段说明

```jsonc
{
  "id": "c01",                        // 可省略，系统自动生成；建议用有意义的编号
  "title": "月光",                     // 必填：作品名称
  "titleEn": "Clair de Lune",         // 选填：外文名，用于搜索
  "composer": "德彪西",                // 作者；民歌等佚名作品写「传统民歌（作者佚名）」
  "composerLife": "1862-1918",        // 作者生卒年；多个作者用「·」分隔
  "performer": "美国空军飞行乐团",      // 表演者
  "performerDetail": "补充说明",        // 选填
  "recordedYear": "1993",             // 录制年份；不确定写「约1930」或「年份未详」
  "era": "印象派",                     // 年代/流派时期
  "category": "古典音乐",              // 必填其一：古典音乐/民国老唱片/戏曲曲艺/红色歌曲/民间音乐/乐谱库
  "instrument": "铜管",
  "genre": "钢琴曲",
  "scenes": ["audiobook", "live"],    // 场景 id：documentary/audiobook/video/study/live/nostalgia
  "tags": ["柔和", "安静"],            // 标签兼作场景情绪匹配关键词
  "durationSec": 0,                   // 秒；填 0 则播放时自动读取并缓存
  "audio": {                          // 音频外链（与 scores 至少一项）
    "url": "https://upload.wikimedia.org/....mp3",
    "format": "MP3",                  // FLAC / MP3 / WAV
    "quality": "128kbps",             // 展示用音质说明
    "sizeMB": 3.95,                   // 文件大小（MB，详情页下载区展示）
    "cors": true                      // 外链是否支持 CORS（Wikimedia/存档库为 true）
  },
  "versions": ["c15", "c16"],         // 选填：同作品其他录音版本的条目 id（版本对比）
  "scores": [                         // 乐谱扫描件（乐谱档案条目必填）
    {"url": "https://...jpg", "label": "初版刊本", "page": "https://commons.wikimedia.org/wiki/File:..."}
  ],
  "source": {                         // 必填：可溯源的来源
    "name": "Wikimedia Commons",
    "page": "https://commons.wikimedia.org/wiki/File:....mp3",  // 来源文件页
    "license": "Public domain",       // Public domain / CC0
    "licenseNote": "权利说明（跨辖区要点）"
  },
  "background": "背景介绍，建议100-200字：创作背景、作者生平、历史背景。",
  "rare": false,                      // 冷门珍品（首页展示）
  "featured": true,                   // 精选推荐（首页展示）
  "playSeeds": 10,                    // 编者权重（热度排序基线，0-20 即可）
  "addedAt": "2026-09-11"             // 收录日期（最新收录排序）
}
```

**纯乐谱条目**（如手稿档案）可以没有 `audio`，但必须有 `scores` 与 `source`，并建议填写 `audioNote`（解释为何无音频/如何获取）。

## 三、批量导入（CSV / JSON）

### CSV

1. 下载 `data/import-template.csv`；
2. 按表头填写（支持 Excel/WPS 打开，注意用 UTF-8 保存）；
3. 数据管理页选择文件导入。

CSV 表头（与 JSON 字段对应）：

```
标题,作者,生卒年,表演者,录制年份,分类,标签,音频链接,乐谱链接,来源,来源名称,版权状态,背景介绍,场景,流派,乐器,时长秒
```

- 多值字段（标签、场景）用分号 `;` 分隔；
- 单元格内含逗号时用英文双引号包裹。

### JSON

粘贴或上传：

```json
[ { "title": "…", "audioUrl": "…", "sourceUrl": "…", "category": "古典音乐" } ]
```

或 `{"tracks": [ … ]}`。扁平字段（`audioUrl` / `scoreUrl` / `sourceUrl` / `sourceName` / `license`）会被自动整理成规范结构。

### 校验规则（不通过会逐条提示）

- `title` 缺失 → 拒绝；
- `audio.url` 与 `scores` 至少一项 → 否则拒绝；
- `source.page`（来源链接）缺失 → **拒绝（合规红线，不做降级）**；
- 与现有条目「标题+表演者」重复 → 跳过。

## 四、合并回 JSON（让所有人可见）

数据管理页 → 「导出 JSON」→ 打开 `data/music.json`，把导出数组里的对象追加进 `"tracks": [...]`。

**双文件同步**：`file://` 直接打开网站时，数据读自 `data/music.js`。两份内容必须一致。最简单做法：打开 `music.json`，全选复制其内容，替换 `music.js` 中 `window.PDML_DATA = ` 之后到行尾分号之前的部分（保持 `window.PDML_DATA = {...};` 的形态）。

## 五、拼音检索

站内 `assets/js/pinyin.js` 内置覆盖本馆藏区的拼音字典。新增条目若含字典外生僻字，中文搜索不受影响，拼音搜索该字不参与匹配——按字典注释把 `字: '拼音'` 补进 `DICT` 即可。

## 六、质量与合规要求（重申）

1. 每条必须可溯源：`source.page` 指向档案库文件页；
2. 只收 Public domain 与 CC0；跨辖区保护期不一致的（如 1925—1946 年美国录音）按规范处理为档案条目或直接不收，见 [collection-policy.md](collection-policy.md)；
3. `background` 写 100—200 字，信息要准确，不确定的内容明确写「待考」，不编造；
4. 音频链接优先选支持 CORS 的存档直链（Wikimedia Commons），以获得完整 Web Audio 体验。
