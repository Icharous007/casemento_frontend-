# React + TypeScript + Vite

## Dynamic gallery

The guest gallery starts with 10 media items and appends batches of 10 using
TanStack Query's infinite queries. An `IntersectionObserver` starts loading
600px before the end of the grid; the vertical viewer requests the next batch
when three items remain. Normal navigation requires no "Ver mais" button.
Failed requests preserve the loaded items and offer retry; browsers without
the observer API receive a manual fallback button.

The default sort is weighted random, with recent and most-liked options still
available. Each mode uses a guest-scoped backend snapshot, keeping pagination
and re-fetches stable when engagement changes. "Atualizar galeria" starts a new
snapshot; publishing also refreshes the feed so the upload becomes eligible.
Sessions expire after two hours and require an explicit refresh.

The grid loads lazy thumbnails/posters, never video files. The viewer mounts
only the active item and its immediate neighbours; only the active video uses
`preload="auto"`. Likes update the infinite-query cache optimistically, and
comments refresh counters without reshuffling the feed.

Deploy the backend migration and `/api/v1/media/feed` endpoint before this
frontend. Validate with `pnpm exec vitest run src/__tests__/pages/GalleryPage.test.tsx`
and `pnpm build`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
