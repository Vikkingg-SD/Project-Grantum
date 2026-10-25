# DESIGN MANIFESTO: DUAL THEME "OBSIDIAN & QUARTZ"

**RATIFIED:** 2026-10-18 by Owner. This document is the binding design authority for Project Grantum. All visual tokens in `src/config/theme.ts` must strictly match this specification.

§1. Ideological Charter

Grantum is an instrument, not an app. Every surface behaves like a precision terminal: absolute hierarchy, zero decoration, deterministic readouts, and honesty surfaces wherever the system states a fact about itself. The dark theme (Obsidian) is the default working surface; the light theme (Quartz) is an equal citizen, not an afterthought — every token exists in both modes with identical semantics.

Atomic design is the assembly law: interfaces are composed from prepared blocks (atoms → molecules → organisms → templates → screens), so code never changes page-to-page and no page hand-styles its own controls. Literal styling is prohibited; the five token families (PALETTE, TYPOGRAPHY, RADIUS, SPACING, SHADOWS) are the only visual vocabulary.

Derived tokens ratified here (AD-29, RUL-A1-21): `surfaceMuted` — the muted panel fill sitting between `surface` and `subtle` (#161A1E Obsidian / #EEF1F4 Quartz) — and `inputBorder` — the text-field stroke used where `border` is too quiet in dark mode and too loud in light (#30373E Obsidian / #7B8490 Quartz). Both must match `src/config/theme.ts` exactly; any change to them is a token change (one PR, ruling ID, manifesto edit, theme.ts edit, ledger line).

§2.1 The Visual Language: Obsidian (Dark) & Quartz (Light)

Grantum uses an Instrument Grade aesthetic. It is not a generic consumer application. It is a precision terminal for capital allocation, compliance scanning, and deterministic auditing.

Obsidian Instrument (Dark Theme — Default): Absolute black base (`#000000`) with elevated carbon cards (`#121518`), industrial chrome borders (`#394047`), neon pumpkin brand accents (`#FF8A00`), electric mint for verified states (`#00B35D`), and cyan for pending states (`#00E5FF`).

Quartz Instrument (Light Theme): High-contrast alpine canvas (`#F4F6F8`) with pure white elevated surfaces (`#FFFFFF`), precision slate borders (`#D1D5DB`), deep burnt pumpkin brand accents (`#D97000`), deep forest emerald for verification (`#008744`), and cobalt cyan for pending operations (`#0094A8`).

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SEMANTIC DESIGN TOKEN PALETTE PARITY │
├──────────────────┬──────────────────────────┬──────────────────────────────────────────┤
│ Token Name │ Obsidian Mode (Dark) │ Quartz Mode (Light) │
├──────────────────┼──────────────────────────┼──────────────────────────────────────────┤
│ bg-primary │ #000000 (Pure Obsidian) │ #F4F6F8 (Pure Quartz Canvas) │
│ bg-surface │ #121518 (Carbon Vessel) │ #FFFFFF (Elevated Pure Paper) │
│ bg-subtle │ #1A1E23 (Elevated Scrim) │ #E9ECEF (Structured Subtle Plate) │
│ border-default │ #394047 (Liquid Chrome) │ #D1D5DB (Etched Slate) │
│ border-strong │ #4B5563 (Accent Strike) │ #9CA3AF (Solid Structural Stroke) │
│ text-main │ #EDEFF2 (High Contrast) │ #111827 (Deep Carbon Ink) │
│ text-muted │ #8A929C (Technical Muted)│ #6B7280 (Subtle Descriptor Gray) │
│ brand-primary │ #FF8A00 (Neon Pumpkin) │ #D97000 (Burnt Pumpkin Core) │
│ brand-foreground │ #140B00 (Carbon Inset) │ #FFFFFF (Solid White Knockout) │
│ status-verified │ #00B35D (Electric Mint) │ #008744 (Deep Emerald Anchor) │
│ status-pending │ #00E5FF (High Cyan) │ #0094A8 (Precision Cyan Stroke) │
│ status-failure │ #A4161A (Deep Crimson) │ #DC2626 (Vivid Alert Crimson) │
│ status-gold │ #FFD700 (Imperial Amber) │ #D97706 (Burnished Amber Gold) │
└──────────────────┴──────────────────────────┴──────────────────────────────────────────┘

§2.2 Typography Scale & Mathematical Roles

Grantum uses two distinct typographic roles:

Human/Structural Role (Inter): System Sans (`Inter` / system sans-serif) for titles, subtitles, descriptors, interactive controls.

Deterministic/Metric Role (JetBrains Mono): Monospace (`JetBrains Mono` / monospace) for math readouts, checksums, monetary amounts, countdown clocks, and audit logs.

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TYPOGRAPHIC METRIC SPECIFICATION │
├──────────────────┬──────────────┬─────────────┬──────────────┬─────────────────────────┤
│ Typography Role │ Font Size │ Line Height │ Letter Space │ Target Element │
├──────────────────┼──────────────┼─────────────┼──────────────┼─────────────────────────┤
│ text-display │ 32px │ 38px │ -0.02em │ Major Dashboard Headers │
│ text-h1 │ 24px │ 30px │ -0.01em │ Container Titles │
│ text-h2 │ 20px │ 26px │ 0.00em │ Section Titles & Modals │
│ text-h3 │ 16px │ 22px │ +0.01em │ Card Names & Subsections│
│ text-body │ 14px │ 20px │ +0.01em │ Paragraphs & Details │
│ text-caption │ 12px │ 16px │ +0.02em │ Field Labels & Badges │
│ text-metric-lg │ 28px (Mono) │ 32px │ +0.00em │ Gauge Value, Big Sum

## §2.1 The Visual Language: Obsidian (Dark) & Quartz (Light)

Grantum uses an Instrument Grade aesthetic. It is not a generic consumer application. It is a precision terminal for capital allocation, compliance scanning, and deterministic auditing.

**Obsidian Instrument (Dark Theme — Default):** Absolute black base (`#000000`) with elevated carbon cards (`#121518`), industrial chrome borders (`#394047`), neon pumpkin brand accents (`#FF8A00`), electric mint for verified states (`#00B35D`), and cyan for pending states (`#00E5FF`).

**Quartz Instrument (Light Theme):** High-contrast alpine canvas (`#F4F6F8`) with pure white elevated surfaces (`#FFFFFF`), precision slate borders (`#D1D5DB`), deep burnt pumpkin brand accents (`#D97000`), deep forest emerald for verification (`#008744`), and cobalt cyan for pending operations (`#0094A8`).

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SEMANTIC DESIGN TOKEN PALETTE PARITY │
├──────────────────┬──────────────────────────┬──────────────────────────────────────────┤
│ Token Name │ Obsidian Mode (Dark) │ Quartz Mode (Light) │
├──────────────────┼──────────────────────────┼──────────────────────────────────────────┤
│ bg-primary │ #000000 (Pure Obsidian) │ #F4F6F8 (Pure Quartz Canvas) │
│ bg-surface │ #121518 (Carbon Vessel) │ #FFFFFF (Elevated Pure Paper) │
│ bg-subtle │ #1A1E23 (Elevated Scrim) │ #E9ECEF (Structured Subtle Plate) │
│ border-default │ #394047 (Liquid Chrome) │ #D1D5DB (Etched Slate) │
│ border-strong │ #4B5563 (Accent Strike) │ #9CA3AF (Solid Structural Stroke) │
│ text-main │ #EDEFF2 (High Contrast) │ #111827 (Deep Carbon Ink) │
│ text-muted │ #8A929C (Technical Muted)│ #6B7280 (Subtle Descriptor Gray) │
│ brand-primary │ #FF8A00 (Neon Pumpkin) │ #D97000 (Burnt Pumpkin Core) │
│ brand-foreground │ #140B00 (Carbon Inset) │ #FFFFFF (Solid White Knockout) │
│ status-verified │ #00B35D (Electric Mint) │ #008744 (Deep Emerald Anchor) │
│ status-pending │ #00E5FF (High Cyan) │ #0094A8 (Precision Cyan Stroke) │
│ status-failure │ #A4161A (Deep Crimson) │ #DC2626 (Vivid Alert Crimson) │
│ status-gold │ #FFD700 (Imperial Amber) │ #D97706 (Burnished Amber Gold) │
└──────────────────┴──────────────────────────┴──────────────────────────────────────────┘

## §2.2 Typography Scale & Mathematical Roles

Grantum uses two distinct typographic roles:

**Human/Structural Role (Inter):** System Sans (`Inter` / system sans-serif) for titles, subtitles, descriptors, interactive controls.
**Deterministic/Metric Role (JetBrains Mono):** Monospace (`JetBrains Mono` / monospace) for math readouts, checksums, monetary amounts, countdown clocks, and audit logs.

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TYPOGRAPHIC METRIC SPECIFICATION │
├──────────────────┬──────────────┬─────────────┬──────────────┬─────────────────────────┤
│ Typography Role │ Font Size │ Line Height │ Letter Space │ Target Element │
├──────────────────┼──────────────┼─────────────┼──────────────┼─────────────────────────┤
│ text-display │ 32px │ 38px │ -0.02em │ Major Dashboard Headers │
│ text-h1 │ 24px │ 30px │ -0.01em │ Container Titles │
│ text-h2 │ 20px │ 26px │ 0.00em │ Section Titles & Modals │
│ text-h3 │ 16px │ 22px │ +0.01em │ Card Names & Subsections│
│ text-body │ 14px │ 20px │ +0.01em │ Paragraphs & Details │
│ text-caption │ 12px │ 16px │ +0.02em │ Field Labels & Badges │
│ text-metric-lg │ 28px (Mono) │ 32px │ +0.00em │ Gauge Value, Big Sums │
│ text-metric-sm │ 13px (Mono) │ 18px │ +0.04em │ Audit Logs & Timestamps │
└──────────────────┴──────────────┴─────────────┴──────────────┴─────────────────────────┘

## §2.3 Geometric Invariants & Motion Dynamics

**Border Radii:**

- `radius-sm`: 8px (Buttons, badges, text input containers).
- `radius-md`: 12px (Inner cards, hero stats, floating panels).
- `radius-lg`: 16px (Modals, bottom sheets, main stage cards).
- `radius-full`: 9999px (Pills, indicator dots, circular avatars).

**Tilts and Rotations:**

- Gauges start at `-90deg` orientation (12 o'clock top origin).
- Icon chevrons rotate smoothly by `180deg` on expansion.

**Responsive Breakpoints:**

- Mobile: `< 768px` (Single column vertical stacking, bottom navigation tabs, bottom sheet modals).
- Desktop / Web: `≥ 768px` (Split layout, multi-column grid, centered dialogue modals, sidebar/horizontal controls).
