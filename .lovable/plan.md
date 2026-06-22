结论：当前项目不是普通 SPA，而是 TanStack Start。现在的 `vercel.json` 把所有路径重写到 `/client/index.html`，但 Vercel 构建产物里通常没有这个可直接命中的入口，所以仍会 404。

问题点：
1. `package.json` 只执行 `vite build`，没有 Vercel 专用适配。
2. `vite.config.ts` 使用默认服务端输出目标，不是 Vercel 原生目标。
3. `vercel.json` 的 rewrite 目标不可靠，且可能绕开 TanStack Start 的服务端路由。
4. 如果在 Vercel 里把 Output Directory 手动填成 `dist`、`.output/public` 或 `client`，也容易导致入口不匹配。

解决思路：
1. 给项目改成 Vercel 可识别的部署输出。
2. 移除错误的 SPA fallback rewrite。
3. 使用 TanStack Start 的 Vercel 部署方式，而不是把它当纯静态站。

建议我实施的代码改动：
1. 安装并接入 Vercel 适配器：`@tanstack/react-start-vercel`。
2. 修改 `vite.config.ts`，把 TanStack Start/Nitro 输出目标切到 Vercel。
3. 简化或删除当前 `vercel.json` 中的错误 rewrite，避免把所有请求强行指向不存在的 `/client/index.html`。
4. 保留 `bun run build` 作为构建命令。

Vercel 面板设置：
1. Framework Preset：选 `Other`。
2. Install Command：`bun install`。
3. Build Command：`bun run build`。
4. Output Directory：留空，不要手动填。
5. Root Directory：项目根目录。
6. Node.js Version：20 或 22。
7. 重新 Deploy，最好清缓存后重建。

验证方式：
1. 打开首页 `/`。
2. 直接访问 `/events`、`/songs` 等页面。
3. 在这些页面刷新浏览器。
4. 如果都不再 404，说明服务端路由已被 Vercel 正确接管。