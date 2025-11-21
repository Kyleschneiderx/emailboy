# EmailBoy Subscription Portal

Tailwind + React portal for managing EmailBoy subscriptions. It uses the existing Supabase edge functions (`check-subscription`, `cancel-subscription`, `resume-subscription`, `create-portal-session`) and mirrors the design system defined in `design-system.json`.

## Getting started

```bash
cd portal
cp env.example .env
npm install
npm run dev
```

Populate `.env` with your Supabase project values:

```
VITE_SUPABASE_URL=https://xgllxidtqbkftsbhiinl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Features

- Dashboard shell (sidebar + sticky header) using the shared design tokens.
- Premium status overview with live metrics, badges, and usage cards.
- Billing actions:
  - Open Stripe billing portal (`create-portal-session`).
  - Cancel / resume subscription (existing edge functions).
  - Refresh button to re-fetch Supabase data.
- Responsive layout and skeleton states.

## Notes

- The portal expects the Supabase session (same structure used by the extension) to be stored in `localStorage` under `supabaseSession`. When opened from the extension, the session is already persisted, so the portal can fetch subscription data immediately.
- Ensure the new edge function is deployed:

```bash
supabase functions deploy create-portal-session
```

- Optionally set the return URL secret for Stripe portal redirects:

```bash
supabase secrets set STRIPE_PORTAL_RETURN_URL=https://your-portal-domain.com
```
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

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
