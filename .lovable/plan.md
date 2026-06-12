## 目标

以「空灵冰霜典藏」方向重塑 `/`（我的统计）页面。锁定：冰川冷色（#e8f0f8 / #b8d4e8 / #6ba3c8 / #2e6b8a）+ Sora 标题 / Manrope 正文 + Bento 网格。仅改造统计页与全局令牌、字体加载、AppHeader 适配，不改业务逻辑、不改演出列表/曲目索引页的功能。

## 1. 字体与全局令牌

- `src/routes/__root.tsx`：在 `head().links` 注入 Google Fonts（Sora 400/600/700 + Manrope 300/400/500/600），用 `preconnect` + `stylesheet`，禁止在 CSS 中 `@import` 远程 URL。
- `src/styles.css`：
  - `@theme` 注册 `--font-display: "Sora", sans-serif;` 与 `--font-sans: "Manrope", sans-serif;`，body 默认改用 Manrope。
  - 浅色 `:root` 重映射为冰川调（保持 oklch 表达；将 `--background` 调为 #e8f0f8、`--foreground` 为 #2e6b8a、`--primary` 为 #2e6b8a、`--muted-foreground` 为 #6ba3c8、`--border` 为 #b8d4e8、`--card` 为 white/60 等价值）。
  - 深色 `.dark` 同步对应（保留现有深色模式，但用同色家族的更深变体，避免破坏暗色阅读）。
  - 新增语义令牌：`--surface-glass`（半透明白）、`--accent-deep`（#2e6b8a 反色块）用于"曲目频次 Top 10"那块深色卡片。

## 2. Dashboard 重排（`src/routes/index.tsx`）

保留全部既有数据计算逻辑（`useAttended`、`computeNewUnlocks`、`listenedSongCounts`、`singerDistribution`、对话框、导出长图）。只重写 JSX 结构与 className：

```text
┌─────────────────────────────────────────────────────────┐
│ Header: H1 我的观演统计  +  英文副标 + [导出长图]按钮     │
├──────────────────────────┬──────────────────────────────┤
│ 4 个 stat 卡 (col-8)      │  曲目频次 Top10 深色块         │
│ 已看 / 解锁 / 城市 / 年份  │  (col-4, row-span-2, 深底白字)│
├──────────────────────────┤                              │
│ Vsinger 曲目达成 (col-8)  │                              │
│ 6 列细进度条 + Dialog     │                              │
├──────────────────────────┴──────────────────────────────┤
│ 已听曲目歌手分布 (col-12 半透明卡，细横条)                 │
├─────────────────────────────────────────────────────────┤
│ 观演时光机：每场新解锁 (col-12)                            │
│ 时间倒序卡片纵向列表（保留同时举行场次共享解锁的提示）       │
│ 每张卡片：日期·城市 + NEW chip + 新解锁带边框 chip /        │
│           历史解锁灰 chip                                  │
└─────────────────────────────────────────────────────────┘
└── 底部小字 footer tag
```

样式要点：
- 卡片统一 `rounded-3xl` / `rounded-[2rem]`，半透明白底 `bg-card/60 backdrop-blur-md border border-white`。
- 深色强调块（Top 10）使用 `--accent-deep` 底 + 白字 + 右上角 `blur-3xl` 高光球。
- 数字一律 Sora 700、tabular-nums，副标 `uppercase tracking-widest` 全小英文。
- 进度条 `h-1.5 rounded-full`，背景 `bg-[--color-border]/30`，填充 `bg-primary`（保留达成度按 % 渐深，无彩色突变）。
- 新解锁 chip：`bg-primary/10 border border-primary/40 text-primary`；历史曲目 chip：`bg-muted text-muted-foreground` 无边框。
- 空状态卡保留，但样式同步新调性。

## 3. AppHeader 适配

`src/components/AppHeader.tsx`：换上 Sora 字体头部品牌字，背景由当前深色玻璃改为浅冰玻璃（`bg-card/70 backdrop-blur`）；激活态从纯 primary 圆角改为 `bg-primary text-primary-foreground` 保持但调整为冰川深蓝。ThemeToggle 保留。

## 4. 范围之外（本轮不动）

- `events.tsx` / `songs.tsx` 的功能与排序逻辑不动；它们会自动继承新令牌的浅冰底色，如有局部突兀样式留待下一轮。
- `vsinger.ts`、`store.ts`、数据文件不动。
- 导出长图逻辑不动（仍然 `toJpeg(exportRef)`，背景色会自动取新 body 背景）。

## 验证

1. `bun run build` 通过。
2. 浏览预览 `/`：勾选若干场次后，4 大数字卡、Vsinger 进度、Top10 深色卡、新解锁时光机依次按上面网格落位；浅/深主题切换无破图。
3. 点击 4 个 stat 卡 + 6 个 Vsinger 卡：Dialog 仍按原内容打开。
4. "导出长图"生成的 JPG 顶部到底部包含全部新版块。
