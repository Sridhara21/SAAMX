# SAAMX — Phase 6.0 Design System Specification
## Professional Trading Floor & Educational Market Simulation UI/UX Standard

**Document ID:** `SAAMX-PHASE6-DS-001`  
**Status:** APPROVED FOR PHASE 6.1 IMPLEMENTATION  
**Author:** Software Architecture & Design Systems Engineering  
**Target Platform:** SAAMX (Student Academic Asset Market eXchange)  
**Date:** October 2026  

---

## 1. Executive Summary & Design Philosophy

SAAMX is a mission-critical simulation platform engineered for high-stakes, inter-school live trading floor events. The interface serves seven distinct user cohorts simultaneously—ranging from high-school participant teams experiencing market volatility for the first time, to exchange clerks executing physical paper slips under severe time pressure, to SEBI surveillance officers tracking suspicious trading rings, to auditorium audiences observing a 4K split-flap projection board.

### Core Design Pillars
1. **Financial Terminal Heritage with Modern Clarity:**  
   The aesthetic evokes institutional heritage—combining antique parchment/paper surfaces, deep warm slate ink, and polished brass/gold accents with the strict data density, monospaced tabular precision, and microsecond visual feedback of institutional trading terminals (e.g., Bloomberg Terminal, Reuters Eikon, FactSet).
2. **Operational Ergonomics & Cognitive Load Control:**  
   Interfaces are optimized for low error rates under stress. Critical actionable elements (e.g., claim order, validate, halt market) feature distinct color signatures, spatial isolation, keyboard shortcuts, and tactile focus states to prevent catastrophic operational errors.
3. **Data Density Without Clutter:**  
   High information density is achieved through strict typographic hierarchy, tabular alignment, compact metrics (`tnum`), and zero decorative fluff. Whitespace is intentional and functional, delineating functional zones without wasting precious vertical screen real estate.
4. **Resilience & State Transparency:**  
   Every state—live, synchronizing, disconnected, read-only, emergency halted—must be immediately unambiguous to the user without obscuring active data.

---

## 2. Color Palette & Token Architecture

The SAAMX design system enforces a CSS custom property (variable) token architecture supporting two core modes:
- **Financial Heritage Light Theme (Default):** Warm, parchment-tinted paper background, deep charcoal ink, antique brass borders, and rich mineral accents. Ideal for classroom environments, daylight auditorium projectors, and paper-order desk clerks.
- **High-Tech Terminal Dark Theme (Alternative):** Deep abyss black/navy background, crisp luminous typography, muted brass borders, and neon-mineral indicators. Ideal for dedicated command centers, SEBI surveillance, and dark projection auditoriums.

### 2.1 CSS Variable Token Matrix

```css
/* ==========================================================================
   SAAMX THEME TOKENS: FINANCIAL HERITAGE (LIGHT) vs HIGH-TECH TERMINAL (DARK)
   ========================================================================== */

:root {
  /* --- Default / Heritage Light Theme --- */
  --theme-mode: light;
  
  /* Canvas & Surfaces */
  --color-paper: #F7F5EE;                /* Parchment foundation */
  --color-surface: #FFFFFF;              /* Primary card/container surface */
  --color-surface-elevated: #FDFCF7;     /* Hover states & dropdown surfaces */
  --color-surface-sunken: #ECE8DC;       /* Recessed headers, table head, wells */
  
  /* Typography & Ink */
  --color-ink-primary: #181E29;          /* High-contrast body & header ink */
  --color-ink-secondary: #4A5568;        /* Subtitles, labels, secondary text */
  --color-ink-muted: #718096;            /* Timestamps, disabled text, hints */
  --color-ink-inverted: #FFFFFF;         /* Text on dark/accent fills */
  
  /* Structural Borders & Rules */
  --color-border-subtle: #E2DDD0;        /* Subtle dividers & internal gridlines */
  --color-border-strong: #C8C1AE;        /* Card boundaries, table outer borders */
  --color-border-focus: #845508;         /* Keyboard focus ring & active outline */
  
  /* Heritage Accent & Brand (Brass / Gold / Bronze) */
  --color-brass-primary: #845508;        /* Antique brass brand accent */
  --color-brass-hover: #6B4405;          /* Hover state */
  --color-brass-subtle: #FDF6E2;         /* Pale brass badge background */
  --color-brass-border: #D4A359;         /* Accent highlight border */
  
  /* Semantic Financial Indicators (Mineral/Toned) */
  --color-gain-text: #065F3E;            /* Dark emerald for text on light */
  --color-gain-bg: #E6F4EA;              /* Light emerald fill */
  --color-gain-border: #A3D9B1;          /* Subtle emerald border */
  --color-gain-solid: #107C41;           /* Solid button / badge */
  
  --color-loss-text: #931913;            /* Rich crimson for text on light */
  --color-loss-bg: #FCE8E6;              /* Light crimson fill */
  --color-loss-border: #F5A39E;          /* Subtle crimson border */
  --color-loss-solid: #C5221F;           /* Solid button / badge */
  
  --color-warn-text: #8A4B08;            /* Deep amber for text on light */
  --color-warn-bg: #FEF3D6;              /* Light amber fill */
  --color-warn-border: #F6CE7B;          /* Subtle amber border */
  --color-warn-solid: #D97706;           /* Solid button / badge */
  
  --color-info-text: #1E429F;            /* Royal sapphire text */
  --color-info-bg: #EBF5FF;              /* Light sapphire fill */
  --color-info-border: #A4CAFE;          /* Subtle sapphire border */
  --color-info-solid: #1A56DB;           /* Solid button / badge */
  
  /* Shadows & Elevation */
  --shadow-sm: 0 1px 2px rgba(24, 30, 41, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(24, 30, 41, 0.08), 0 2px 4px -1px rgba(24, 30, 41, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(24, 30, 41, 0.10), 0 4px 6px -2px rgba(24, 30, 41, 0.05);
  --shadow-modal: 0 20px 25px -5px rgba(24, 30, 41, 0.20), 0 10px 10px -5px rgba(24, 30, 41, 0.10);
}

[data-theme="dark"] {
  /* --- High-Tech Terminal Dark Theme --- */
  --theme-mode: dark;
  
  /* Canvas & Surfaces */
  --color-paper: #070A0F;                /* Deep abyss black canvas */
  --color-surface: #0E1626;              /* Primary terminal card surface */
  --color-surface-elevated: #162238;     /* Elevated drawer/modal surface */
  --color-surface-sunken: #05080C;       /* Recessed ticker wells & inputs */
  
  /* Typography & Ink */
  --color-ink-primary: #E2E8F0;          /* Crisp high-contrast body ink */
  --color-ink-secondary: #94A3B8;        /* Muted terminal labels */
  --color-ink-muted: #64748B;            /* Subtle timestamps & watermarks */
  --color-ink-inverted: #070A0F;         /* Dark text on bright fills */
  
  /* Structural Borders & Rules */
  --color-border-subtle: #1E293B;        /* Subtle terminal gridlines */
  --color-border-strong: #334155;        /* Card boundaries & active tabs */
  --color-border-focus: #D4A359;         /* Bright brass focus outline */
  
  /* Heritage Accent & Brand (Terminal Brass) */
  --color-brass-primary: #D4A359;        /* Luminous brass brand accent */
  --color-brass-hover: #E2BC7E;          /* Hover brass */
  --color-brass-subtle: #241D10;         /* Dark brass container tint */
  --color-brass-border: #845508;         /* Subdued brass border */
  
  /* Semantic Financial Indicators (Luminous Neon-Mineral) */
  --color-gain-text: #34D399;            /* Bright emerald */
  --color-gain-bg: #064E3B;              /* Dark emerald fill */
  --color-gain-border: #059669;          /* Crisp emerald border */
  --color-gain-solid: #10B981;           /* Luminous solid button */
  
  --color-loss-text: #F87171;            /* Bright crimson */
  --color-loss-bg: #450A0A;              /* Dark crimson fill */
  --color-loss-border: #DC2626;          /* Crisp crimson border */
  --color-loss-solid: #EF4444;           /* Luminous solid button */
  
  --color-warn-text: #FBBF24;            /* Bright amber */
  --color-warn-bg: #451A03;              /* Dark amber fill */
  --color-warn-border: #D97706;          /* Crisp amber border */
  --color-warn-solid: #F59E0B;           /* Luminous solid button */
  
  --color-info-text: #60A5FA;            /* Bright sapphire */
  --color-info-bg: #1E3A8A;              /* Dark sapphire fill */
  --color-info-border: #2563EB;          /* Crisp sapphire border */
  --color-info-solid: #3B82F6;           /* Luminous solid button */
  
  /* Shadows & Elevation */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.40);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.50), 0 2px 4px -1px rgba(0, 0, 0, 0.30);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.60), 0 4px 6px -2px rgba(0, 0, 0, 0.40);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.80), 0 10px 10px -5px rgba(0, 0, 0, 0.60);
}
```

---

## 3. Typography Hierarchy & Font Stacks

To prevent layout shifts and guarantee zero dependence on external font CDNs during offline event conditions, typography relies on local system-available fallbacks while gracefully loading modern web fonts when online.

### 3.1 Font Families

| Role | Preferred Font | Fallback Stack | Usage Context |
| :--- | :--- | :--- | :--- |
| **Editorial Heritage (Display)** | `Fraunces`, `Cinzel` | `Georgia`, `Baskerville`, `serif` | Page titles, major section headings, institution badges, ceremonial alerts |
| **Interface / UI** | `Plus Jakarta Sans`, `Inter` | `system-ui`, `-apple-system`, `Segoe UI`, `Roboto`, `sans-serif` | Navigation links, button labels, modal headers, table headers, form inputs |
| **Data & Tabular Numbers** | `JetBrains Mono`, `SF Mono` | `ui-monospace`, `Menlo`, `Consolas`, `monospace` | All stock prices, deltas, percentages, order IDs, slip numbers, timestamps, portfolio metrics |

> [!IMPORTANT]
> **Strict Tabular Numeral Enforcement (`tnum`):**  
> All monetary values, quantities, and percentages must declare `font-variant-numeric: tabular-nums;` or `font-feature-settings: "tnum" 1;`. This ensures that digits 0–9 have identical horizontal bounding boxes, eliminating table jitter when prices tick in real-time.

### 3.2 Typographic Scale

| Token | Size | Line Height | Weight | Tracking | Primary Element |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display-xl` | 36px (2.25rem) | 1.15 | 700 / Bold | -0.025em | Projector Hero Headline, Master Index |
| `text-display-lg` | 28px (1.75rem) | 1.20 | 700 / Bold | -0.020em | Page Headers, Major Modal Titles |
| `text-title-md` | 20px (1.25rem) | 1.30 | 600 / Semi | -0.015em | Section Headings, Stat Card Titles |
| `text-title-sm` | 16px (1.00rem) | 1.40 | 600 / Semi | -0.010em | Card Headers, Table Section Names |
| `text-body` | 14px (0.875rem) | 1.45 | 400 / Reg | 0.000em | Standard Body, Descriptive Text, News Body |
| `text-caption` | 12px (0.750rem) | 1.40 | 500 / Med | +0.010em | Input Labels, Table Headers, Badges |
| `text-micro` | 11px (0.6875rem)| 1.35 | 600 / Semi | +0.025em | Timestamps, Station Desks, Watermarks |
| `text-mono-lg` | 22px (1.375rem) | 1.20 | 700 / Bold | -0.020em | Portfolio Net Worth, Hero Stock Price |
| `text-mono-md` | 15px (0.9375rem) | 1.30 | 600 / Semi | 0.000em | Table Price Cells, Order Totals, Balances |
| `text-mono-sm` | 12px (0.750rem) | 1.35 | 500 / Med | 0.000em | Order IDs, Timestamps, Change Deltas |

---

## 4. Spacing, Elevation & Layout Grid

### 4.1 Spacing Scale
The spacing system strictly follows an 8-point base grid with 4-point micro-increments:
- `space-1`: `4px` (Micro paddings, badge internal gutters)
- `space-2`: `8px` (Compact table row padding, input internal padding)
- `space-3`: `12px` (Standard card gutters, button horizontal padding)
- `space-4`: `16px` (Card body padding, grid gap between modules)
- `space-5`: `20px` (Section sub-spacing)
- `space-6`: `24px` (Page margins, major panel dividers)
- `space-8`: `32px` (Page header spacing, hero block gutters)
- `space-12`: `48px` (Master layout boundary padding)

### 4.2 Responsive Breakpoints & Viewport Grid

```
+-----------------------------------------------------------------------------------------+
| Viewport Size     | Breakpoint Token | Layout Grid Strategy                             |
+-----------------------------------------------------------------------------------------+
| < 768px           | Mobile (sm)      | 1 Column Stacked. Bottom navigation bar.         |
|                   |                  | Tables convert to compact cards or horizontal   |
|                   |                  | scroll with sticky ticker frozen column.         |
| 768px - 1023px    | Tablet (md)      | 2 Column Grid. Collapsible sidebar navigation.  |
| 1024px - 1279px   | Laptop (lg)      | 3 Column Adaptive. Full sidebar, 16px gutters.   |
| 1280px - 1919px   | Desktop (xl)     | Multi-pane Command Center. 3-4 columns.          |
|                   |                  | Split order queues & dual verification view.    |
| >= 1920px (4K)    | Projector (2xl)  | Scaled Ultra-Dense / Big-Screen Split-Flap.      |
|                   |                  | Minimum text size 18px for stage visibility.    |
+-----------------------------------------------------------------------------------------+
```

---

## 5. Component Standards & Reusable UI Specifications

### 5.1 Buttons (`Button`)

Buttons must support 5 distinct visual tiers, plus explicit loading, disabled, and keyboard focus states:
1. **Primary (`variant="primary"`):**  
   - Solid brass (`--color-brass-primary`) in Light mode; luminous brass in Dark mode. White/ink-inverted text.
   - For irreversible or primary actions (e.g., "Submit Order Slip", "Verify Slip", "Execute Halt").
2. **Secondary (`variant="secondary"`):**  
   - Outlined surface with `--color-border-strong`, subtle hover highlight.
   - For navigation, filtering, exporting, viewing details.
3. **Destructive (`variant="destructive"`):**  
   - Solid crimson (`--color-loss-solid`). White text.
   - Requires explicit modal confirmation or two-click arming (e.g., "Reject Slip", "Revoke Token", "Declare Bankruptcy").
4. **Subtle / Ghost (`variant="ghost"`):**  
   - Transparent background, visible ink on hover.
   - For table row actions, quick icon toggles, modal dismissal.
5. **Success / Approve (`variant="success"`):**  
   - Solid emerald (`--color-gain-solid`). White text.
   - For clerk validations ("Validate Order Slip", "Clear Flag").

**Required Button Interactive States:**
- `focus-visible`: 2px solid `--color-border-focus` with 2px offset.
- `disabled`: Opacity 0.45, `cursor: not-allowed`, no hover transformation.
- `loading`: Replaces text with a smooth SVG spinner matching typography color; maintains exact button width to prevent layout jump.

### 5.2 Input Controls & Forms (`Input`, `Select`, `Checkbox`)
- **Text & Numeric Inputs:**  
  - Background `--color-surface` with 1px border `--color-border-strong`.
  - Monospaced font for numeric inputs with explicit currency/unit adornment (`₹`, `QTY`, `%`).
  - Strict input validation highlighting (red border + accessible error text below input).
- **Search Inputs:**  
  - Built-in search magnifying glass icon, clear button (`×`), and keyboard shortcut badge (`Ctrl + K`).
  - Auto-debounced at 150ms before triggering state filters.
- **Select Dropdowns:**  
  - Custom themed chevron, zero default OS styling quirks, keyboard arrow-key navigation.

### 5.3 Data Tables (`DataTable`)
The core workhorse of SAAMX. Must support:
1. **Sticky Header:** Top row stays pinned during vertical scroll.
2. **Column Alignment Rules:**
   - Text (Symbol, Company Name, Sector): Left-aligned (`text-left`).
   - Badges & Statuses: Center-aligned (`text-center`).
   - Prices, Volumes, Quantities, Timestamps, Deltas: Strictly Right-aligned (`text-right`) with `font-variant-numeric: tabular-nums`.
3. **Sort Indicators:** Visual directional arrows (`▲`/`▼`) with active sort highlighted in brass.
4. **Row States:**
   - Alternating striping (`--color-surface` vs `--color-surface-sunken`).
   - Hover highlight with smooth transition.
   - Selected / Active row with left brass border accent (3px).
5. **DOM Virtualization Standard:**  
   Any table rendering $> 50$ rows (e.g., Stock Directory with 2,061 rows, Audit Log with 5,000 events) **MUST** utilize virtualized windowing (e.g., `@tanstack/react-virtual` or lightweight CSS-virtual slice). Rendering 2,061 unvirtualized DOM nodes freezes client browsers during WebSocket price delta updates.

### 5.4 Metric & Stat Cards (`StatCard`)
- Display layout:
  - Top row: Semantic label (12px uppercase, `--color-ink-secondary`) + optional info tooltip.
  - Middle row: Massive monospaced metric (`text-mono-lg`, 24px–28px).
  - Bottom row: Delta indicator badge (`+4.25% ▲` in green, `-1.80% ▼` in red, or neutral dash) + secondary comparison label ("vs. Round Open").

### 5.5 Order Lifecycle Badges (`OrderBadge`)
Every order slip moves through a strict lifecycle represented by unambiguous semantic badges:

| Order Status | Light Mode Token | Dark Mode Token | Icon / Label |
| :--- | :--- | :--- | :--- |
| `QUEUED` | Amber Tint (`#FEF3D6` / `#8A4B08`) | Dark Amber (`#451A03` / `#FBBF24`) | ⏳ `IN QUEUE` |
| `CLAIMED` | Sapphire Tint (`#EBF5FF` / `#1E429F`) | Dark Sapphire (`#1E3A8A` / `#60A5FA`) | 👤 `DESK CLAIMED` |
| `VALIDATED` | Emerald Tint (`#E6F4EA` / `#065F3E`) | Dark Emerald (`#064E3B` / `#34D399`) | ✓ `PRE-VALIDATED` |
| `EXECUTED` | Solid Emerald (`#107C41` / `#FFFFFF`) | Neon Emerald (`#10B981` / `#070A0F`) | ★ `FILLED / EXECUTED` |
| `RETURNED` | Purple Tint (`#F3E8FF` / `#6B21A8`) | Dark Purple (`#3B0764` / `#C084FC`) | ↩ `RETURNED TO TEAM` |
| `REJECTED` | Crimson Tint (`#FCE8E6` / `#931913`) | Dark Crimson (`#450A0A` / `#F87171`) | ✕ `REJECTED (SEBI)` |

### 5.6 Modals, Drawers & Dialogs (`Modal`, `Drawer`)
- **Backdrop:** `rgba(15, 23, 42, 0.65)` with CSS `backdrop-filter: blur(4px)`.
- **Keyboard Trapping:** Tab key cycles exclusively within active modal controls.
- **Escape Key Listener:** Dismisses non-destructive modals.
- **Header:** Clear title, badge, and close button (`×`).
- **Footer:** Action alignment standard: Destructive/Secondary on Left; Primary/Confirm on Right.

### 5.7 Toast & Notification System (`Toast`)
- Positioned in bottom-right (`fixed bottom-4 right-4 z-50`).
- Auto-dismisses after 4,000ms; progress bar visually counts down remaining time.
- Supports manual close click.
- Max 4 simultaneous toasts stacked vertically with smooth slide-up animation.

---

## 6. Financial Data Visualization & Sparklines

### 6.1 Sparkline Technical Rules
- Sparklines are rendered via lightweight SVG path elements (`<svg>` with `<path d="..." />`).
- **Normalized Scaling:** Max and Min values are dynamically calculated from the trailing 20 ticks.
- **Zero Layout Shift:** SVG elements must have fixed dimensions (`width="80" height="24"`).
- **Semantic Coloring:**
  - If current price $\ge$ initial tick: Stroke is `--color-gain-solid` (`#107C41` / `#10B981`).
  - If current price $<$ initial tick: Stroke is `--color-loss-solid` (`#C5221F` / `#EF4444`).
- **Area Fill:** 15% opacity gradient fill below the sparkline curve to enhance peripheral readability.

### 6.2 Split-Flap Board (Projector Page)
- Dedicated 4K auditorium component.
- Visual metaphor of classic mechanical European stock exchange split-flap boards.
- Utilizes CSS 3D transforms (`transform: rotateX(...)`) with high hardware acceleration (`will-change: transform`).
- Flap transitions occur only on actual value changes, avoiding unnecessary CPU cycles.

---

## 7. Accessibility, Contrast & Usability Standards

1. **WCAG 2.1 AA Compliance:**  
   All text elements against their container background must achieve at least:
   - **4.5:1** contrast ratio for regular body text.
   - **3.0:1** contrast ratio for large text ($\ge 18\text{px}$) and essential UI boundaries.
   - In practice, SAAMX targets **$\ge 7:1$** for high-priority trading data to guarantee legibility on washed-out school projectors.
2. **Colorblind Redundancy:**  
   Color must **never** be the sole indicator of financial state. Every price delta must pair color with directional arrow symbols (`▲`, `▼`, `—`). Every order status badge must pair color with text labels and distinct icon glyphs.
3. **Motion Sensitivity (`prefers-reduced-motion`):**  
   All transitions and animations must be disabled or converted to instantaneous state changes when the user has enabled OS reduced-motion preferences.
4. **Keyboard Accessibility:**  
   Every console must be 100% operable without a mouse.
   - `Tab` / `Shift+Tab`: Predictable logical focus traversal.
   - `Enter` / `Space`: Activate buttons and toggle controls.
   - `Esc`: Close open drawers and modals.
   - Global Hotkeys:
     - `Ctrl + K`: Focus global security search.
     - `Ctrl + Enter`: Submit active order slip form.
     - `Ctrl + Shift + H`: Emergency market halt modal (authorized staff only).

---

## 8. Summary Checklist for Phase 6.1 Implementation

- [ ] All hardcoded Tailwind color strings (e.g., `text-green-500`, `bg-gray-900`) must be migrated to semantic theme tokens (`var(--color-*)`).
- [ ] Tabular numbers enabled on all numeric table cells.
- [ ] Table virtualization implemented for lists $> 50$ rows.
- [ ] Modals equipped with focus trapping and ESC listeners.
- [ ] Loading skeletons implemented for all asynchronous data fetches.
- [ ] Offline status banner configured to alert clerks during Wi-Fi drops.
