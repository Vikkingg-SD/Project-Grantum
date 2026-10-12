## §2. DESIGN MANIFESTO: DUAL THEME "OBSIDIAN & QUARTZ"

Save as `DESIGN_MANIFESTO.md` in the project root.

### 2.1 The Visual Language: Obsidian (Dark) & Quartz (Light)

Grantum uses an **Instrument Grade** aesthetic. It is not a generic consumer application. It is a precision terminal for capital allocation, compliance scanning, and deterministic auditing.

- **Obsidian Instrument (Dark Theme — Default):** Absolute black base (`#000000`) with elevated carbon cards (`#121518`), industrial chrome borders (`#394047`), neon pumpkin brand accents (`#FF8A00`), electric mint for verified states (`#00B35D`), and cyan for pending states (`#00E5FF`).
- **Quartz Instrument (Light Theme):** High-contrast alpine canvas (`#F4F6F8`) with pure white elevated surfaces (`#FFFFFF`), precision slate borders (`#D1D5DB`), deep burnt pumpkin brand accents (`#D97000`), deep forest emerald for verification (`#008744`), and cobalt cyan for pending operations (`#0094A8`).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SEMANTIC DESIGN TOKEN PALETTE PARITY                            │
├──────────────────┬──────────────────────────┬──────────────────────────────────────────┤
│ Token Name       │ Obsidian Mode (Dark)     │ Quartz Mode (Light)                      │
├──────────────────┼──────────────────────────┼──────────────────────────────────────────┤
│ bg-primary       │ #000000 (Pure Obsidian)  │ #F4F6F8 (Pure Quartz Canvas)             │
│ bg-surface       │ #121518 (Carbon Vessel)  │ #FFFFFF (Elevated Pure Paper)            │
│ bg-subtle        │ #1A1E23 (Elevated Scrim) │ #E9ECEF (Structured Subtle Plate)        │
│ border-default   │ #394047 (Liquid Chrome)  │ #D1D5DB (Etched Slate)                   │
│ border-strong    │ #4B5563 (Accent Strike)  │ #9CA3AF (Solid Structural Stroke)        │
│ text-main        │ #EDEFF2 (High Contrast)  │ #111827 (Deep Carbon Ink)                │
│ text-muted       │ #8A929C (Technical Muted)│ #6B7280 (Subtle Descriptor Gray)         │
│ brand-primary    │ #FF8A00 (Neon Pumpkin)   │ #D97000 (Burnt Pumpkin Core)             │
│ brand-foreground │ #140B00 (Carbon Inset)   │ #FFFFFF (Solid White Knockout)           │
│ status-verified  │ #00B35D (Electric Mint)  │ #008744 (Deep Emerald Anchor)            │
│ status-pending   │ #00E5FF (High Cyan)      │ #0094A8 (Precision Cyan Stroke)          │
│ status-failure   │ #A4161A (Deep Crimson)   │ #DC2626 (Vivid Alert Crimson)            │
│ status-gold      │ #FFD700 (Imperial Amber) │ #D97706 (Burnished Amber Gold)           │
└──────────────────┴──────────────────────────┴──────────────────────────────────────────┘
```

### 2.2 Typography Scale & Mathematical Roles

Grantum uses two distinct typographic roles:

1. **Human/Structural Role (Inter):** System Sans (`Inter` / system sans-serif) for titles, subtitles, descriptors, interactive controls.
2. **Deterministic/Metric Role (JetBrains Mono):** Monospace (`JetBrains Mono` / monospace) for math readouts, checksums, monetary amounts, countdown clocks, and audit logs.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           TYPOGRAPHIC METRIC SPECIFICATION                             │
├──────────────────┬──────────────┬─────────────┬──────────────┬─────────────────────────┤
│ Typography Role  │ Font Size    │ Line Height │ Letter Space │ Target Element          │
├──────────────────┼──────────────┼─────────────┼──────────────┼─────────────────────────┤
│ text-display     │ 32px         │ 38px        │ -0.02em      │ Major Dashboard Headers │
│ text-h1          │ 24px         │ 30px        │ -0.01em      │ Container Titles        │
│ text-h2          │ 20px         │ 26px        │ 0.00em       │ Section Titles & Modals │
│ text-h3          │ 16px         │ 22px        │ +0.01em      │ Card Names & Subsections│
│ text-body        │ 14px         │ 20px        │ +0.01em      │ Paragraphs & Details    │
│ text-caption     │ 12px         │ 16px        │ +0.02em      │ Field Labels & Badges   │
│ text-metric-lg   │ 28px (Mono)  │ 32px        │ +0.00em      │ Gauge Value, Big Sums   │
│ text-metric-sm   │ 13px (Mono)  │ 18px        │ +0.04em      │ Audit Logs & Timestamps │
└──────────────────┴──────────────┴─────────────┴──────────────┴─────────────────────────┘
```

### 2.3 Geometric Invariants & Motion Dynamics

- **Border Radii:**
  - `radius-sm`: 8px (Buttons, badges, text input containers).
  - `radius-md`: 12px (Inner cards, hero stats, floating panels).
  - `radius-lg`: 16px (Modals, bottom sheets, main stage cards).
  - `radius-full`: 9999px (Pills, indicator dots, circular avatars).
- **Tilts and Rotations:**
  - Gauges start at `-90deg` orientation (12 o'clock top origin).
  - Icon chevrons rotate smoothly by `180deg` on expansion.
- **Responsive Breakpoints:**
  - Mobile: `< 768px` (Single column vertical stacking, bottom navigation tabs, bottom sheet modals).
  - Desktop / Web: `≥ 768px` (Split layout, multi-column grid, centered dialogue modals, sidebar/horizontal controls).
