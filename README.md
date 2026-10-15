# Project-Grantum (grantum-rn)

Grantum is an autonomous grant-discovery, drafting, and deterministic compliance-audit engine, ported from the frozen Next.js pitch instrument (`grantum-local`, V7.x) to a universal React Native client.

## Stack

| Layer          | Choice                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| Runtime        | Expo SDK 57 · React Native 0.86.3 · React 19.2.3                         |
| Language       | TypeScript ~6.0.3 (strict)                                               |
| Routing        | Expo Router (`app/` at root)                                             |
| Server state   | TanStack Query v5                                                        |
| Client state   | Zustand v5                                                               |
| Styling        | `PALETTE` tokens + raw StyleSheet (NativeWind removed by ruling R-1)     |
| Backend target | Flask + PostgreSQL per `API_CONTRACTS.md` (mock data source until wired) |

## Run

pnpm install
pnpm web # http://localhost:8081
pnpm start # QR → Expo Go over LAN (DATA_SOURCE=mock needs no backend)
pnpm typecheck · pnpm lint · pnpm format:check

No Android emulator on the dev box (hardware ruling); devices via Expo Go over LAN.

## Layout

`app/` routes · `src/components/{atoms,molecules,organisms,templates}` UI kit · `src/screens` (WP-H) · `src/config` tokens/env/constants · `src/api` hooks + data-source seam · `src/mock` hermetic demo data · `src/store` Zustand · `src/utils` scoring/formatting/uuid.

## Design

Obsidian (dark) / Quartz (light) instrument language — see `DESIGN_MANIFESTO.md` (regenerated from `src/config/theme.ts` in WP-B).

## Git workflow

Feature branches → Conventional Commits → PR → Squash & Merge only. Husky + lint-staged block non-conforming code at commit.
