# ElegantRouter

English | [中文文档](./README.zh-CN.md)

## Introduction

This document introduces a **file-based routing plugin inspired by Next.js**, designed specifically for React projects that **do not require Node.js or SSR**. It uses a **convention-over-configuration** approach to automatically generate routes based on the file structure under the `pages` directory.

For complete documentation, please visit:  
👉 **[https://react-docs.soybeanjs.cn/routes](https://react-docs.soybeanjs.cn/routes)**

---

## Why This Plugin?

- **No Node.js Required – Perfect for Static Deployments**  
  Unlike Next.js, which relies on Node.js for SSR (Server-Side Rendering) or SSG (Static Site Generation), this plugin is designed to work in **pure frontend environments**. Just build your project with Vite, Webpack, or any other bundler, and deploy the output to any static hosting platform or CDN.

- **Convention-Based Routing – Files as Routes**  
  Inspired by Next.js, this plugin eliminates the need for manually maintaining route configuration files. Just follow a simple folder structure under `pages`, and the plugin will automatically generate the correct routing configuration.

- **Optimized for Chinese Frontend Workflow**  
  In many Chinese frontend projects, it’s common to place pages directly under `src/pages`. This plugin matches that convention and integrates seamlessly with React Router, allowing you to get started without changing your existing habits.

- **Fully Compatible with React Router**  
  Built on top of [React Router](https://reactrouter.com/), the plugin preserves all native features and APIs. If needed, you can still manually configure or extend routes using standard React Router logic.

---

## Key Features

1. **Auto-Generated Routes Based on File Structure**  
   No need to manually configure `path`, `element`, or `children`. The plugin scans the `pages` directory and generates a nested route configuration automatically.

2. **Supports Dynamic Routing / Params**  
   Files named `[id].tsx` or `[...slug].tsx` are treated as dynamic routes. Use `useParams()` from React Router (or utility helpers) to access route parameters inside your components.

3. **Supports Nested Routes**  
   Example structure:
   ```
   pages/
     user/
       profile.tsx
       settings.tsx
   ```
   Generates routes like `/user/profile` and `/user/settings` automatically without writing `<Route>` manually.

4. **Customizable with Hooks and Guards**  
   Need route guards, auth checks, or data preloading? You can still use `useLocation`, `useNavigate`, `Outlet`, etc., just like in native React Router projects. The plugin doesn't lock you in.

5. **Compatible with Modern Toolchains**  
   - Works with Vite, Webpack, Parcel, and other build tools.  
   - Doesn't require a specific framework scaffold. Works with `create-react-app`, custom setups, or enterprise-grade applications.

---

## Installation

> 📘 **Full documentation and advanced usage**:  
> [https://react-docs.soybeanjs.cn/routes](https://react-docs.soybeanjs.cn/routes)

### 1. Install the Plugin

```bash
# using npm
npm install --save-dev @soybean-react/vite-plugin-react-router

# or yarn/pnpm
yarn add --dev @soybean-react/vite-plugin-react-router
```

### 2. Configure in Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import FileBasedRouter from '@soybean-react/vite-plugin-react-router';

export default defineConfig({
  plugins: [
    react(),
    FileBasedRouter({
      pagesDir: 'src/pages', // Optional: customize your page directory
      // ... other options
    })
  ],
});
```

### 3. Create the `pages` Directory

Example file structure:
```
src/
  pages/
    index.tsx          → '/'
    about.tsx          → '/about'
    user/
      index.tsx        → '/user'
      [id].tsx         → '/user/:id' (dynamic)
```

The plugin will automatically convert these into route definitions.

### 4. Run Your App

Start your development server and visit routes like `/`, `/about`, or `/user/123`. The corresponding components should load automatically.

---

## FAQ

### How is this different from React Router’s official file-based plugin?

React Router also offers [a file-based routing plugin](https://reactrouter.com/en/main/routers/picking-a-router). It’s powerful, but:

- It often assumes Node.js or SSR context (e.g. Remix/Next.js style).
- Static-only deployments can be harder to configure.
- Customization is more complex in some cases.

This plugin **focuses on pure-SPA projects** and static hosting, with routing conventions tailored for teams that prefer simpler file-to-route mapping — especially common in the Chinese frontend ecosystem.

---

### Does it support layouts?

Yes! You can implement nested layouts using the folder structure and React Router's `<Outlet>`. You can also define shared `layout.tsx` files in specific directories. For examples, see the [documentation](https://react-docs.soybeanjs.cn/routes#layout-layout-support).

---

### Can I deploy it without any backend or Node.js server?

Absolutely. The output is a fully static frontend bundle. Deploy it to:

- Netlify, Vercel, GitHub Pages  
- OSS/CDN platforms (like Alibaba Cloud, Qiniu, etc.)  
- Any Nginx or static HTTP server

For correct behavior on page refresh (like `/user/123`), make sure your server is configured to fallback to `index.html`.

---

### Is SSR or SSG supported?

Not directly. This plugin is for client-side rendering (SPA). If your project requires SSR/SSG, consider using Next.js, Remix, or similar frameworks. This plugin is ideal for teams **not using Node or SSR**.

---

## Resources

- 📘 **Full Documentation**: [https://react-docs.soybeanjs.cn/routes](https://react-docs.soybeanjs.cn/routes)  
  Includes nested layouts, dynamic routing, advanced usage, and more.
- 💬 Found a bug or want a new feature? Feel free to submit an [Issue/PR](https://github.com/soybeanjs/soybeanjs/issues) on GitHub.

---

By using this **Next.js-style file-based router for React**, you can **achieve automatic route generation** with minimal configuration, full React Router compatibility, and flexible static deployment.

If you're looking for a clean, SPA-friendly alternative to manual routing, this plugin could be the perfect fit.

Check out the full docs here 👉 [https://react-docs.soybeanjs.cn/routes](https://react-docs.soybeanjs.cn/routes)  
Happy coding! ✨