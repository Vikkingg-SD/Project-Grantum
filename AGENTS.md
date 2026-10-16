# AGENTS.md

Expo / React Native universal app (iOS · Android · Web). Routes live in `app/` at the repo ROOT — every file there is a screen; `_layout.tsx` files define navigators. Non-route code lives in `src/`.

Expo has changed — do not trust training data. Before touching any Expo/RN API: read the `expo` major in `package.json`, then consult `https://docs.expo.dev/versions/v<major>.0.0/` and `https://docs.expo.dev/llms.txt`.

## Commands (pnpm only — never npm install)

- `pnpm expo install <pkg>` — SDK-compatible installs
- `pnpm start` / `pnpm web` / `pnpm android` / `pnpm ios`
- `pnpm typecheck` · `pnpm lint` · `pnpm format` · `pnpm format:check`

Never run `npx expo lint` (it scaffolds a flat config; this repo is ruled ESLint 8 + `.eslintrc.js`).

## Rules

- `ios/` and `android/` are generated (Continuous Native Generation) — never hand-edit; configure via `app.json` + config plugins.
- Expo Go ships bundled native modules only; libraries with native code need a development build.
- Prefer Expo modules over third-party libs; new deps require an owner ruling (ledger line).
- Styling: tokens from `src/config/theme.ts` only; atomic design `atoms → molecules → organisms → templates → screens → app`.
- Git: feature branches only, Conventional Commits, Squash & Merge via PR (Husky + lint-staged enforce locally).
