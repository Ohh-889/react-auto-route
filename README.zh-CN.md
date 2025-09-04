# ElegantRouter 优雅路由

中文 | [English](./README.md)

## 介绍

下面是一份示例文档，可帮助你介绍一个“类似 Next.js 的基于文件的路由插件”（无需 Node 依赖，采用约定式文件结构），并将链接指向 [react-docs.soybeanjs.cn/routes](https://react-docs.soybeanjs.cn/routes) 以获取更多信息。你可以在 README 或官方文档中放置这篇内容，帮助开发者了解、安装并使用该插件。

---

# 类似 Next.js 的文件式路由插件

> **文档地址**: [https://react-docs.soybeanjs.cn/routes](https://react-docs.soybeanjs.cn/routes)  
> 如果你想了解更多技术细节或内部实现原理，欢迎点击上方链接前往查看。

## 为什么需要这个插件？

- **无需 Node，纯前端静态部署可用**  
  不同于 Next.js 那样依赖 Node 服务器做 SSR（Server-Side Rendering）或 SSG（Static Site Generation），本插件的目标是在**任何静态环境**下就能跑。你只需要一个普通的前端构建流程（Vite、Webpack 等），再将产物部署到任意 HTTP 服务器或 CDN 即可。

- **约定式路由，目录即页面**  
  参考 Next.js 等优秀的文件式路由理念，无需维护额外路由配置文件。只要遵循简单的“`pages` 目录结构”规则，每个目录或 `.tsx` 文件就能映射成一个路由页面，省去了手写路由表的麻烦。

- **贴合国内前端的项目习惯**  
  在国内，许多团队已经习惯了“在 `src/pages` 或 `pages` 目录里直接写页面”。这个插件与 React Router 深度结合，使用方式**简单直观**，让你几乎不用改变平时的开发习惯。

- **与 React Router 生态兼容**  
  插件底层基于 [React Router](https://reactrouter.com/)，保留了其核心特性和常用 API。如果你想在某些特殊场景下自定义路由行为，依然可以随时跳回 React Router 的写法，**灵活度更高**。

## 功能特性

1. **自动扫描文件生成路由**  
   无需手工配置 `path`、`Component` 等，插件会扫描 `pages` 目录结构并自动生成对应的路由层级。

2. **支持动态路由 / 动态参数**  
   通过类似 `[id].tsx` 或 `[...slug].tsx` 这样的命名方式，你可以轻松实现**动态路径**；在页面组件中，用 React Router 的 `useParams()` 或插件提供的工具解析 URL 参数。

3. **多级嵌套路由**  
   假如你的文件结构是：  
   ```
   pages/
     user/
       profile.tsx
       settings.tsx
   ```
   插件会自动生成多级路由，让用户访问 `/user/profile`、`/user/settings` 时，分别渲染对应组件。不需手动添加 `<Route>`。

4. **灵活的路由 Hook**  
   若你需要更多自定义逻辑（如守卫、权限校验、数据预加载等），可直接利用 React Router 原生的 `useLocation`、`useNavigate`、`Outlet` 等 API，或在配置文件中添加自定义规则。

5. **与前端工具链无缝衔接**  
   - 兼容常见打包工具 (Vite、Webpack、Parcel 等)；  
   - 不限于特定框架结构，无论是 `create-react-app` 还是自定义的脚手架，都能轻松集成。

## 如何安装使用

> **更多详细使用说明，请访问 [官方文档](https://react-docs.soybeanjs.cn/routes)。**

1. **安装依赖**  
   ```bash
   # 以 npm 为例
   npm install --save-dev @soybean-react/vite-plugin-react-router
   # 或者使用 yarn/pnpm 等包管理工具
   yarn add --dev @soybean-react/vite-plugin-react-router
   ```

2. **在项目配置中启用**  
   - 如果使用 Vite，可在 `vite.config.ts` 中引入并配置插件；  
   - 对于 Webpack，也可以通过自定义的 Plugin/HMR 方案来接入。  
   下面以 Vite 为示例：
   ```ts
   // vite.config.ts
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import FileBasedRouter from '@soybean-react/vite-plugin-react-router';

   export default defineConfig({
     plugins: [
       react(),
       FileBasedRouter({
         // 可选配置项，例如 pages 目录路径等
         pagesDir: 'src/pages',
         // 其他自定义选项……
       })
     ],
   });
   ```

3. **创建 `pages` 目录**  
   在项目根目录或 `src/` 下面创建一个 `pages` 文件夹，比如：
   ```
   src/
     pages/
       index.tsx
       about.tsx
       user/
         index.tsx
         [id].tsx
   ```
   - `index.tsx` 对应 `/` 路径  
   - `about.tsx` 对应 `/about`  
   - `user/index.tsx` 对应 `/user`  
   - `user/[id].tsx` 对应 `/user/:id` (动态路由)

4. **运行项目**  
   启动本地开发服务器，访问相应 URL，看是否能正常加载对应的页面组件。

## 常见问题

1. **与官方文件式路由有何区别？**  
   React Router 官方也提供了[基于文件夹的路由插件](https://reactrouter.com/en/main/routers/picking-a-router)，功能非常强大。  
   - 但是在有些场景，项目不希望或无法迁移到 Node SSR 环境，希望保留“纯前端”的方式；  
   - 或者对“目录即路由”的映射规则有定制需求；  
   - 或需要极简的打包输出及部署流程。  
   这时，本插件能提供更直接、贴合国内开发习惯的选项，**与官方方案不冲突**，二者可根据实际需求选择。

2. **是否支持嵌套布局或 Layout？**  
   - 可以在 `pages/` 中通过文件夹结构或自定义 `layout.tsx` 等文件的方式，结合 React Router 提供的 `<Outlet>`，轻松实现多级嵌套布局。  
   - 详情参阅 [文档示例](https://react-docs.soybeanjs.cn/routes) 中的“嵌套布局”章节。

3. **打包后如何部署？**  
   - 打包后会生成纯前端产物，直接丢到任何静态服务器或 CDN 都可使用；无需 Node、Nginx 做特殊配置（除非你想自定义路由回退或 404 页面）。  
   - 如果要配合后端路由，需要确保后端能在刷新时正确返回前端入口文件（常见做法是做一个 `/*` 通配路由指向 `index.html`）。

4. **能与 SSR、SSG 结合吗？**  
   - 默认是纯前端 SPA，不处理服务端渲染。如果你需要 SSR，可以考虑 Next.js 或 Remix。但本插件更多是为“不需要 SSR 的静态项目”服务。

## 更多资料

- **[详细使用文档](https://react-docs.soybeanjs.cn/routes)**（强烈推荐）：包含路由生成原理、动态参数配置、嵌套布局示例、常见问题等。
- 欢迎在 GitHub 仓库提交 [Issue/PR]：若你在使用过程中遇到问题或有需求扩展，可以随时与我们沟通。

---

通过这个**类似 Next.js 文件式路由**插件，你可以**用最少的配置**，快速在 React 项目里享受“目录即页面”带来的便利；同时还能保留对 React Router 特性的兼容，部署则只需静态服务即可。更多细节和进阶指南，敬请访问 [文档](https://react-docs.soybeanjs.cn/routes)，希望它能为你的前端开发带来一点新的思路与灵感。
