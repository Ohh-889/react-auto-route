# ElegantRouter

English | [中文](./README.zh_CN.md)

## Introduction

ElegantRouter is a tool for creating routes based on the file system, which can automatically generate route definitions, route file imports and route-related type definitions. Just create the route file according to the agreed rules, without adding any additional configuration in the route file.

### Differences and similarities

The main difference between ElegantRouter and other file system-based routing tools is that:

1. Other tools have complex configuration rules, and the route data is a black box, which is difficult to customize.
2. ElegantRouter follows the api-first principle and automates the process of configuring routes.

Taking configuring Vue routes as an example, the traditional way of creating page routes requires the following steps:

1. Import the layout component
2. Import the page component
3. Define the route in the route configuration file

Although these steps are not complicated, in actual development, they are repetitive and need to be done manually. In addition, the maintenance of route names and paths is very troublesome, there is no clear agreement on the route definition of the layout and page components, resulting in a messy route definition.
And using ElegantRouter, you only need to create the route file according to the agreed rules, you can automatically generate the route in the specified route file.

### ElegantRouter's route configuration process

You only need to create a route file according to the agreed rules to generate the route in the specified route file.

## Installation

### Install the Vue version (other frameworks to come...)

```bash
pnpm install @elegant-router/vue
```

## Use

### Introduce the plugin in Vite

```ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ElegantVueRouter from "@elegant-router/vue/vite";

export default defineConfig({
  plugins: [
    vue(),
    ElegantVueRouter({
      alias: {
        "@": "src",
      },
      layouts: {
        base: "src/layouts/base-layout/index.vue",
        blank: "src/layouts/blank-layout/index.vue",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

### Integration in Vue Router

**src/router/routes/index.ts**

```ts
import type { ElegantRoute, CustomRoute } from "@elegant-router/types";
import { generatedRoutes } from "../elegant/routes";
import { layouts, views } from "../elegant/imports";
import { transformElegantRoutesToVueRoutes } from "../elegant/transform";

const customRoutes: CustomRoute[] = [
  {
    name: "root",
    path: "/",
    redirect: {
      name: "403",
    },
  },
  {
    name: "not-found",
    path: "/:pathMatch(.*)*",
    component: "layout.base$view.404",
  },
];

const elegantRoutes: ElegantRoute[] = [...customRoutes, ...generatedRoutes];

export const routes = transformElegantRoutesToVueRoutes(
  elegantRoutes,
  layouts,
  views
);
```

**src/router/index.ts**

```ts
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
```

### Starting the project

After starting the project, the plugin will automatically generate the src/router/elegant directory, and the files in this directory are the automatically generated route import, route definition and route transformation files.

## Configuration

### Route file creation

You can configure `pagePatterns` to specify the rules for creating route files. The rules for creating route files are regular expressions, and if the path of a route file matches the regular expression, the route file will be created.

Default: all files named `index.vue`、`[id].vue`、`[module].vue`, etc. below the folder.

```ts
pagePatterns: ["**‍/index.vue", "**‍/[[]*[]].vue"];
```

### One-level route (single-level route)

#### Folder structure

```
views
├── about
│   └── index.vue
```

#### Generated routes

```ts
{
  name: 'about',
  path: '/about',
  component: 'layout.base$view.about',
  meta: {
    title: 'about'
  }
},
```

> it is a single level route, to add layout, the component props combines the layout and view component, split by the dollar sign "$"

#### Transformed Vue routes

```ts
{
  path: '/about',
  component: BaseLayout,
  children: [
    {
      name: 'about',
      path: '',
      component: () => import('@/views/about/index.vue'),
      meta: {
        title: 'about'
      }
    }
  ]
},
```

### Secondary route

#### Folder structure

```
views
├── list
│   ├── home
│   │   └── index.vue
│   ├── detail
│   │   └── index.vue
```

> Please don't have the following index.vue on the same level as the folder, this is not part of the agreed upon rules

**Error example**

```
views
├── list
│   ├── index.vue
│   ├── detail
│   │   └── index.vue
```

#### Generated routes

```ts
{
  name: 'list',
  path: '/list',
  component: 'layout.base',
  meta: {
    title: 'list'
  },
  children: [
    {
      name: 'list_home',
      path: '/list/home',
      component: 'view.list_home',
      meta: {
        title: 'list_home'
      }
    },
    {
      name: 'list_detail',
      path: '/list/detail',
      component: 'view.list_detail',
      meta: {
        title: 'list_detail'
      }
    },
  ]
}
```

> There are two layers of route data for secondary routes, the first layer of route is the layout component and the second layer of route is the page component

#### Transformed Vue routes

```ts
{
  name: 'list',
  path: '/list',
  component: BaseLayout,
  redirect: {
    name: 'list_home'
  },
  meta: {
    title: 'list'
  },
  children: [
    {
      name: 'list_home',
      path: '/list/home',
      component: () => import('@/views/list/home/index.vue'),
      meta: {
        title: 'list_home'
      }
    },
    {
      name: 'list_detail',
      path: '/list/detail',
      component: () => import('@/views/list/detail/index.vue'),
      meta: {
        title: 'list_detail'
      }
    }
  ]
},
```

> the first layer of route data contains the redirection configuration, which by default redirects to the first sub-route

### Multi-level route (level 3 route and above)

#### Folder structure

- The folder hierarchy is deep

```
views
├── multi-menu
│   ├── first
│   │   ├── child
│   │   │   └── index.vue
│   ├── second
│   │   ├── child
│   │   │   ├── home
│   │   │   │   └── index.vue
```

- Two-tier folder hierarchy (recommended)

```
views
├── multi-menu
│   ├── first_child
│   │   └── index.vue
│   ├── second_child_home
│   │   └── index.vue
```

> The route hierarchy is split by the underscore symbol "\_", which prevents the folder hierarchy from being too deep.

#### Generated routes

```ts
{
  name: 'multi-menu',
  path: '/multi-menu',
  component: 'layout.base',
  meta: {
    title: 'multi-menu'
  },
  children: [
    {
      name: 'multi-menu_first',
      path: '/multi-menu/first',
      meta: {
        title: 'multi-menu_first'
      },
      children: [
        {
          name: 'multi-menu_first_child',
          path: '/multi-menu/first/child',
          component: 'view.multi-menu_first_child',
          meta: {
            title: 'multi-menu_first_child'
          }
        }
      ]
    },
    {
      name: 'multi-menu_second',
      path: '/multi-menu/second',
      meta: {
        title: 'multi-menu_second'
      },
      children: [
        {
          name: 'multi-menu_second_child',
          path: '/multi-menu/second/child',
          meta: {
            title: 'multi-menu_second_child'
          },
          children: [
            {
              name: 'multi-menu_second_child_home',
              path: '/multi-menu/second/child/home',
              component: 'view.multi-menu_second_child_home',
              meta: {
                title: 'multi-menu_second_child_home'
              }
            }
          ]
        }
      ]
    }
  ]
}
```

> if the route level is greater than 2, the generated route data is a recursive structure

#### Transformed Vue routes

```ts
{
  name: 'multi-menu',
  path: '/multi-menu',
  component: BaseLayout,
  redirect: {
    name: 'multi-menu_first'
  },
  meta: {
    title: 'multi-menu'
  },
  children: [
    {
      name: 'multi-menu_first',
      path: '/multi-menu/first',
      redirect: {
        name: 'multi-menu_first_child'
      },
      meta: {
        title: 'multi-menu_first'
      }
    },
    {
      name: 'multi-menu_first_child',
      path: '/multi-menu/first/child',
      component: () => import('@/views/multi-menu/first_child/index.vue'),
      meta: {
        title: 'multi-menu_first_child'
      }
    },
    {
      name: 'multi-menu_second',
      path: '/multi-menu/second',
      redirect: {
        name: 'multi-menu_second_child'
      },
      meta: {
        title: 'multi-menu_second'
      },
    },
    {
      name: 'multi-menu_second_child',
      path: '/multi-menu/second/child',
      redirect: {
        name: 'multi-menu_second_child_home'
      },
      meta: {
        title: 'multi-menu_second_child'
      },
    },
    {
      name: 'multi-menu_second_child_home',
      path: '/multi-menu/second/child/home',
      component: () => import('@/views/multi-menu/second_child_home/index.vue'),
      meta: {
        title: 'multi-menu_second_child_home'
      }
    }
  ]
},
```

> the transformed Vue routes only has two levels, the first level is the layout component, and the second level is the redirect routes or the page routes

### Ignore folder aggregation routes

Folder names that begin with an underscore "\_" will be ignored

#### Folder structure

```
views
├── _error
│   ├── 403
│   │   └── index.vue
│   ├── 404
│   │   └── index.vue
│   ├── 500
│   │   └── index.vue
```

#### Generated routes

```ts
{
  name: '403',
  path: '/403',
  component: 'layout.base$view.403',
  meta: {
    title: '403'
  }
},
{
  name: '404',
  path: '/404',
  component: 'layout.base$view.404',
  meta: {
    title: '404'
  }
},
{
  name: '500',
  path: '/500',
  component: 'layout.base$view.500',
  meta: {
    title: '500'
  }
},
```

### Parameter Route

#### Folder structure

```
views
├── user
│   └── [id].vue
```

#### Generated routes

```ts
{
  name: 'user',
  path: '/user/:id',
  component: 'layout.base$view.user',
  props: true,
  meta: {
    title: 'user'
  }
}
```

#### Advanced parameter route

```ts
import type { RouteKey } from "@elegant-router/types";

ElegantVueRouter({
  routePathTransformer(routeName, routePath) {
    const routeKey = routeName as RouteKey;

    if (routeKey === "user") {
      return "/user/:id(\\d+)";
    }

    return routePath;
  },
});
```

### Custom Route

the custom route is only used to generate the route declaration, and the route file is not generated, you should create the route file manually.

#### Config custom routes

```ts
ElegantVueRouter({
  customRoutes: {
    map: {
      root: "/",
      notFound: "/:pathMatch(.*)*",
    },
    names: ["two-level_route"],
  },
});
```

**Generated CustomRouteKey**

```ts
type RouteMap = {
  root: "/";
  notFound: "/:pathMatch(.*)*";
  "two-level": "/two-level";
  "two-level_route": "/two-level/route";
};

type CustomRouteKey = "root" | "notFound" | "two-level" | "two-level_route";
```

#### Custom routes's component

**it can use existing page components as the route component**

```ts
import type { CustomRoute } from "@elegant-router/types";

const customRoutes: CustomRoute[] = [
  {
    name: "root",
    path: "/",
    redirect: {
      name: "403",
    },
  },
  {
    name: "not-found",
    path: "/:pathMatch(.*)*",
    component: "layout.base$view.404",
  },
  {
    name: "two-level",
    path: "/two-level",
    component: "layout.base",
    children: [
      {
        name: "two-level_route",
        path: "/two-level/route",
        component: "view.about",
      },
    ],
  },
];
```

## Plugin Option

`ElegantRouterOption`:

| property             | instruction                                                                                                           | type                                                | default value                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| cmd                  | the root directory of the project                                                                                     | `string`                                            | `process.cwd()`                        |
| pageDir              | the relative path to the root directory of the pages                                                                  | `string`                                            | `"src/views"`                          |
| alias                | alias, it can be used for the page and layout file import path                                                        | `Record<string, string>`                            | `{ "@": "src" }`                       |
| pagePatterns         | the patterns to match the page files (the match syntax follow [micromatch](https://github.com/micromatch/micromatch)) | `string[]`                                          | `["**‍/index.vue", "**‍/[[]*[]].vue"]` |
| pageExcludePatterns  | the patterns to exclude the page files (The default exclusion folder `components` is used as the routing page file.)  | `string[]`                                          | `["**‍/components/**"]`                |
| routeNameTransformer | transform the route name (The default is the name of the folder connected by an underscore)                           | `(routeName: string) => string`                     | `routeName => routeName`               |
| routePathTransformer | transform the route path                                                                                              | `(transformedName: string, path: string) => string` | `(_transformedName, path) => path`     |

`ElegantVueRouterOption`:

> extends `ElegantRouterOption`

| property         | instruction                                                                                                                                  | type                                               | default value                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| dtsDir           | the declaration file directory of the generated routes                                                                                       | `string`                                           | `"src/typings/elegant-router.d.ts"`                                                          |
| importsDir       | the directory of the imports of routes                                                                                                       | `string`                                           | `"src/router/elegant/imports.ts"`                                                            |
| lazyImport       | whether the route is lazy import                                                                                                             | `(routeName: string) => boolean`                   | `_name => true`                                                                              |
| constDir         | the directory of the route const                                                                                                             | `string`                                           | `"src/router/elegant/routes.ts"`                                                             |
| customRoutes     | define custom routes, which's route only generate the route declaration                                                                      | `{ map: Record<string, string>; names: string[] }` | `{ map: { root: "/", notFound: "/:pathMatch(\*)\*" }, names: []}`                            |
| layouts          | the name and file path of the route layouts                                                                                                  | `Record<string, string>`                           | `{ base: "src/layouts/base-layout/index.vue", blank: "src/layouts/blank-layout/index.vue" }` |
| defaultLayout    | the default layout name used in generated route const ( takes the first layout of `layouts` by default.)                                     | `string`                                           | `"base"`                                                                                     |
| layoutLazyImport | whether the route is lazy import                                                                                                             | `(layoutName: string) => boolean`                  | `_name => false`                                                                             |
| transformDir     | the directory of the routes transform function (Converts the route definitions of the generated conventions into routes for the vue-router.) | `string`                                           | `"src/router/elegant/transform.ts"`                                                          |
| onRouteMetaGen   | the route meta generator                                                                                                                     | `(routeName: string) => Record<string, string>`    | `routeName => ({ title: routeName })`                                                        |

## Caveat

- Folder naming: can only contain letters, numbers, dash, underscore, and no other special characters

  > The underscore is a cut identifier for the routing hierarchy, and the short horizontal line is used to connect multiple words in a one-level route

- The reason the generated route data is two-level is to fit in with vue-router's page caching functionality, and because KeepAlive is only related to the name of the Vue file and not the route name, the plugin automatically injects the name attribute into the Vue file, which has the value of the route name

  ```ts
  defineOptions({
    name: "about",
  });
  ```

  > Currently only the script setup mode is supported, which injects the above `defineOptions` function.
