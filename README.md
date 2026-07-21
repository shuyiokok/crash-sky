# 冲上云霄 · Web 试玩版

麻将局后 Crash 小游戏演示。**本地结算**，免费筹码，可分享给他人在浏览器试玩。

## 本地运行

```bash
cd E:\ai\crash
npm install
npm run dev
```

浏览器打开终端提示的地址（默认 `http://127.0.0.1:5173`）。

## 分享给别人玩

### 方式 A：打包预览（同一局域网）

```bash
npm run build
npm run preview -- --host
```

把终端里的 Network 地址发给同事（需同一 Wi‑Fi）。

### 方式 B：部署到公网（推荐）

任选其一：

1. **Vercel / Netlify / Cloudflare Pages**  
   连接本仓库，构建命令 `npm run build`，产出目录 `dist`。
2. 本地先 `npm run build`，把 `dist` 整夹上传到任意静态托管。

部署完成后把 **HTTPS 链接** 发给对方即可，无需安装。

## 玩法摘要

- 5 秒下注倒计时 → 倍率上涨 → 崩盘前提前「领奖」
- 崩盘点：`C = max(1, floor(rtp / U))`，rtp=0.98
- MAX = 持有筹码 / 5（上限 1 亿）
- 单次会话默认 10 局，可再开一轮

参数见 `src/config/gameConfig.ts`。

## 配置表

飞书《冲上云霄配置表》权限开通后，可把数值同步进 `gameConfig.ts`。  
也可 `npm run config:xlsx` 导出当前参数为 Excel。
