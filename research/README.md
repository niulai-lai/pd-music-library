# research/ — 馆藏考证工作档案

本目录保存内置 27 条馆藏的**考证与验证过程记录**，是 `docs/compliance-checklist.md` 的证据链，可随项目一并开源部署（纯静态文件，不影响站点运行）。

| 文件 | 内容 |
| --- | --- |
| `research1-9.py` 及对应 `.json` | 对 Wikimedia Commons API 的逐轮检索：古典录音、历史 78 转、Laufer 1901 中国田野录音系列、乐谱扫描件、许可标注核对 |
| `verified.json` | **核心档案**：全部入选文件的精确 URL、字节数、许可、录制/发行日期、HEAD 可用性与 CORS 检测结果 |
| `build-data.py` | 从 `verified.json` 组装 `data/music.json` + `data/music.js` 的构建脚本（含全部背景介绍文本） |
| `gen-pinyin.py` | 从 `music.json` 提取搜索字段汉字并生成 `assets/js/pinyin.js` 拼音字典 |
| `devserver.py` | 本地调试服务器（no-cache 头） |

## 复核方式

任一馆藏的许可状态都可以独立复核：打开 `verified.json` 中对应条目的 `url`（文件本身）或拼接 `https://commons.wikimedia.org/wiki/File:<文件名>`（文件页），页面载明作者、许可协议与数字化来源。

## 数据修改后的重建

若用 `build-data.py` 修改了数据，需要重新生成两份文件并同步拼音字典：

```bash
python research/build-data.py     # 生成 data/music.json 与 data/music.js
python research/gen-pinyin.py     # 重新生成 assets/js/pinyin.js
```
