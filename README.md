# Grantum

A universal grant discovery and application workspace built with Expo, React Native, and TypeScript.

## Run

```sh
pnpm install --frozen-lockfile
pnpm web
```

Use `pnpm start` for Expo Go, `pnpm android` or `pnpm ios` for a native development environment. Copy `.env.example` to `.env` to configure the data source.

Keep `node_modules` and Metro's temporary cache between runs; cache resets are for diagnosed cache corruption. Metro uses one worker on hosts with up to 6 GB RAM. TypeScript retains incremental data in ignored `.expo/cache`. Native file references use the system document chooser; only validated names, types, and sizes are kept for the session.

The default interactive preview uses sample opportunities and award records. Working notes and document edits last for the current session. The preview checks section presence only; it does not verify eligibility, budget math, or evidence. AI narrative generation, uploads, live notifications, and downloadable exports require connected services.

## Development

- `pnpm verify:ui` checks the exported UI at four widths in both themes and rehearses key flows. Set `GRANTUM_UI_BUILD` to an existing web export and `GRANTUM_UI_OUTPUT` to an external evidence directory.
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`
- `pnpm gate:local` runs serial source and contract checks.
- `pnpm gate:full` also runs the configured browser recovery and route checks. Install Chromium first with `pnpm exec playwright install chromium`.
- CI installs browser dependencies and runs the full gate.

Verification is portable and does not require local agent software, Python, or a machine-specific control-plane directory. Optional `BRAIN_RUNTIME_POLICY` and `BRAIN_RUN_PROFILE` environment variables let a developer supply external resource limits; hardware-aware defaults apply otherwise: up to 4 workers and a 4096 MiB Node heap on desktop, with 1 worker and a 1228 MiB ceiling on low-memory hosts.

## Structure

`app/` contains Expo Router routes. `src/screens/` contains work areas. `src/components/` contains the shared UI. `src/config/theme.ts` owns Obsidian and Quartz color and type tokens. `src/api/` contains TanStack Query hooks and the data-source interface; `src/mock/` provides sample records. Zustand holds per-grant session notes and narrative edits.

Backend integration types live in `src/types/api.ts`; `scripts/verify-contract.ts` checks the data-source contract. Project specifications, agent configuration, task plans, review packs, and session records belong in the external control-plane workspace.

### Expo Go connection

Keep `pnpm start:lan` running and connect phone and computer to the same Wi-Fi. Scan the current QR code after restarting: LAN addresses can change. Allow Node through Windows Firewall on private networks. If router isolation blocks LAN, stop the server and use `pnpm start:tunnel` (Expo may request its tunnel dependency). The Cannot connect to Expo CLI warning concerns Metro/live reload, not the grant API.
