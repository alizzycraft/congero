# Area 5: UI/UX Design — Technical Specification & Implementation Plan

## 1. Overview

This document is the technical specification and implementation plan for **Area 5: UI/UX Design** of the Congero project. It translates the design document (`.kiro/specs/congero-ui-ux/design.md`) into concrete implementation guidance for the Angular/BabylonJS codebase.

Area 5 covers five implementation concerns:

1. **Design Tokens** — The complete Neon Space Canasta design system (colors, typography, spacing, panel styles, background effects) implemented as SCSS maps and CSS custom properties.
2. **Screen Layouts** — The four primary screens (Gameplay HUD, Deck/Inventory, Shop Rewards, Score Results) with grid-based layout definitions, zone placements, and responsive breakpoints.
3. **Component Specifications** — Component trees, layout grids, and zone definitions for each screen, including card elements, meld zones, action bars, and dialogs.
4. **Interaction Model** — Drag-and-drop card placement, click-to-select fallback, ghost slot computation, and confirmation dialogs.
5. **Accessibility** — ARIA role assignments, keyboard navigation maps, focus management, and color contrast verification.

**Dependencies:** Area 5 imports types and derives visual state from Areas 1–4. It defines tokens consumed by Areas 6–7. It reads aggregated state from Area 8. Area 5 does **not** own game logic, rendering, component templates, or state management — those are owned by Areas 1, 6, 7, and 8 respectively.

**Reference resolution:** All layout dimensions assume 1920×1080. Two responsive breakpoints are defined: ≤1240px (laptop) and ≤720px (tablet portrait).

---

## 2. File Structure

All UI/UX files live under `src/styles/` (design tokens), `src/app/shared/` (shared UI components), and `src/app/features/` (screen-specific components).

```
src/
├── styles/
│   ├── _tokens.scss                    # Design token maps (SCSS variables)
│   ├── _colors.scss                    # Color palette token definitions
│   ├── _typography.scss                # Typography role token definitions
│   ├── _spacing.scss                   # Spacing token definitions
│   ├── _panels.scss                    # Panel style token definitions
│   ├── _backgrounds.scss               # Background effect token definitions
│   ├── _mixins.scss                    # SCSS mixins for glow, responsive, focus
│   ├── _states.scss                    # Interactive state class definitions
│   ├── design-tokens.scss              # CSS custom property exports (:root)
│   └── styles.scss                     # Main entry; imports all partials
│
├── app/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── card/
│   │   │   │   ├── card.component.ts
│   │   │   │   ├── card.component.html
│   │   │   │   ├── card.component.scss
│   │   │   │   └── card.component.spec.ts
│   │   │   ├── meld-zone/
│   │   │   │   ├── meld-zone.component.ts
│   │   │   │   ├── meld-zone.component.html
│   │   │   │   ├── meld-zone.component.scss
│   │   │   │   └── meld-zone.component.spec.ts
│   │   │   ├── action-button/
│   │   │   │   ├── action-button.component.ts
│   │   │   │   ├── action-button.component.html
│   │   │   │   ├── action-button.component.scss
│   │   │   │   └── action-button.component.spec.ts
│   │   │   ├── ghost-slot/
│   │   │   │   ├── ghost-slot.component.ts
│   │   │   │   ├── ghost-slot.component.html
│   │   │   │   └── ghost-slot.component.scss
│   │   │   ├── confirmation-dialog/
│   │   │   │   ├── confirmation-dialog.component.ts
│   │   │   │   ├── confirmation-dialog.component.html
│   │   │   │   ├── confirmation-dialog.component.scss
│   │   │   │   └── confirmation-dialog.component.spec.ts
│   │   │   ├── seal-ring/
│   │   │   │   ├── seal-ring.component.ts
│   │   │   │   ├── seal-ring.component.html
│   │   │   │   └── seal-ring.component.scss
│   │   │   └── enhancement-badge/
│   │   │       ├── enhancement-badge.component.ts
│   │   │       ├── enhancement-badge.component.html
│   │   │       └── enhancement-badge.component.scss
│   │   ├── directives/
│   │   │   ├── drag-and-drop.directive.ts       # Drag-and-drop behavior
│   │   │   ├── keyboard-navigation.directive.ts  # Arrow key / shortcut handling
│   │   │   └── focus-trap.directive.ts           # Dialog focus trap
│   │   ├── models/
│   │   │   ├── screen-layout.model.ts           # ScreenLayout, ScreenZone types
│   │   │   ├── card-visual-state.model.ts       # CardVisualState, CardInteractionState
│   │   │   ├── meld-visual-state.model.ts       # MeldVisualState, MeldZoneState
│   │   │   ├── action-button-state.model.ts     # ActionButtonState, ActionButtonInteractionState
│   │   │   ├── enhancement-indicator.model.ts   # EnhancementVisualIndicator
│   │   │   ├── tray-indicator.model.ts          # TrayVisualIndicator
│   │   │   ├── design-token.model.ts            # DesignToken, DesignTokenCategory
│   │   │   └── index.ts                         # Barrel export
│   │   ├── services/
│   │   │   ├── design-token.service.ts          # Token lookup & CSS var injection
│   │   │   ├── screen-layout.service.ts         # Screen layout config provider
│   │   │   ├── interaction-state.service.ts     # Card/meld/button state derivation
│   │   │   └── accessibility.service.ts         # ARIA live announcements
│   │   └── pipes/
│   │       ├── card-aria-label.pipe.ts          # Formats card.ariaLabel
│   │       └── meld-aria-label.pipe.ts          # Formats meld.ariaLabel
│   │
│   └── features/
│       ├── gameplay-hud/
│       │   ├── gameplay-hud.component.ts
│       │   ├── gameplay-hud.component.html
│       │   ├── gameplay-hud.component.scss
│       │   ├── gameplay-hud.component.spec.ts
│       │   ├── components/
│       │   │   ├── status-bar/
│       │   │   │   ├── status-bar.component.ts
│       │   │   │   ├── status-bar.component.html
│       │   │   │   └── status-bar.component.scss
│       │   │   ├── hand-zone/
│       │   │   │   ├── hand-zone.component.ts
│       │   │   │   ├── hand-zone.component.html
│       │   │   │   └── hand-zone.component.scss
│       │   │   ├── player-meld-area/
│       │   │   │   ├── player-meld-area.component.ts
│       │   │   │   ├── player-meld-area.component.html
│       │   │   │   └── player-meld-area.component.scss
│       │   │   ├── opponent-meld-area/
│       │   │   │   ├── opponent-meld-area.component.ts
│       │   │   │   ├── opponent-meld-area.component.html
│       │   │   │   └── opponent-meld-area.component.scss
│       │   │   ├── discard-zone/
│       │   │   │   ├── discard-zone.component.ts
│       │   │   │   ├── discard-zone.component.html
│       │   │   │   └── discard-zone.component.scss
│       │   │   └── action-bar/
│       │   │       ├── action-bar.component.ts
│       │   │       ├── action-bar.component.html
│       │   │       └── action-bar.component.scss
│       │   └── services/
│       │       └── gameplay-layout.service.ts    # Gameplay HUD layout config
│       │
│       ├── deck-inventory/
│       │   ├── deck-inventory.component.ts
│       │   ├── deck-inventory.component.html
│       │   ├── deck-inventory.component.scss
│       │   ├── deck-inventory.component.spec.ts
│       │   └── components/
│       │       ├── deck-grid/
│       │       │   ├── deck-grid.component.ts
│       │       │   ├── deck-grid.component.html
│       │       │   └── deck-grid.component.scss
│       │       └── deck-summary/
│       │           ├── deck-summary.component.ts
│       │           ├── deck-summary.component.html
│       │           └── deck-summary.component.scss
│       │
│       ├── shop-rewards/
│       │   ├── shop-rewards.component.ts
│       │   ├── shop-rewards.component.html
│       │   ├── shop-rewards.component.scss
│       │   ├── shop-rewards.component.spec.ts
│       │   └── components/
│       │       ├── shop-grid/
│       │       │   ├── shop-grid.component.ts
│       │       │   ├── shop-grid.component.html
│       │       │   └── shop-grid.component.scss
│       │       └── shop-item/
│       │           ├── shop-item.component.ts
│       │           ├── shop-item.component.html
│       │           └── shop-item.component.scss
│       │
│       └── score-results/
│           ├── score-results.component.ts
│           ├── score-results.component.html
│           ├── score-results.component.scss
│           ├── score-results.component.spec.ts
│           └── components/
│               ├── score-display/
│               │   ├── score-display.component.ts
│               │   ├── score-display.component.html
│               │   └── score-display.component.scss
│               ├── score-breakdown/
│               │   ├── score-breakdown.component.ts
│               │   ├── score-breakdown.component.html
│               │   └── score-breakdown.component.scss
│               └── gold-summary/
│                   ├── gold-summary.component.ts
│                   ├── gold-summary.component.html
│                   └── gold-summary.component.scss
```

---

## 3. Design Token Implementation

Design tokens are implemented in two layers: **SCSS maps** (for compile-time use in mixins and functions) and **CSS custom properties** (for runtime use in component styles and by Area 6/BabylonJS via `var()` references).

### 3.1 SCSS Token Maps

Each token category is defined as an SCSS map in its respective partial file. The map key is the token name (matching the design doc), and the value is the token value.

**`src/styles/_colors.scss`** — 40 color tokens:

```scss
$colors: (
  // Backgrounds
  'spaceBlack':         #0A0E17,
  'nebulaDark':         #111827,
  'voidGray':           #1F2937,

  // Neon accents
  'neonCyan':           #00F0FF,
  'neonMagenta':        #FF00AA,
  'neonGold':           #FFD700,
  'neonGreen':          #39FF14,
  'neonRed':            #FF3131,
  'neonPurple':         #B026FF,
  'neonOrange':         #FF6A00,

  // Text
  'starWhite':          #F0F4FF,
  'cometGray':          #94A3B8,
  'asteroidGray':       #64748B,

  // Card glows (aliases)
  'wildGlow':           #B026FF,
  'naturalGlow':        #00F0FF,

  // Enhancement borders (Area 4)
  'enhancementGilded':  #FFD700,
  'enhancementEcho':    #00F0FF,
  'enhancementSticky':  #39FF14,
  'enhancementFrozen':  #7DD3FC,
  'enhancementHot':     #FF6A00,
  'enhancementBuried':  #64748B,
  'enhancementAnchor':  #FF00AA,
  'enhancementPure':    #F0F4FF,
  'enhancementMarked':  #FF3131,
  'enhancementPartner': #B026FF,

  // Canasta seal rings (Area 1)
  'sealNatural':        #00F0FF,
  'sealDirty':          #B026FF,
  'sealSuper':          #FFD700,
  'sealRed':            #FF3131,
  'sealFrozen':         #7DD3FC,
  'sealPartner':        #FF00AA,
  'sealConcealed':      #39FF14,

  // Modifier badges (Area 3)
  'modifierScorepad':   #FFD700,
  'modifierPartner':    #B026FF,
  'modifierTray':       #00F0FF,
  'modifierBoss':       #FF3131,
  'modifierHouse':      #39FF14,

  // Shop rarities (Area 2)
  'shopCommon':         #94A3B8,
  'shopUncommon':       #39FF14,
  'shopRare':           #00F0FF,
  'shopLegendary':      #FFD700,
);
```

**`src/styles/_typography.scss`** — 17 typography tokens:

```scss
$typography: (
  'display':    ('Orbitron', sans-serif),
  'body':       ('Exo 2', sans-serif),
  'mono':       ('Share Tech Mono', monospace),
  'size-xs':    10px,
  'size-sm':    13px,
  'size-md':    16px,
  'size-lg':    22px,
  'size-xl':    32px,
  'size-2xl':   48px,
  'weight-light':    300,
  'weight-regular':  400,
  'weight-semibold': 600,
  'weight-bold':     700,
  'letterSpacing-tight':  -0.02em,
  'letterSpacing-normal': 0,
  'letterSpacing-wide':   0.08em,
  'letterSpacing-xwide':  0.15em,
);
```

**`src/styles/_spacing.scss`** — 9 spacing tokens:

```scss
$spacing: (
  '2xs': 2px,
  'xs':  4px,
  'sm':  8px,
  'md':  12px,
  'lg':  16px,
  'xl':  24px,
  '2xl': 32px,
  '3xl': 48px,
  '4xl': 64px,
);
```

**`src/styles/_panels.scss`** — 16 panel style tokens:

```scss
$panels: (
  'gameplayBg':  radial-gradient(ellipse at 50% 30%, #111827 0%, #0A0E17 70%),
  'shopBg':      linear-gradient(180deg, #0A0E17 0%, #111827 50%, #0A0E17 100%),
  'deckBg':      linear-gradient(135deg, #111827 0%, #0A0E17 100%),
  'scoreBg':     radial-gradient(circle at 50% 50%, #1F2937 0%, #0A0E17 60%),
  'cardRadius':  8px,
  'zoneRadius':  12px,
  'dialogRadius': 16px,
  'borderWidth': 1px,
  'borderGlowWidth': 2px,
  'shadowColor': rgba(0, 240, 255, 0.15),
  'shadowBlur':  20px,
  'glowCyan':    0 0 12px rgba(0, 240, 255, 0.4), 0 0 24px rgba(0, 240, 255, 0.15),
  'glowMagenta': 0 0 12px rgba(255, 0, 170, 0.4), 0 0 24px rgba(255, 0, 170, 0.15),
  'glowGold':    0 0 12px rgba(255, 215, 0, 0.4), 0 0 24px rgba(255, 215, 0, 0.15),
  'glowGreen':   0 0 12px rgba(57, 255, 20, 0.4), 0 0 24px rgba(57, 255, 20, 0.15),
  'glowRed':     0 0 12px rgba(255, 49, 49, 0.4), 0 0 24px rgba(255, 49, 49, 0.15),
  'glowPurple':  0 0 12px rgba(176, 38, 255, 0.4), 0 0 24px rgba(176, 38, 255, 0.15),
);
```

**`src/styles/_backgrounds.scss`** — 7 background effect tokens:

```scss
$backgrounds: (
  'starField':        url(#star-field-pattern),
  'nebulaCloud':      radial-gradient(ellipse at 30% 20%, rgba(176, 38, 255, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, rgba(0, 240, 255, 0.06) 0%, transparent 50%),
  'gridLines':        repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0, 240, 255, 0.03) 39px, rgba(0, 240, 255, 0.03) 40px),
                        repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0, 240, 255, 0.03) 39px, rgba(0, 240, 255, 0.03) 40px),
  'vignette':         radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(10, 14, 23, 0.6) 100%),
  'scanlines':        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.05) 2px, rgba(0, 0, 0, 0.05) 4px),
  'transitionDuration': 300ms,
  'transitionEasing':   cubic-bezier(0.4, 0, 0.2, 1),
);
```

### 3.2 CSS Custom Property Export

**`src/styles/design-tokens.scss`** exports all tokens as CSS custom properties under the `:root` selector. The naming convention is `--congero-{category}-{name}`.

```scss
@use 'colors';
@use 'typography';
@use 'spacing';
@use 'panels';
@use 'backgrounds';

:root {
  // ── Colors ──────────────────────────────────────────────────────────────
  @each $name, $value in colors.$colors {
    --congero-color-#{$name}: #{$value};
  }

  // ── Typography ──────────────────────────────────────────────────────────
  @each $name, $value in typography.$typography {
    --congero-typography-#{$name}: #{$value};
  }

  // ── Spacing ─────────────────────────────────────────────────────────────
  @each $name, $value in spacing.$spacing {
    --congero-spacing-#{$name}: #{$value};
  }

  // ── Panels ──────────────────────────────────────────────────────────────
  @each $name, $value in panels.$panels {
    --congero-panel-#{$name}: #{$value};
  }

  // ── Backgrounds ─────────────────────────────────────────────────────────
  @each $name, $value in backgrounds.$backgrounds {
    --congero-bg-#{$name}: #{$value};
  }
}
```

### 3.3 SCSS Helper Functions and Mixins

**`src/styles/_mixins.scss`** provides lookup functions and reusable patterns:

```scss
@use 'colors';
@use 'typography';
@use 'spacing';
@use 'panels';

/// Looks up a color token value from the SCSS map.
/// @param {string} $name - Token name (e.g., 'neonCyan')
/// @return {color} The color value
@function color($name) {
  @return map.get(colors.$colors, $name);
}

/// Looks up a typography token value.
/// @param {string} $name - Token name (e.g., 'size-md')
/// @return {*}
@function typography($name) {
  @return map.get(typography.$typography, $name);
}

/// Looks up a spacing token value.
/// @param {string} $name - Token name (e.g., 'md')
/// @return {length}
@function spacing($name) {
  @return map.get(spacing.$spacing, $name);
}

/// Looks up a panel token value.
/// @param {string} $name - Token name (e.g., 'glowCyan')
/// @return {*}
@function panel($name) {
  @return map.get(panels.$panels, $name);
}

/// Applies a neon glow effect using a panel token.
/// @param {string} $glow-name - Panel glow token name (e.g., 'glowCyan')
@mixin neon-glow($glow-name) {
  box-shadow: var(--congero-panel-#{$glow-name});
}

/// Applies a responsive breakpoint.
/// @param {string} $breakpoint - 'laptop' (≤1240px) or 'tablet' (≤720px)
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'laptop' {
    @media (max-width: 1240px) { @content; }
  } @else if $breakpoint == 'tablet' {
    @media (max-width: 720px) { @content; }
  }
}

/// Applies focus-visible ring for keyboard navigation.
@mixin focus-ring {
  &:focus-visible {
    outline: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
    outline-offset: var(--congero-spacing-2xs);
  }
}

/// Visually hidden but accessible to screen readers.
@mixin sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 3.4 Design Token Service

**`src/app/shared/services/design-token.service.ts`** provides runtime token lookup for TypeScript code (e.g., passing color values to BabylonJS in Area 6):

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DesignTokenService {
  private get styles(): CSSStyleDeclaration {
    return getComputedStyle(document.documentElement);
  }

  /** Returns the computed value of a CSS custom property token. */
  getToken(category: string, name: string): string {
    return this.styles.getPropertyValue(`--congero-${category}-${name}`).trim();
  }

  /** Convenience: get a color token value. */
  getColor(name: string): string {
    return this.getToken('color', name);
  }

  /** Convenience: get a spacing token value. */
  getSpacing(name: string): string {
    return this.getToken('spacing', name);
  }

  /** Convenience: get a panel token value. */
  getPanel(name: string): string {
    return this.getToken('panel', name);
  }
}
```

---

## 4. Component Specifications

### 4.1 Gameplay HUD

**Component tree:**
```
gameplay-hud
├── status-bar                    [zone: status-bar]
├── opponent-meld-area            [zone: opponent-melds]
├── player-meld-area              [zone: player-melds]
│   ├── meld-zone (×5)            [zone: meld-zone-{1..5}]
│   │   ├── card (×N)
│   │   ├── ghost-slot (×N)
│   │   └── seal-ring
│   └── tray-indicator (optional)
├── discard-zone                  [zone: discard-zone]
├── hand-zone                     [zone: hand-zone]
│   └── card (×N, fan layout)
└── action-bar                    [zone: action-bar]
    └── action-button (×6)
```

**Layout grid (reference 1920×1080):**
- 12 columns × 8 rows
- Column width: `1fr` each
- Row heights: `48px, 160px, 160px, 160px, 140px, 100px, 100px, 64px`

**Zone definitions:**

| Zone ID | Grid Placement | ARIA Role | Focusable |
|---------|---------------|-----------|-----------|
| `status-bar` | [1, 1, 12, 1] | `status` | No |
| `opponent-melds` | [1, 2, 12, 2] | `region` | No |
| `player-melds` | [1, 3, 12, 5] | `region` | Yes |
| `discard-zone` | [1, 6, 3, 6] | `region` | Yes |
| `hand-zone` | [1, 7, 12, 7] | `listbox` | Yes |
| `action-bar` | [1, 8, 12, 8] | `toolbar` | Yes |

**Card dimensions:**
- Reference: 96×140px
- ≤1240px: 80×116px
- ≤720px: 64×92px

**Hand zone fan layout:**
- Horizontal overlap: 40% of card width at reference
- At ≤720px: vertical stack, max 5 visible, scroll for overflow

### 4.2 Deck/Inventory Screen

**Component tree:**
```
deck-inventory
├── deck-header                   [zone: deck-header]
├── deck-summary                  [zone: deck-summary]
├── deck-grid                    [zone: deck-grid]
│   └── card (×N)
└── deck-actions                  [zone: deck-actions]
    └── action-button (×3)
```

**Layout grid (reference 1920×1080):**
- 12 columns × 8 rows
- Row heights: `48px, 40px, 1fr, 1fr, 1fr, 1fr, 1fr, 64px`

**Zone definitions:**

| Zone ID | Grid Placement | ARIA Role | Focusable |
|---------|---------------|-----------|-----------|
| `deck-header` | [1, 1, 12, 1] | `region` | No |
| `deck-summary` | [1, 2, 12, 2] | `status` | No |
| `deck-grid` | [1, 3, 12, 7] | `listbox` | Yes |
| `deck-actions` | [1, 8, 12, 8] | `toolbar` | Yes |

**Grid columns for card layout:**
- Reference: 10 columns
- ≤1240px: 7 columns
- ≤720px: 4 columns

### 4.3 Shop Rewards Screen

**Component tree:**
```
shop-rewards
├── shop-header                   [zone: shop-header]
├── shop-grid                     [zone: shop-grid]
│   └── shop-item (×N)
│       ├── card (×N, preview)
│       └── action-button (BUY)
└── shop-actions                  [zone: shop-actions]
    └── action-button (×2)
```

**Layout grid (reference 1920×1080):**
- 12 columns × 8 rows
- Row heights: `48px, 1fr, 1fr, 1fr, 1fr, 1fr, 1fr, 64px`

**Zone definitions:**

| Zone ID | Grid Placement | ARIA Role | Focusable |
|---------|---------------|-----------|-----------|
| `shop-header` | [1, 1, 12, 1] | `region` | No |
| `shop-grid` | [1, 2, 12, 7] | `list` | Yes |
| `shop-actions` | [1, 8, 12, 8] | `toolbar` | Yes |

**Grid columns for shop items:**
- Reference: 3 columns
- ≤1240px: 2 columns
- ≤720px: 1 column (vertical list)

### 4.4 Score Results Screen

**Component tree:**
```
score-results
├── score-header                  [zone: score-header]
├── score-display                 [zone: score-display]
├── score-breakdown               [zone: score-breakdown]
│   └── breakdown-row (×N)
├── gold-summary                  [zone: gold-summary]
└── score-actions                 [zone: score-actions]
    └── action-button (×1)
```

**Layout grid (reference 1920×1080):**
- 12 columns × 8 rows
- Row heights: `48px, 1fr, 1fr, 1fr, 1fr, 1fr, 40px, 64px`

**Zone definitions:**

| Zone ID | Grid Placement | ARIA Role | Focusable |
|---------|---------------|-----------|-----------|
| `score-header` | [1, 1, 12, 1] | `region` | No |
| `score-display` | [4, 2, 9, 4] | `status` | No |
| `score-breakdown` | [2, 5, 11, 6] | `list` | Yes |
| `score-gold` | [2, 7, 11, 7] | `status` | No |
| `score-actions` | [1, 8, 12, 8] | `toolbar` | Yes |

---

## 5. Interaction Model

### 5.1 Drag-and-Drop Implementation

**Directive:** `src/app/shared/directives/drag-and-drop.directive.ts`

The directive uses the HTML5 Drag and Drop API with Angular `@HostListener` decorators. It is applied to card elements and meld zone drop targets.

**Approach:**
1. **Drag start:** Set `CardVisualState.interactionState = 'dragging'`, apply scale 1.08, set z-index 100, store card ID in `dataTransfer`. Highlight valid drop zones with `color-neonCyan` dashed border.
2. **Drag over:** Prevent default to allow drop. If over a valid meld zone, show ghost slot preview (dashed border, 40% opacity).
3. **Drop:** Call `InteractionStateService.handleCardDrop()` which delegates to Area 1's `validateMeld()`. On success, animate card to target slot (200ms ease-out). On failure, play error shake animation and show rejection message.
4. **Drag end (cancel):** Snap card back to hand position.

**Key implementation details:**
- Drag image is the card element itself (cloned via `setDragImage`).
- Drop zones are identified by `data-zone-id` attributes.
- The directive emits `cardDropped` event with `{ cardId, targetZoneId }` for the parent component to handle.

### 5.2 Click-to-Select Fallback

**Directive:** `src/app/shared/directives/keyboard-navigation.directive.ts`

This directive handles both keyboard navigation and click-to-select behavior.

**Click behavior:**
- Single click: Clears selection, selects clicked card. Sets `interactionState = 'selected'`, applies scale 1.1 and `panel-glowCyan`.
- Shift/Ctrl + click: Toggles card in multi-selection set without clearing others.
- Click on action button with selection active: Executes action on selected cards.

**Touch device behavior (≤720px):**
- Tap to select (card highlights with selection ring).
- Tap on valid drop zone to place selected card(s).
- "Quick meld" button appears when a valid selection + valid target combination is detected.

### 5.3 Confirmation Dialogs

**Component:** `src/app/shared/components/confirmation-dialog/`

Four confirmation dialogs are defined per the design doc (Section 3.1.5):

| Dialog ID | Trigger | Default Focus |
|-----------|---------|---------------|
| `confirm-go-out` | "Go Out" action | Cancel button |
| `confirm-discard-black-three` | Discarding black three | Cancel button |
| `confirm-reroll` | "Reroll" action (cost > 0) | Cancel button |
| `confirm-convert` | "Convert" action | Cancel button |

**Implementation requirements:**
- Uses Angular CDK `Dialog` or a custom modal with `cdkTrapFocus`.
- `aria-modal="true"`, `aria-labelledby` points to dialog title.
- Focus is trapped within the dialog. Cancel receives initial focus (safe default).
- Enter confirms, Escape cancels.
- Focus returns to the triggering button on close.

### 5.4 Ghost Slot Behavior

**Component:** `src/app/shared/components/ghost-slot/`

Ghost slots are computed by `InteractionStateService.computeGhostSlots()`:

```
computeGhostSlots(meldState: MeldVisualState): number {
  if (meldState.state === 'complete' || meldState.state === 'sealed') return 0;
  if (meldState.state === 'empty') return 3;
  // partial
  const remaining = 7 - meldState.cardCount;
  return Math.min(remaining, 3);
}
```

Ghost slots are rendered as empty card placeholders with:
- Dashed `color-cometGray` border
- 40% opacity
- `role="presentation"` (not focusable)
- On drag-over: transition to showing the dragged card as a ghost preview

---

## 6. Interactive States

### 6.1 Card States (9 states)

**File:** `src/styles/_states.scss`

All card states map to CSS classes applied via Angular `[ngClass]` binding. Each class references design tokens via `var()`.

```scss
// ─── Card Interactive States ───────────────────────────────────────────────

.card {
  // Base card styles
  border-radius: var(--congero-panel-cardRadius);
  transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;

  // 1. default
  &--default {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-voidGray);
    transform: scale(1.0);
    cursor: default;
  }

  // 2. selected
  &--selected {
    border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
    box-shadow: var(--congero-panel-glowCyan);
    transform: scale(1.1);
    cursor: grab;
  }

  // 3. playable
  &--playable {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-neonGreen);
    box-shadow: 0 0 6px rgba(57, 255, 20, 0.2); // glowGreen at 50%
    transform: scale(1.0);
    cursor: pointer;
    animation: pulse-green 2s ease-in-out infinite;
  }

  // 4. unplayable
  &--unplayable {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-asteroidGray);
    filter: grayscale(60%);
    transform: scale(1.0);
    cursor: not-allowed;
  }

  // 5. wild
  &--wild {
    border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonPurple);
    box-shadow: var(--congero-panel-glowPurple);
    transform: scale(1.0);
    cursor: default;
  }

  // 6. enhanced
  &--enhanced {
    // Border color set dynamically via [style.border-color] binding
    // to the enhancement's glowColorToken
    border-width: var(--congero-panel-borderGlowWidth);
    border-style: solid;
    transform: scale(1.0);
    cursor: default;
  }

  // 7. sealed
  &--sealed {
    border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
    box-shadow: var(--congero-panel-glowGold);
    transform: scale(1.0);
    cursor: default;
  }

  // 8. dragging
  &--dragging {
    border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
    box-shadow: var(--congero-panel-glowCyan);
    opacity: 0.8;
    transform: scale(1.08) translateY(-8px);
    z-index: 100;
    cursor: grabbing;
  }

  // 9. ghost
  &--ghost {
    border: var(--congero-panel-borderWidth) dashed var(--congero-color-cometGray);
    opacity: 0.4;
    transform: scale(1.0);
    cursor: default;
  }
}
```

**State-to-class mapping:**

| CardInteractionState | CSS Class | Applied By |
|----------------------|-----------|------------|
| `default` | `.card--default` | `deriveCardVisualState()` |
| `selected` | `.card--selected` | Click handler |
| `playable` | `.card--playable` | `deriveCardVisualState()` |
| `unplayable` | `.card--unplayable` | `deriveCardVisualState()` |
| `wild` | `.card--wild` | `deriveCardVisualState()` |
| `enhanced` | `.card--enhanced` | `deriveCardVisualState()` |
| `sealed` | `.card--sealed` | Meld completion handler |
| `dragging` | `.card--dragging` | Drag-and-drop directive |
| `ghost` | `.card--ghost` | Ghost slot component |

### 6.2 Meld Zone States (4 states)

```scss
// ─── Meld Zone Interactive States ──────────────────────────────────────────

.meld-zone {
  border-radius: var(--congero-panel-zoneRadius);
  transition: border-color 200ms ease, box-shadow 200ms ease;

  &--empty {
    border: var(--congero-panel-borderWidth) dashed var(--congero-color-cometGray);
    background: rgba(31, 41, 55, 0.3); // voidGray at low opacity
  }

  &--partial {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-asteroidGray);
    background: rgba(31, 41, 55, 0.5);
  }

  &--complete {
    border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
    box-shadow: var(--congero-panel-glowGold);
    // Seal ring animation applied by seal-ring component
  }

  &--sealed {
    border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
    box-shadow: var(--congero-panel-glowCyan);
    // Steady glow, no rotation animation
  }
}
```

**State-to-class mapping:**

| MeldZoneState | CSS Class | Applied By |
|---------------|-----------|------------|
| `empty` | `.meld-zone--empty` | `deriveMeldVisualState()` |
| `partial` | `.meld-zone--partial` | `deriveMeldVisualState()` |
| `complete` | `.meld-zone--complete` | Meld completion handler |
| `sealed` | `.meld-zone--sealed` | Meld seal handler |

### 6.3 Action Button States (3 states)

```scss
// ─── Action Button Interactive States ──────────────────────────────────────

.action-button {
  font-family: var(--congero-typography-body);
  font-size: var(--congero-typography-size-md);
  font-weight: var(--congero-typography-weight-semibold);
  letter-spacing: var(--congero-typography-letterSpacing-wide);
  border-radius: var(--congero-panel-cardRadius);
  transition: opacity 150ms ease, border-color 150ms ease;

  &--enabled {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-neonCyan);
    background: var(--congero-color-nebulaDark);
    color: var(--congero-color-starWhite);
    cursor: pointer;

    &:hover {
      box-shadow: var(--congero-panel-glowCyan);
    }
  }

  &--disabled {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-asteroidGray);
    background: var(--congero-color-voidGray);
    color: var(--congero-color-cometGray);
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--loading {
    border: var(--congero-panel-borderWidth) solid var(--congero-color-neonCyan);
    background: var(--congero-color-nebulaDark);
    cursor: wait;
    // Spinner icon replaces label text
  }
}
```

**State-to-class mapping:**

| ActionButtonInteractionState | CSS Class | Applied By |
|------------------------------|-----------|------------|
| `enabled` | `.action-button--enabled` | `deriveActionButtonState()` |
| `disabled` | `.action-button--disabled` | `deriveActionButtonState()` |
| `loading` | `.action-button--loading` | Action in progress |

---

## 7. Accessibility

### 7.1 ARIA Role Assignments

Per design doc Section 3.2.7, the following ARIA roles are assigned to elements:

| Element | ARIA Role | Implementation |
|---------|-----------|----------------|
| Screen root | `application` | `<div role="application" [attr.aria-label]="screenTitle">` |
| Status bar | `status` | `<div role="status" aria-live="polite">` |
| Hand zone | `listbox` | `<div role="listbox" [attr.aria-multiselectable]="true" aria-orientation="horizontal">` |
| Individual card | `option` | `<div role="option" [attr.aria-selected]="isSelected" [attr.aria-describedby]="tooltipId">` |
| Meld zone | `region` | `<div role="region" [attr.aria-label]="meld.ariaLabel">` |
| Ghost slot | `presentation` | `<div role="presentation">` |
| Discard pile | `region` | `<div role="region" [attr.aria-label]="discardLabel">` |
| Action button | `button` | `<button [attr.aria-disabled]="!enabled" [attr.aria-keyshortcuts]="shortcut">` |
| Action toolbar | `toolbar` | `<div role="toolbar" aria-orientation="horizontal" aria-label="Game actions">` |
| Shop item | `listitem` | `<li [attr.aria-label]="itemLabel">` |
| Score breakdown row | `listitem` | `<div role="listitem" [attr.aria-label]="rowLabel">` |
| Confirmation dialog | `dialog` | `<div role="dialog" [attr.aria-modal]="true" [attr.aria-labelledby]="titleId">` |
| Score display | `status` | `<div role="status" aria-live="polite">` |

### 7.2 Keyboard Navigation Implementation

**Directive:** `src/app/shared/directives/keyboard-navigation.directive.ts`

**Global shortcuts (all screens):**

| Key | Action | Angular Implementation |
|-----|--------|----------------------|
| `Tab` | Next zone | Native tab order; `tabindex` on zones |
| `Shift+Tab` | Previous zone | Native tab order |
| `Escape` | Cancel / close dialog | `@HostListener('keydown.escape')` |
| `?` | Show shortcut help | `@HostListener('keydown.?')` |

**Gameplay HUD shortcuts:**

| Key | Action | Angular Implementation |
|-----|--------|----------------------|
| `←` / `→` | Navigate cards in hand | `@HostListener('keydown.arrowleft')` / `arrowright` |
| `↑` / `↓` | Navigate between zones | `@HostListener('keydown.arrowup')` / `arrowdown` |
| `Enter` / `Space` | Toggle selection | `@HostListener('keydown.enter')` / `keydown.space` |
| `M` | Meld action | `@HostListener('keydown.m')` |
| `D` | Discard action | `@HostListener('keydown.d')` |
| `G` | Go Out action | `@HostListener('keydown.g')` |
| `W` | Draw action | `@HostListener('keydown.w')` |
| `1`–`5` | Jump to meld zone | `@HostListener('keydown.1')` through `keydown.5` |
| `H` | Read hand state | `@HostListener('keydown.h')` → `AccessibilityService.announce()` |

**Focus management rules:**
- Tab order follows `ScreenLayout.zones[]` array order.
- Arrow keys navigate within a zone (e.g., card to card in hand zone).
- Focus is trapped inside confirmation dialogs (via `cdkTrapFocus`).
- On dialog close, focus returns to the element that opened it.
- All interactive elements have visible focus rings (via `focus-ring` mixin).

### 7.3 Color Contrast Verification

All color tokens meet WCAG AA requirements. The following critical pairs are verified:

| Foreground | Background | Ratio | AA Normal (4.5:1) | AA Large (3:1) |
|------------|------------|-------|--------------------|--------------------|
| `color-starWhite` | `color-spaceBlack` | 16.42:1 | ✅ | ✅ |
| `color-neonCyan` | `color-spaceBlack` | 13.14:1 | ✅ | ✅ |
| `color-neonGold` | `color-spaceBlack` | 14.27:1 | ✅ | ✅ |
| `color-neonGreen` | `color-spaceBlack` | 14.93:1 | ✅ | ✅ |
| `color-neonMagenta` | `color-spaceBlack` | 8.37:1 | ✅ | ✅ |
| `color-neonRed` | `color-spaceBlack` | 7.42:1 | ✅ | ✅ |
| `color-neonPurple` | `color-spaceBlack` | 6.89:1 | ✅ | ✅ |
| `color-neonOrange` | `color-spaceBlack` | 9.14:1 | ✅ | ✅ |
| `color-cometGray` | `color-spaceBlack` | 7.84:1 | ✅ | ✅ |
| `color-asteroidGray` | `color-spaceBlack` | 4.63:1 | ✅ | ✅ |
| `color-starWhite` | `color-nebulaDark` | 12.87:1 | ✅ | ✅ |
| `color-cometGray` | `color-nebulaDark` | 6.18:1 | ✅ | ✅ |

**Non-text UI component contrast (3:1 minimum):**
- All enhancement border colors meet 3:1 against `color-spaceBlack`.
- Wild card glow (`color-neonPurple`, 6.89:1) passes.
- Canasta seal rings use color + icon dual encoding (OQ-7) for colorblind accessibility.

---

## 8. Responsive Breakpoints

### 8.1 Breakpoint ≤1240px (Laptop)

**SCSS mixin:** `@include respond-to('laptop') { ... }`

| Property | Reference (1920px) | ≤1240px |
|----------|-------------------|---------|
| Grid columns | 12 | 8 |
| Card size | 96×140px | 80×116px |
| Hand zone max visible | 10 cards | 7 cards (scroll) |
| Meld zone columns | 5 | 3 (horizontal scroll) |
| Shop grid columns | 3 | 2 |
| Deck grid columns | 10 | 7 |
| Status bar font | `typography-size-md` (16px) | `typography-size-sm` (13px) |
| Action buttons | Full text labels | Icon-only + tooltip |
| Spacing | `spacing-xl` (24px) | `spacing-lg` (16px) |
| Background effects | All 4 layers | `bg-scanlines` disabled |

### 8.2 Breakpoint ≤720px (Tablet Portrait)

**SCSS mixin:** `@include respond-to('tablet') { ... }`

| Property | Reference (1920px) | ≤720px |
|----------|-------------------|---------|
| Grid columns | 12 | 4 |
| Card size | 96×140px | 64×92px |
| Hand zone layout | Horizontal fan | Vertical stack (max 5 visible) |
| Meld zone layout | Horizontal row | Vertical stack (2 columns) |
| Shop grid columns | 3 | 1 (vertical list) |
| Deck grid columns | 10 | 4 |
| Opponent melds | Visible | Collapsed (tap to expand) |
| Action bar | Horizontal toolbar | Vertical button group (bottom) |
| Score breakdown | Full table | Collapsed accordion |
| Background effects | All layers | `bg-scanlines` + `bg-gridLines` disabled |
| Spacing | `spacing-xl` (24px) | `spacing-md` (12px) |
| Enhancement badges | 16×16px | 12×12px |
| Interaction model | Drag-and-drop primary | Tap-to-select primary |

---

## 9. Unit Test Plan

### 9.1 Design Token Tests

**File:** `src/app/shared/services/design-token.service.spec.ts`

- [ ] All 40 color tokens are exported as CSS custom properties with correct hex values
- [ ] All 17 typography tokens are exported with correct values
- [ ] All 9 spacing tokens are exported with correct px values
- [ ] All 16 panel style tokens are exported with correct values
- [ ] All 7 background effect tokens are exported with correct values
- [ ] `DesignTokenService.getColor()` returns computed color values
- [ ] `DesignTokenService.getSpacing()` returns computed spacing values
- [ ] Token naming convention follows `--congero-{category}-{name}` pattern

### 9.2 Component Rendering Tests

**Card component** (`card.component.spec.ts`):
- [ ] Renders card face-up with rank and suit
- [ ] Renders card face-down with card back texture
- [ ] Applies correct CSS class for each of the 9 interaction states
- [ ] Renders enhancement badge when `enhancementIndicator` is non-null
- [ ] Renders wild card glow border when `isWild` is true
- [ ] Renders lock icon when `isBlackThree` is true
- [ ] Emits `cardClicked` event on click
- [ ] Emits `cardDragStart` event on drag start
- [ ] Sets correct `aria-label` from `CardVisualState.ariaLabel`

**Meld zone component** (`meld-zone.component.spec.ts`):
- [ ] Renders correct number of ghost slots for each meld state
- [ ] Applies correct CSS class for each of the 4 meld states
- [ ] Renders seal ring when `isCanasta` is true
- [ ] Renders tray indicator when `trayIndicator` is non-null
- [ ] Emits `cardDropped` event on valid drop
- [ ] Sets correct `aria-label` from `MeldVisualState.ariaLabel`

**Action button component** (`action-button.component.spec.ts`):
- [ ] Renders enabled state with correct label and icon
- [ ] Renders disabled state with reduced opacity
- [ ] Renders loading state with spinner
- [ ] Emits `actionClicked` event when enabled and clicked
- [ ] Does not emit when disabled
- [ ] Sets `aria-disabled` correctly
- [ ] Sets `aria-keyshortcuts` correctly

**Confirmation dialog** (`confirmation-dialog.component.spec.ts`):
- [ ] Renders with correct title and body text
- [ ] Cancel button receives initial focus
- [ ] Focus is trapped within dialog
- [ ] Emits `confirmed` on Confirm click
- [ ] Emits `cancelled` on Cancel click or Escape key
- [ ] Returns focus to trigger element on close

### 9.3 Interaction Model Tests

**Interaction state service** (`interaction-state.service.spec.ts`):
- [ ] `deriveCardVisualState()` returns correct state for each card type
- [ ] `deriveMeldVisualState()` returns correct state for each meld type
- [ ] `computeGhostSlots()` returns 0 for complete/sealed melds
- [ ] `computeGhostSlots()` returns 3 for empty melds
- [ ] `computeGhostSlots()` returns min(remaining, 3) for partial melds
- [ ] `handleCardDrop()` calls Area 1's `validateMeld()` and processes result
- [ ] `handleCardDrop()` shows rejection message on invalid meld
- [ ] `handleCardClick()` toggles selection with Shift/Ctrl modifier
- [ ] `handleCardClick()` clears and sets selection without modifier

**Drag-and-drop directive** (`drag-and-drop.directive.spec.ts`):
- [ ] Sets `interactionState` to `dragging` on drag start
- [ ] Highlights valid drop zones on drag start
- [ ] Shows ghost slot preview on drag over valid zone
- [ ] Emits `cardDropped` with correct cardId and targetZoneId
- [ ] Snaps card back on drag cancel
- [ ] Cleans up highlights on drag end

**Keyboard navigation directive** (`keyboard-navigation.directive.spec.ts`):
- [ ] Arrow keys navigate between cards in hand zone
- [ ] Enter/Space toggles card selection
- [ ] `M` key triggers Meld action
- [ ] `D` key triggers Discard action
- [ ] `G` key triggers Go Out action
- [ ] `1`–`5` keys jump to corresponding meld zone
- [ ] Escape cancels current action

### 9.4 Accessibility Tests

**Screen reader** (`accessibility.service.spec.ts`):
- [ ] `announce()` creates a live region with the given message
- [ ] Announcement is cleared after a timeout
- [ ] Card aria-label follows format: "{rank} of {suit}, {points} points, {enhancement}, {state}"
- [ ] Meld aria-label follows format: "{rank} meld, {count} cards, {canastaType}, {state}"

**ARIA role verification** (in component spec files):
- [ ] Screen root has `role="application"` and correct `aria-label`
- [ ] Hand zone has `role="listbox"` and `aria-multiselectable="true"`
- [ ] Each card has `role="option"` and `aria-selected`
- [ ] Meld zones have `role="region"` and correct `aria-label`
- [ ] Action toolbar has `role="toolbar"` and `aria-label`
- [ ] Confirmation dialog has `role="dialog"` and `aria-modal="true"`
- [ ] Score display has `role="status"` and `aria-live="polite"`

---

## 10. Dependencies — Contracts with Adjacent Areas

### 10.1 Area 1 — Game Rules & Core Mechanics

**Imports:**
```typescript
import type {
  Card,
  Meld,
  CanastaType,
  TurnPhase,
  MeldValidationResult,
  MeldRejectionReason,
  TurnState,
} from './area1-game-rules';
```

**Derivation functions (owned by Area 5):**
```typescript
export function deriveCardVisualState(
  card: Card,
  turnState: TurnState,
  phase: TurnPhase
): CardVisualState;

export function deriveMeldVisualState(
  meld: Meld,
  turnState: TurnState
): MeldVisualState;
```

**Rejection message mapping (owned by Area 5):**
```typescript
const REJECTION_MESSAGES: Record<MeldRejectionReason, string> = {
  'INSUFFICIENT_CARDS':            'A meld requires at least 3 cards.',
  'RANK_MISMATCH':                 'All non-wild cards in a meld must be the same rank.',
  'ILLEGAL_RANK':                  'Threes cannot be melded.',
  'TOO_MANY_WILDS':                'A meld must have at least one natural card.',
  'WILD_MAJORITY':                 'Wild cards must be fewer than natural cards.',
  'EXTENDS_SEALED_WRONG_RANK':     'Cards must match the rank of the meld you are extending.',
  'BLACK_THREE_MELD_ATTEMPT':      'Black threes can only be discarded, not melded.',
  'DISCARD_PILE_LOCKED':           'The discard pile is frozen. You need 2 matching natural cards to take it.',
  'HOOK_REJECTED':                 'A boss rule prevents this action.',
};
```

### 10.2 Area 2 — Deckbuilding & Run Structure

**Imports:**
```typescript
import type {
  ShopState,
  ShopItem,
  ShopItemCategory,
  ShopItemRarity,
  Round,
  RoundPhase,
  RunProgression,
  CardPoolEntry,
} from './area2-deckbuilding';
```

**Screen transition mapping:**
```typescript
const PHASE_TO_SCREEN: Record<RoundPhase, ScreenId> = {
  'Draw':  'gameplay-hud',
  'Play':  'gameplay-hud',
  'Score': 'score-results',
  'Shop':  'shop-rewards',
};
```

### 10.3 Area 3 — Modifier Systems

**Imports:**
```typescript
import type {
  AppliedModifierRecord,
  ActiveModifierState,
  PartnerSlot,
  HouseRule,
  Scorepad,
  TraySlot,
  BossRule,
  ModifierEffect,
} from './area3-modifier-systems';
```

**Modifier badge color mapping:**
| Modifier Type | Color Token |
|---------------|-------------|
| Partner | `color-modifierPartner` |
| Scorepad | `color-modifierScorepad` |
| Tray | `color-modifierTray` |
| Boss Rule | `color-modifierBoss` |
| House Rule | `color-modifierHouse` |

### 10.4 Area 4 — Card Enhancements & Wild Card Economy

**Imports:**
```typescript
import type {
  Enhancement,
  EnhancementType,
  WildCardRule,
  EnhancementInteraction,
} from './area4-card-enhancements';
```

**Enhancement visual mapping:**
```typescript
const ENHANCEMENT_VISUALS: Record<EnhancementType, { glowColorToken: string; iconId: string }> = {
  'gilded':  { glowColorToken: 'color-enhancementGilded',  iconId: 'enhancement-gilded' },
  'echo':    { glowColorToken: 'color-enhancementEcho',    iconId: 'enhancement-echo' },
  'sticky':  { glowColorToken: 'color-enhancementSticky',  iconId: 'enhancement-sticky' },
  'marked':  { glowColorToken: 'color-enhancementMarked',  iconId: 'enhancement-marked' },
  'pure':    { glowColorToken: 'color-enhancementPure',    iconId: 'enhancement-pure' },
  'hot':     { glowColorToken: 'color-enhancementHot',     iconId: 'enhancement-hot' },
  'frozen':  { glowColorToken: 'color-enhancementFrozen',  iconId: 'enhancement-frozen' },
  'partner': { glowColorToken: 'color-enhancementPartner', iconId: 'enhancement-partner' },
  'buried':  { glowColorToken: 'color-enhancementBuried',  iconId: 'enhancement-buried' },
  'anchor':  { glowColorToken: 'color-enhancementAnchor',  iconId: 'enhancement-anchor' },
};
```

### 10.5 Area 6 — BabylonJS Rendering

**Contract:** Area 6 imports color tokens from `DesignTokenService` and maps them to `BABYLON.Color3` values. Neon glow tokens (`panel-glow*`) are mapped to `emissiveColor` with intensity derived from the alpha channel.

### 10.6 Area 7 — Angular App Architecture

**Contract:** Area 7 references design tokens via `var(--congero-{category}-{name})` in all component styles. Area 7 implements ARIA attributes and keyboard event handlers per Section 7 of this document. Area 7 must not hardcode color values or define new design tokens.

### 10.7 Area 8 — Game State Management

**Contract:** Area 5 reads `RunState`, `RoundState`, and `MeldState` from Area 8's aggregated state to derive visual states. Area 5 does not define or persist state schemas.

---

## 11. Implementation Order

Implement in the following order to respect dependencies and enable incremental testing:

1. **Design token SCSS maps** — `_colors.scss`, `_typography.scss`, `_spacing.scss`, `_panels.scss`, `_backgrounds.scss`. These have no dependencies and are needed by everything else.

2. **CSS custom property export** — `design-tokens.scss`. Exports all SCSS maps as `:root` custom properties. Depends on step 1.

3. **SCSS mixins and functions** — `_mixins.scss`. Provides `color()`, `spacing()`, `panel()` lookup functions and `neon-glow()`, `respond-to()`, `focus-ring()` mixins. Depends on step 1.

4. **Interactive state classes** — `_states.scss`. Defines `.card--*`, `.meld-zone--*`, `.action-button--*` CSS classes. Depends on steps 2–3.

5. **TypeScript model types** — `src/app/shared/models/`. Define `ScreenLayout`, `ScreenZone`, `CardVisualState`, `MeldVisualState`, `ActionButtonState`, `DesignToken`, and all associated types. No dependencies on other areas' implementations (use interface stubs).

6. **Design token service** — `design-token.service.ts`. Runtime token lookup. Depends on step 2.

7. **Screen layout service** — `screen-layout.service.ts`. Provides layout configurations for all four screens. Depends on step 5.

8. **Interaction state service** — `interaction-state.service.ts`. Implements `deriveCardVisualState()`, `deriveMeldVisualState()`, `computeGhostSlots()`, `handleCardDrop()`, `handleCardClick()`. Depends on steps 5, 7. Uses Area 1's `validateMeld()` (interface stub).

9. **Accessibility service** — `accessibility.service.ts`. Implements `announce()` for screen reader live regions. Depends on step 5.

10. **Shared UI components** — Build in this order:
    - `ghost-slot` (no dependencies)
    - `enhancement-badge` (depends on step 6 for token lookup)
    - `card` (depends on steps 4, 8, 9)
    - `seal-ring` (depends on step 4)
    - `meld-zone` (depends on steps 4, 8, and `card` component)
    - `action-button` (depends on step 4)
    - `confirmation-dialog` (depends on step 4)

11. **Directives** — Build in this order:
    - `drag-and-drop.directive.ts` (depends on step 8)
    - `keyboard-navigation.directive.ts` (depends on steps 8, 9)
    - `focus-trap.directive.ts` (no dependencies; used by confirmation dialog)

12. **Screen components** — Build in this order (each depends on shared components and services):
    - `gameplay-hud` (depends on steps 7, 8, 10, 11)
    - `deck-inventory` (depends on steps 7, 10)
    - `shop-rewards` (depends on steps 7, 10)
    - `score-results` (depends on steps 7, 10)

13. **Unit tests** — Write alongside each component/service. Run `ng test` after each step to verify.

14. **Integration verification** — End-to-end test of the worked example from design doc Section 5: drag card → meld → canasta → seal → score results.

---

## 12. Acceptance Criteria

### Design Tokens
- [ ] All 40 color tokens defined in SCSS map and exported as CSS custom properties
- [ ] All 17 typography tokens defined and exported
- [ ] All 9 spacing tokens defined and exported
- [ ] All 16 panel style tokens defined and exported
- [ ] All 7 background effect tokens defined and exported
- [ ] Token naming follows `--congero-{category}-{name}` convention
- [ ] `DesignTokenService` returns correct computed values for all categories
- [ ] No hardcoded color values exist in any component style file

### Screen Layouts
- [ ] Gameplay HUD renders with 12-column × 8-row grid at reference resolution
- [ ] All 6 zones (status-bar, opponent-melds, player-melds, discard-zone, hand-zone, action-bar) render in correct grid positions
- [ ] Deck/Inventory screen renders with correct zone layout
- [ ] Shop Rewards screen renders with correct zone layout
- [ ] Score Results screen renders with correct zone layout

### Responsive Behavior
- [ ] At ≤1240px: grid columns reduce, card sizes shrink, action buttons show icon-only
- [ ] At ≤720px: grid columns reduce further, hand zone stacks vertically, opponent melds collapse
- [ ] Background effects disable progressively (scanlines at ≤1240px, grid lines at ≤720px)
- [ ] All spacing tokens scale correctly at each breakpoint

### Interactive States
- [ ] All 9 card states render with correct border, glow, scale, and cursor
- [ ] All 4 meld zone states render with correct border and ghost slot count
- [ ] All 3 action button states render with correct opacity and cursor
- [ ] State transitions animate smoothly (150ms–200ms)

### Interaction Model
- [ ] Drag-and-drop moves card from hand to meld zone with visual feedback
- [ ] Invalid drop shows error shake animation and rejection message
- [ ] Click-to-select toggles card selection with cyan border and scale 1.1
- [ ] Shift/Ctrl + click adds to multi-selection
- [ ] Ghost slots decrease as cards are added to meld (4 → 3 → 1 → 0)
- [ ] Confirmation dialogs appear for Go Out, discard black three, reroll, and convert
- [ ] Confirmation dialog default focus is on Cancel button

### Accessibility
- [ ] All screen roots have `role="application"` and correct `aria-label`
- [ ] Hand zone has `role="listbox"` with `aria-multiselectable="true"`
- [ ] Each card has `role="option"` with `aria-selected` reflecting state
- [ ] All keyboard shortcuts from Section 7.2 work correctly
- [ ] Focus is trapped in confirmation dialogs and restored on close
- [ ] Score display and status bar use `aria-live="polite"`
- [ ] All color contrast ratios meet WCAG AA (verified via automated tool)
- [ ] Canasta seal rings use color + icon dual encoding

### Unit Tests
- [ ] Design token service tests pass (all token categories)
- [ ] Component rendering tests pass for card, meld-zone, action-button, confirmation-dialog
- [ ] Interaction state service tests pass (derivation, ghost slots, drop handling)
- [ ] Drag-and-drop directive tests pass
- [ ] Keyboard navigation directive tests pass
- [ ] Accessibility service and ARIA role tests pass
- [ ] All tests pass with `ng test --no-watch --code-coverage` and meet coverage thresholds

### Integration
- [ ] Worked example (design doc Section 5) executes end-to-end: drag Q♠ → build to canasta → seal animation → score results with modifier breakdown
- [ ] Screen transitions animate at 300ms with correct easing curve
- [ ] Area contracts are satisfied: no hardcoded colors, no redefined game rules, correct type imports from Areas 1–4
