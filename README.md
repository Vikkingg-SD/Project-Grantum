# Grantum

A universal grant discovery and application workspace built with Expo, React Native, and TypeScript.

## Run

```sh
pnpm install --frozen-lockfile
pnpm web
```

Use `pnpm start` for Expo Go, `pnpm android` or `pnpm ios` for a native development environment. Copy `.env.example` to `.env` to configure the data source.

The default interactive preview uses sample opportunities and award records. Working notes and document edits last for the current session. The preview checks section presence only; it does not verify eligibility, budget math, or evidence. AI narrative generation, uploads, live notifications, and downloadable exports require connected services.

## Development

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
- `pnpm gate:local` runs serial source and contract checks.
- `pnpm gate:full` also runs the configured browser recovery and route checks. Install Chromium first with `pnpm exec playwright install chromium`.
- CI installs browser dependencies and runs the full gate.

Verification is portable and does not require local agent software, Python, or a machine-specific control-plane directory. Optional `BRAIN_RUNTIME_POLICY` and `BRAIN_RUN_PROFILE` environment variables let a developer supply external resource limits; conservative serial defaults apply otherwise.

## Structure

`app/` contains Expo Router routes. `src/screens/` contains work areas. `src/components/` contains the shared UI. `src/config/theme.ts` owns Obsidian and Quartz color and type tokens. `src/api/` contains TanStack Query hooks and the data-source interface; `src/mock/` provides sample records. Zustand holds per-grant session notes and narrative edits.

See [API contracts](API_CONTRACTS.md) for backend integration. Agent configuration, task plans, review packs, and session records belong outside this application repository.
