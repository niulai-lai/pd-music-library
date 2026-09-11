# 静态网站部署教程

本站是**纯静态**站点（HTML + CSS + 原生 JS，无构建步骤、无后端），任何静态托管平台都可以直接部署。以下给出四种常见方案，按需选择其一即可。

## 部署前检查

1. 确认 `data/music.json` 与 `data/music.js` 内容一致（若只改过其中一份，参考 [data-guide.md](data-guide.md) 的「双文件同步」一节）。
2. 本地先跑一遍：`python -m http.server 8080` 后访问 <http://localhost:8080>，确认首页、搜索、播放、详情页正常。
3. 建议开启平台的 HTTPS（以下平台默认开启）。

---

## 方案一：GitHub Pages

1. 在 GitHub 创建一个仓库（例如 `pd-music-library`）。
2. 上传本项目全部文件（网页端拖拽，或命令行）：

   ```bash
   git init
   git add .
   git commit -m "init: 公有领域音乐图书馆"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/pd-music-library.git
   git push -u origin main
   ```

3. 打开仓库 → **Settings → Pages** → **Build and deployment**：
   - Source 选择 `Deploy from a branch`；
   - Branch 选择 `main`、目录 `/ (root)`，保存。
4. 一两分钟后访问 `https://<你的用户名>.github.io/pd-music-library/`。

> 子路径部署（`/仓库名/` 前缀）下，站内全部链接使用相对路径与 hash 路由，无需任何改动。

## 方案二：Vercel

1. 登录 <https://vercel.com> → **Add New → Project**。
2. 导入 GitHub 仓库（或用 `vercel` CLI 在项目目录直接 `vercel`）。
3. Framework Preset 选择 **Other**（纯静态），构建命令与输出目录留空，**Deploy**。
4. 部署完成后得到 `https://<项目名>.vercel.app`。

## 方案三：Netlify / Cloudflare Pages

- **Netlify**：登录 → **Add new site → Deploy manually**，把整个项目文件夹拖入网页即可；或连接 Git 仓库，构建命令留空、发布目录填 `/`。
- **Cloudflare Pages**：Create project → 连接 Git 仓库 → Framework preset 选 **None**，构建命令留空，输出目录 `/`。

## 方案四：对象存储 + CDN（阿里云 OSS / 腾讯云 COS / AWS S3）

1. 在控制台创建存储桶，把项目**全部文件**（含 `data/`、`assets/`、`docs/`）上传到根目录。
2. 开启「静态网站托管」功能：
   - 索引文档（Index document）：`index.html`；
   - 错误文档（Error document）：`index.html`（站内为 hash 路由，实际不会 404，稳妥起见如此填写）。
3. 按平台指引为静态站点绑定自定义域名并开启 CDN 加速。
4. 访问分配的站点地址验证。

> 对象存储需确认 Bucket 的 CORS 或防盗链设置不会拦截外部音频链接——本站音频全部外链自 Wikimedia Commons，与你的存储桶无关，无需额外配置。

---

## 部署后自检清单

- [ ] 首页正常打开，六个馆区均有条目数量显示
- [ ] 随机点一首能播放（首次加载 FLAC 稍慢属正常）
- [ ] 搜索 `beiduofen` 能命中贝多芬相关曲目（拼音索引正常）
- [ ] 任一详情页「来源出处」链接能打开 Commons 文件页
- [ ] 手机浏览器打开，导航折叠、播放条可折叠
- [ ] 页脚免责声明完整可见

## 更新数据

直接修改 `data/music.json` 后推送/重新上传即可，无需重新构建。若希望导入的条目长期生效，参考 [data-guide.md](data-guide.md) 把本地导入数据合并进 JSON。
