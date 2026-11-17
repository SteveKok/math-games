# 思维小游戏 · Think & Play

给 8–12 岁孩子的免费、开源网页小游戏：先玩、先试错、自己发现规律，通关后再用一句话点破背后的数学。

> 项目重新开始：之前的三个游戏（取石子、说谎者与诚实者、一笔画与涂地图）已移除，代码仍保存在 git 历史里（提交 `b5e7328` 及之前）。

- 纯静态：HTML + CSS + JavaScript，无构建步骤、无后端、无账号
- 不收集任何信息、没有追踪脚本；进度只存在本机浏览器（localStorage，读写都包 try/catch）
- 所有图形用 SVG / Canvas 代码绘制，音效用 WebAudio 现场合成（可静音）
- 中文 / 英文，已预留马来文
- 大字、高对比、触屏友好；失败不惩罚，没有倒计时
- 用户开了「减少动态效果」时不做动画

## 怎么玩

直接双击 `index.html`（脚本用普通 `<script>` 加载，`file://` 下也能运行），或者：

```bash
python3 -m http.server 8765
```

## 部署到 GitHub Pages

推到 GitHub 仓库，Settings → Pages → Source 选 `main` 分支根目录。没有构建步骤。
每次改了 CSS / JS，把 HTML 里的 `?v=N` 加 1，让浏览器拿到新文件。

## 文件

```
index.html        首页（游戏卡片）
css/style.css     共用样式：顶栏、按钮、卡片、弹窗、选关、规则列表
js/core.js        共用工具：本地存储、伪随机数、多语言、音效、图标、顶栏
js/strings.js     所有界面文字（zh / en / ms）
js/fx.js          通关时撒星星（canvas）
```

## 加一个游戏

- `xxx.html` + `js/xxx-logic.js`（纯规则，UMD，Node 能直接 require）+ `js/xxx-game.js`（界面）+ 皮肤文件
- `tests/xxx-logic.test.js`：用程序验证数学正确性，`node tests/xxx-logic.test.js` 运行
- 在 `index.html` 加一张卡片，在 `strings.js` 加文字

## 许可

见 [LICENSE](LICENSE)。
