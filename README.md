# 公有领域音乐图书馆 · Public Domain Music Library

一个纯静态、免后端、免注册的公有领域音乐资料站：收录版权保护期已满的**古典音乐、清末民初老录音、戏曲曲艺、红色歌曲档案、民间音乐与乐谱**，每件馆藏均可溯源到公开档案库（Wikimedia Commons 等），音频与乐谱一律外链、本站不存储任何文件。

> 免责声明：本站所有内容均来自公开公有领域资源，仅供学习、研究、创作使用。作品版权状态以来源标注为准，商用前请自行核实。如您认为内容侵犯版权，请联系立即移除。

---

## 本地运行

### 方式零：双击 `启动.bat`（Windows 推荐）

自动启动本地服务器（默认 8080 端口，被占用时自动换 8180）并**用系统默认浏览器**打开网站；未安装 Python 时自动退回直接打开 `index.html`。停止服务器：关闭任务栏上最小化的「公有领域音乐图书馆服务器」窗口。

### 方式一：直接双击打开 index.html（最简单）

双击 `index.html` 即可在浏览器中使用。
- 数据会自动从 `data/music.js` 加载（`file://` 协议下的回退方案）。
- 收藏、歌单、播放历史保存在浏览器 localStorage，不受影响。

### 方式二：本地静态服务器（推荐，体验完整功能）

```bash
# Python 3（Windows / macOS / Linux 通用）
python -m http.server 8080
# 或 Node.js
npx serve .
```

然后访问 <http://localhost:8080>。此模式下数据直接读取 `data/music.json`，**修改 JSON 即可新增音乐**，刷新生效。

> 两种方式的差异：`file://` 下浏览器禁止页面 `fetch` 本地文件，因此从 `data/music.js` 取数；HTTP 模式下优先 `fetch('data/music.json')`。两份数据内容一致（见「新增音乐」）。

### 浏览器支持

Chrome / Edge / Firefox / Safari 及各平台手机浏览器。播放器在 Web Audio 不可用或外链不支持 CORS 时自动降级为直接播放；部分存档 FLAC 为大文件，首播需要少量缓冲时间。

## 功能总览

| 模块 | 说明 |
| --- | --- |
| 首页 | 精选推荐、精选专辑、冷门珍品、场景歌单入口、最新收录、热门播放、随机推荐 |
| 分类浏览 | 六大馆区分类树 + 年代 + 作曲家/乐器/流派/表演者/场景多维筛选；按热度/时间/名称排序；网格与列表视图；分页 + 无限滚动两种加载方式 |
| 搜索 | 中文关键词、模糊匹配、拼音全拼与首字母（如 `beiduofen`、`bdf`） |
| 作品详情 | 完整元数据（作者生卒年/表演者/录制年份/时长/格式/版权状态/来源链接）、100—200 字背景介绍、下载（含文件大小与音质标注）、版本对比、乐谱灯箱预览（缩放平移）、关联推荐 |
| 场景推荐 | 纪录片BGM / 有声书背景 / 视频剪辑 / 学习白噪音 / 直播背景 / 怀旧氛围，一键生成连续播放歌单 |
| 播放器 | Web Audio API：播放暂停、进度、音量、倍速（0.75—2.0×）、循环（关闭/列表/单曲）、上一首/下一首、曲尾淡出接续、系统级 Media Session（锁屏可控，后台播放）、电平可视化、键盘快捷键 |
| 我的书架 | 收藏、自定义歌单、播放历史，全部 localStorage 本地保存 |
| 数据管理 | CSV / JSON 批量导入导出、模板下载、字段校验、本地数据清理 |
| 资源来源 / 关于 | 七个来源档案库的版权说明与收录规则、收录规范、快捷键表、免责声明 |

### 键盘快捷键

`空格` 播放/暂停 · `←/→` 快退/快进 5 秒 · `↑/↓` 音量 · `N/P` 下一首/上一首 · `L` 循环 · `R` 倍速 · `M` 静音 · `F` 收藏

### 显示与无障碍

- 顶栏 `◐` 深浅色模式（记住选择，默认跟随系统）；`A` 四档字号（小/标准/大/特大，持久化）。
- 手机端自动收纳为抽屉导航、播放条折叠布局；全部交互具备加载中/空态/错误提示。

## 新增音乐（一句话版）

**HTTP 部署：编辑 `data/music.json` 的 `tracks` 数组即可。** `file://` 本地使用需同步更新 `data/music.js`（内容一致）。字段、校验规则与合规要求详见 [docs/data-guide.md](docs/data-guide.md) 与 [docs/collection-policy.md](docs/collection-policy.md)。

### 目录结构

```
pd-music-library/
├── index.html                  # 单页应用外壳
├── assets/
│   ├── css/style.css           # 设计系统（复古档案馆风 / 暗色模式 / 字号 / 响应式）
│   └── js/
│       ├── util.js             # 存储、格式化、Toast、弹窗、灯箱、懒加载
│       ├── pinyin.js           # 拼音检索字典
│       ├── data.js             # 数据层：双模式加载、索引、导入导出、个人数据
│       ├── search.js           # 搜索引擎（原文/模糊/拼音/首字母）
│       ├── player.js           # Web Audio 播放器（双通道交叉淡入、MediaSession）
│       ├── views-common.js     # 卡片/列表/弹窗等视图共享组件
│       ├── views-home.js       # 首页
│       ├── views-browse.js     # 分类浏览
│       ├── views-work.js       # 作品详情
│       ├── views-scene.js      # 场景推荐与场景歌单
│       ├── views-library.js    # 我的书架
│       ├── views-misc.js       # 搜索/来源/关于/数据管理/404
│       ├── router.js           # Hash 路由
│       └── app.js              # 应用引导：主题、搜索联想、快捷键、播放条 UI
├── data/
│   ├── music.json              # 馆藏数据（HTTP 模式直接读取，编辑此文件加歌）
│   ├── music.js                # file:// 回退数据（内容与 music.json 一致）
│   ├── import-template.csv     # CSV 导入模板
│   └── import-template.json    # JSON 导入模板
├── docs/
│   ├── deploy.md               # 静态托管部署教程
│   ├── data-guide.md           # 音乐数据添加指南
│   ├── collection-policy.md    # 公有领域收录规范
│   └── compliance-checklist.md # 版权合规自查清单
└── README.md
```

## 部署

任何静态托管均可直接部署（无构建步骤）：GitHub Pages、Vercel、Netlify、Cloudflare Pages 或任意对象存储 + CDN。逐步操作见 [docs/deploy.md](docs/deploy.md)。

## 合规

- 收录范围与判断标准：[docs/collection-policy.md](docs/collection-policy.md)
- 每条新增馆藏上架前逐项核对：[docs/compliance-checklist.md](docs/compliance-checklist.md)
- 内置馆藏示例均取自 Wikimedia Commons 公开文件页（Public domain / CC0），来源页链接可逐条点开核对；红色歌曲等存在跨辖区录音权差异的条目按规范作「档案条目」处理并注明原因。

## 许可

- 本站代码：MIT License。
- 馆藏音频与乐谱：各自来源页标注为准（Public domain / CC0）；引用时请保留来源链接与权利声明。
