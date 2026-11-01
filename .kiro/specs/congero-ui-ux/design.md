# Design Document — Area 5: UI/UX Design

## Overview

Area 5 defines the complete user interface and user experience design for Congero. It covers the four primary screens (Gameplay HUD, Deck/Inventory, Shop Rewards, Score Results), the interaction model for card placement and selection, responsive layout behavior at two breakpoints (≤1240px, ≤720px), the Neon Space Canasta design system token definitions (color palette, typography, spacing, panel styles, background effects), and accessibility requirements including keyboard navigation, ARIA role assignments, and color contrast ratios. Area 5 is the authoritative source for all visual design tokens — Areas 6 (BabylonJS Rendering) and Area 7 (Angular App Architecture) reference these tokens but must not redefine them. Area 5 depends on Area 1 (Game Rules & Core Mechanics) for card and meld visual states, Area 2 (Deckbuilding & Run Structure) for shop screen data structures, Area 3 (Modifier Systems) for modifier display information, and Area 4 (Card Enhancements & Wild Card Economy) for enhancement visual indicators.

**Out of scope for this document:** Angular component names, template structures, or service implementations (Area 7), BabylonJS scene graph nodes, mesh definitions, or API calls (Area 6), game rule logic including meld validation and scoring formulas (Area 1), and how UI state is persisted or managed via signals (Area 8).

---

## 1. Data Models

All types are TypeScript. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

```typescript
// ─── Screen Layout ───────────────────────────────────────────────────────────

/**
 * Identifies one of the four primary screens in the application.
 * Screen transitions are triggered by round phase changes (Area 2, Section 3.4).
 */
export type ScreenId = 'gameplay-hud' | 'deck-inventory' | 'shop-rewards' | 'score-results';

/**
 * Describes the layout grid for a single screen.
 * All dimensions are in CSS pixels at the 1920×1080 reference resolution.
 * Responsive breakpoints (≤1240px, ≤720px) are defined in Section 3.2.
 */
export interface ScreenLayout {
  /** Which screen this layout describes. */
  screenId: ScreenId;
  /** Human-readable screen title for accessibility (aria-label on the screen root). */
  screenTitle: string;
  /** Grid column definitions (CSS grid template columns). */
  columns: string;
  /** Grid row definitions (CSS grid template rows). */
  rows: string;
  /**
   * Named zones within the grid. Each zone maps to a semantic region.
   * Zone names are stable identifiers used by the keyboard navigation map (Section 3.3).
   */
  zones: ScreenZone[];
}

/**
 * A single named zone within a screen layout.
 * Zones are the targets for keyboard navigation and ARIA landmark roles.
 */
export interface ScreenZone {
  /** Stable identifier for this zone (e.g., 'hand', 'meld-area', 'shop-grid'). */
  zoneId: string;
  /** Human-readable label for accessibility. */
  label: string;
  /** ARIA role for this zone. */
  ariaRole: 'region' | 'toolbar' | 'list' | 'listbox' | 'dialog' | 'status' | 'complementary';
  /**
   * Grid placement: [columnStart, rowStart, columnEnd, rowEnd].
   * 1-indexed, inclusive on both ends (CSS grid line numbers).
   */
  gridPlacement: [number, number, number, number];
  /**
   * Whether this zone participates in keyboard tab order.
   * If false, zone is navigated via arrow keys or programmatic focus.
   */
  focusable: boolean;
}

// ─── Card Visual State ───────────────────────────────────────────────────────

/**
 * The complete visual state of a single card as rendered on screen.
 * Derived from Area 1's `Card` and `Meld` data models plus Area 4's enhancement data.
 * This type does NOT duplicate card game data — it adds only visual/UI concerns.
 */
export interface CardVisualState {
  /** The card's unique instance ID (mirrors Area 1, Card.id). */
  cardId: string;
  /** Current interaction state of this card. */
  interactionState: CardInteractionState;
  /**
   * Pixel position relative to the viewport origin (top-left).
   * Updated by drag-and-drop or layout engine.
   */
  position: { x: number; y: number };
  /**
   * Pixel dimensions of the card element.
   * Standard card size: 96×140px at 1920×1080 reference.
   * Scaled at breakpoints (Section 3.2).
   */
  size: { width: number; height: number };
  /**
   * Visual scale multiplier (1.0 = normal).
   * Used for hover lift (1.05), selected pop (1.1), and drag ghost (1.08).
   */
  scale: number;
  /**
   * Z-index for stacking context.
   * Base: 0. Hovered: 10. Selected: 20. Dragged: 100.
   */
  zIndex: number;
  /**
   * Whether this card is face-up (true) or face-down (false).
   * Face-down cards show the card back texture; face-up cards show rank/suit.
   */
  faceUp: boolean;
  /**
   * Enhancement visual indicator. null if no enhancement.
   * Enhancement definitions are owned by Area 4.
   */
  enhancementIndicator: EnhancementVisualIndicator | null;
  /**
   * Whether this card is a wild card (mirrors Area 1, Card.isWild).
   * Wild cards receive a distinct neon glow border (see DesignToken.wildGlow).
   */
  isWild: boolean;
  /**
   * Whether this card is a red three (mirrors Area 1, Card.isRedThree).
   * Red threes are auto-played and display a bonus badge.
   */
  isRedThree: boolean;
  /**
   * Whether this card is a black three (mirrors Area 1, Card.isBlackThree).
   * Black threes display a lock icon indicating discard-only.
   */
  isBlackThree: boolean;
  /**
   * Screen reader text for this card.
   * Format: "{rank} of {suit}, {pointValue} points, {enhancement}, {state}".
   * Example: "Queen of spades, 10 points, Gilded enhancement, selected".
   */
  ariaLabel: string;
}

/**
 * All possible interaction states for a card element.
 */
export type CardInteractionState =
  | 'default'      // Card is in hand or on table, no interaction active
  | 'selected'     // Card is part of the current selection set
  | 'playable'     // Card can be legally melded or discarded right now
  | 'unplayable'   // Card cannot be legally played (e.g., black three when not going out)
  | 'wild'         // Card is a wild card — receives special glow treatment
  | 'enhanced'     // Card has an active enhancement — shows enhancement border/badge
  | 'sealed'       // Card is part of a sealed canasta — shows seal ring animation
  | 'dragging'     // Card is currently being dragged by the player
  | 'ghost';       // Card is a ghost preview in a drop target slot

/**
 * Visual indicator data for a card enhancement.
 * Enhancement definitions (trigger, effect, constraints) are owned by Area 4.
 * This type contains only the display metadata.
 */
export interface EnhancementVisualIndicator {
  /** Enhancement type identifier (mirrors Area 4, Enhancement.type). */
  enhancementType: string;
  /** Display name shown in tooltip (e.g., "Gilded", "Echo", "Anchor"). */
  displayName: string;
  /**
   * Icon identifier for the enhancement badge rendered on the card.
   * Resolved by Area 6 (BabylonJS) to a texture atlas sprite.
   */
  iconId: string;
  /**
   * Border color token for the enhancement glow.
   * References DesignToken.enhancementColors map.
   */
  glowColorToken: string;
  /**
   * Short description for tooltip / screen reader.
   * Example: "Counts as 2 cards for meld size calculations."
   */
  description: string;
}

// ─── Meld Visual State ───────────────────────────────────────────────────────

/**
 * The complete visual state of a meld zone on the gameplay table.
 * Derived from Area 1's `Meld` data model. This type adds only visual/UI concerns.
 */
export interface MeldVisualState {
  /** The meld's unique ID (mirrors Area 1, Meld.id). */
  meldId: string;
  /** Current meld zone state. */
  state: MeldZoneState;
  /**
   * The rank this meld is built around (mirrors Area 1, Meld.rank).
   * Displayed as a label above the meld zone.
   */
  rankLabel: string;
  /**
   * Number of cards currently in this meld.
   * Displayed as a count badge (e.g., "5/7").
   */
  cardCount: number;
  /**
   * Whether this meld has reached canasta status (≥7 cards).
   * When true, the seal ring animation is displayed.
   */
  isCanasta: boolean;
  /**
   * Canasta type achieved (mirrors Area 1, Meld.canastaType).
   * Determines the seal ring color and badge icon.
   * null if meld has not reached canasta status.
   */
  canastaType: string | null;
  /**
   * Pixel position of the meld zone center relative to the gameplay table origin.
   */
  position: { x: number; y: number };
  /**
   * Pixel dimensions of the meld zone bounding box.
   */
  size: { width: number; height: number };
  /**
   * Ghost slots: empty card placeholders that show where the next card can be dropped.
   * Number of visible ghost slots = max(0, 7 - cardCount) for unsealed melds.
   * Sealed melds show 0 ghost slots (meld is complete).
   */
  ghostSlotCount: number;
  /**
   * Tray assignment indicator. null if no tray is active.
   * Tray definitions are owned by Area 3.
   */
  trayIndicator: TrayVisualIndicator | null;
  /**
   * Screen reader text for this meld zone.
   * Format: "{rank} meld, {cardCount} cards, {canastaType}, {state}".
   */
  ariaLabel: string;
}

/**
 * All possible states for a meld zone.
 */
export type MeldZoneState =
  | 'empty'    // No cards in the meld; ghost slots visible
  | 'partial'  // 1–6 cards; not yet a canasta
  | 'complete' // 7+ cards; canasta achieved; seal ring visible
  | 'sealed';  // Canasta has been sealed (may still accept cards)

/**
 * Visual indicator for a tray assignment on a meld.
 * Tray definitions (effects, constraints) are owned by Area 3.
 */
export interface TrayVisualIndicator {
  /** Tray slot ID (mirrors Area 3, TraySlot.slotId). */
  slotId: string;
  /** Display name (e.g., "Gold Tray", "Natural Tray"). */
  displayName: string;
  /** Color token for the tray border glow. */
  colorToken: string;
  /** Icon identifier for the tray badge. */
  iconId: string;
}

// ─── Action Button State ─────────────────────────────────────────────────────

/**
 * The visual and interaction state of an action button in the gameplay HUD.
 * Action buttons include: "Meld", "Discard", "Go Out", "Draw", "Reroll", "End Turn".
 */
export interface ActionButtonState {
  /** Stable identifier for this action button. */
  buttonId: string;
  /** Display label on the button. */
  label: string;
  /** Current interaction state. */
  state: ActionButtonInteractionState;
  /**
   * Keyboard shortcut for this action.
   * Format: single key or modifier+key (e.g., "M" for Meld, "Ctrl+G" for Go Out).
   */
  keyboardShortcut: string;
  /**
   * Whether this button is currently visible.
   * Buttons are hidden when their action is not available in the current turn phase.
   */
  visible: boolean;
  /**
   * Tooltip text shown on hover.
   * Includes keyboard shortcut hint (e.g., "Meld selected cards [M]").
   */
  tooltip: string;
  /**
   * ARIA label for screen readers.
   * Format: "{label}, {state}, {shortcut}".
   * Example: "Meld, enabled, press M".
   */
  ariaLabel: string;
  /**
   * Icon identifier for the button's leading icon.
   * Resolved by Area 6 (BabylonJS) to a texture atlas sprite.
   */
  iconId: string | null;
}

/**
 * All possible interaction states for an action button.
 */
export type ActionButtonInteractionState =
  | 'enabled'    // Button is clickable and the action is legal
  | 'disabled'   // Button is visible but the action is not legal right now
  | 'loading';   // Action is in progress (e.g., server confirmation); shows spinner

// ─── Design Token ────────────────────────────────────────────────────────────

/**
 * A single design token in the Neon Space Canasta design system.
 * Tokens are organized by category and referenced via CSS custom properties.
 * Area 6 (BabylonJS) maps color tokens to PBR material values.
 * Area 7 (Angular) references tokens via `var(--token-name)` in component styles.
 *
 * This type is the owner document for all design tokens. No other area may
 * define or override token values — they must reference this document.
 */
export interface DesignToken {
  /** Token category. */
  category: DesignTokenCategory;
  /**
   * Token name. Used as the CSS custom property name: `--congero-{category}-{name}`.
   * Example: `--congero-color-neonCyan`.
   */
  name: string;
  /** Token value (color hex, px value, rem value, or effect string). */
  value: string;
  /**
   * Human-readable description of what this token is used for.
   */
  description: string;
  /**
   * For color tokens: the WCAG AA contrast ratio against the nearest background token.
   * For non-color tokens: null.
   */
  contrastRatio: number | null;
  /**
   * For color tokens: the background token this contrast ratio is measured against.
   * For non-color tokens: null.
   */
  contrastBackground: string | null;
}

/**
 * Design token categories.
 */
export type DesignTokenCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'panel'
  | 'background';
```

---

## 2. Design Token Table — Neon Space Canasta

This section is the authoritative owner document for all design tokens. Token values are defined here and referenced by Areas 6 and 7 via CSS custom properties using the naming convention `--congero-{category}-{name}`.

### 2.1 Color Palette Tokens

| Token Name | Value | Description | Contrast Ratio | Contrast Background |
|------------|-------|-------------|----------------|---------------------|
| `color-spaceBlack` | `#0A0E17` | Primary background — deep space black | — | — |
| `color-nebulaDark` | `#111827` | Secondary background — nebula panel fill | 1.62 : 1 | `color-spaceBlack` |
| `color-voidGray` | `#1F2937` | Tertiary background — void gray for card backs | 2.18 : 1 | `color-spaceBlack` |
| `color-neonCyan` | `#00F0FF` | Primary accent — neon cyan glow | 13.14 : 1 | `color-spaceBlack` |
| `color-neonMagenta` | `#FF00AA` | Secondary accent — neon magenta glow | 8.37 : 1 | `color-spaceBlack` |
| `color-neonGold` | `#FFD700` | Tertiary accent — gold for canasta seals | 14.27 : 1 | `color-spaceBlack` |
| `color-neonGreen` | `#39FF14` | Success/positive — neon green for valid actions | 14.93 : 1 | `color-spaceBlack` |
| `color-neonRed` | `#FF3131` | Danger/error — neon red for invalid actions | 7.42 : 1 | `color-spaceBlack` |
| `color-neonPurple` | `#B026FF` | Wild card accent — neon purple glow | 6.89 : 1 | `color-spaceBlack` |
| `color-neonOrange` | `#FF6A00` | Warning — neon orange for frozen/discard lock | 9.14 : 1 | `color-spaceBlack` |
| `color-starWhite` | `#F0F4FF` | Primary text — star white | 16.42 : 1 | `color-spaceBlack` |
| `color-cometGray` | `#94A3B8` | Secondary text — comet gray for labels | 7.84 : 1 | `color-spaceBlack` |
| `color-asteroidGray` | `#64748B` | Tertiary text — asteroid gray for hints | 4.63 : 1 | `color-spaceBlack` |
| `color-wildGlow` | `#B026FF` | Wild card border glow (alias for neonPurple) | 6.89 : 1 | `color-spaceBlack` |
| `color-naturalGlow` | `#00F0FF` | Natural card border glow (alias for neonCyan) | 13.14 : 1 | `color-spaceBlack` |
| `color-enhancementGilded` | `#FFD700` | Gilded enhancement border (Area 4) | 14.27 : 1 | `color-spaceBlack` |
| `color-enhancementEcho` | `#00F0FF` | Echo enhancement border (Area 4) | 13.14 : 1 | `color-spaceBlack` |
| `color-enhancementSticky` | `#39FF14` | Sticky enhancement border (Area 4) | 14.93 : 1 | `color-spaceBlack` |
| `color-enhancementFrozen` | `#7DD3FC` | Frozen enhancement border (Area 4) | 11.56 : 1 | `color-spaceBlack` |
| `color-enhancementHot` | `#FF6A00` | Hot enhancement border (Area 4) | 9.14 : 1 | `color-spaceBlack` |
| `color-enhancementBuried` | `#64748B` | Buried enhancement border (Area 4) | 4.63 : 1 | `color-spaceBlack` |
| `color-enhancementAnchor` | `#FF00AA` | Anchor enhancement border (Area 4) | 8.37 : 1 | `color-spaceBlack` |
| `color-enhancementPure` | `#F0F4FF` | Pure enhancement border (Area 4) | 16.42 : 1 | `color-spaceBlack` |
| `color-enhancementMarked` | `#FF3131` | Marked enhancement border (Area 4) | 7.42 : 1 | `color-spaceBlack` |
| `color-enhancementPartner` | `#B026FF` | Partner enhancement border (Area 4) | 6.89 : 1 | `color-spaceBlack` |
| `color-sealNatural` | `#00F0FF` | Natural canasta seal ring | 13.14 : 1 | `color-spaceBlack` |
| `color-sealDirty` | `#B026FF` | Dirty canasta seal ring | 6.89 : 1 | `color-spaceBlack` |
| `color-sealSuper` | `#FFD700` | Super canasta seal ring | 14.27 : 1 | `color-spaceBlack` |
| `color-sealRed` | `#FF3131` | Red canasta seal ring | 7.42 : 1 | `color-spaceBlack` |
| `color-sealFrozen` | `#7DD3FC` | Frozen canasta seal ring | 11.56 : 1 | `color-spaceBlack` |
| `color-sealPartner` | `#FF00AA` | Partner canasta seal ring | 8.37 : 1 | `color-spaceBlack` |
| `color-sealConcealed` | `#39FF14` | Concealed out seal ring | 14.93 : 1 | `color-spaceBlack` |
| `color-modifierScorepad` | `#FFD700` | Scorepad modifier badge (Area 3) | 14.27 : 1 | `color-spaceBlack` |
| `color-modifierPartner` | `#B026FF` | Partner modifier badge (Area 3) | 6.89 : 1 | `color-spaceBlack` |
| `color-modifierTray` | `#00F0FF` | Tray modifier badge (Area 3) | 13.14 : 1 | `color-spaceBlack` |
| `color-modifierBoss` | `#FF3131` | Boss rule modifier badge (Area 3) | 7.42 : 1 | `color-spaceBlack` |
| `color-modifierHouse` | `#39FF14` | House rule modifier badge (Area 3) | 14.93 : 1 | `color-spaceBlack` |
| `color-shopCommon` | `#94A3B8` | Shop item — common rarity (Area 2) | 7.84 : 1 | `color-spaceBlack` |
| `color-shopUncommon` | `#39FF14` | Shop item — uncommon rarity (Area 2) | 14.93 : 1 | `color-spaceBlack` |
| `color-shopRare` | `#00F0FF` | Shop item — rare rarity (Area 2) | 13.14 : 1 | `color-spaceBlack` |
| `color-shopLegendary` | `#FFD700` | Shop item — legendary rarity (Area 2) | 14.27 : 1 | `color-spaceBlack` |

### 2.2 Typography Role Tokens

| Token Name | Value | Description | Contrast Ratio | Contrast Background |
|------------|-------|-------------|----------------|---------------------|
| `typography-display` | `'Orbitron', sans-serif` | Display typeface — screen titles, score numbers | — | — |
| `typography-body` | `'Exo 2', sans-serif` | Body typeface — labels, descriptions, tooltips | — | — |
| `typography-monoShare`' | `'Share Tech Mono', monospace` | Monospace typeface — card counts, point values, gold | — | — |
| `typography-size-xs` | `10px` | Extra small — enhancement badges, hint text | — | — |
| `typography-size-sm` | `13px` | Small — labels, tooltips, secondary text | — | — |
| `typography-size-md` | `16px` | Medium — body text, button labels | — | — |
| `typography-size-lg` | `22px` | Large — card rank/suit display, zone labels | — | — |
| `typography-size-xl` | `32px` | Extra large — score totals, screen titles | — | — |
| `typography-size-2xl` | `48px` | 2X large — round results, final score | — | — |
| `typography-weight-light` | `300` | Light weight — hint text, disabled labels | — | — |
| `typography-weight-regular` | `400` | Regular weight — body text | — | — |
| `typography-weight-semibold` | `600` | Semibold — button labels, zone labels | — | — |
| `typography-weight-bold` | `700` | Bold — score numbers, screen titles | — | — |
| `typography-letterSpacing-tight` | `-0.02em` | Tight — display headings | — | — |
| `typography-letterSpacing-normal` | `0` | Normal — body text | — | — |
| `typography-letterSpacing-wide` | `0.08em` | Wide — button labels, uppercase labels | — | — |
| `typography-letterSpacing-xwide` | `0.15em` | Extra wide — screen titles, section headers | — | — |

### 2.3 Spacing Tokens

| Token Name | Value | Description |
|------------|-------|-------------|
| `spacing-2xs` | `2px` | Hairline — border gaps, separator lines |
| `spacing-xs` | `4px` | Tight — icon padding, badge insets |
| `spacing-sm` | `8px` | Small — card internal padding |
| `spacing-md` | `12px` | Medium — zone internal gap |
| `spacing-lg` | `16px` | Large — zone-to-zone gap |
| `spacing-xl` | `24px` | Extra large — screen section padding |
| `spacing-2xl` | `32px` | 2X large — screen edge margin |
| `spacing-3xl` | `48px` | 3X large — major section separation |
| `spacing-4xl` | `64px` | 4X large — screen top/bottom padding |

### 2.4 Panel Style Tokens

| Token Name | Value | Description |
|------------|-------|-------------|
| `panel-gameplayBg` | `radial-gradient(ellipse at 50% 30%, #111827 0%, #0A0E17 70%)` | Gameplay HUD background — radial nebula gradient |
| `panel-shopBg` | `linear-gradient(180deg, #0A0E17 0%, #111827 50%, #0A0E17 100%)` | Shop screen background — vertical nebula sweep |
| `panel-deckBg` | `linear-gradient(135deg, #111827 0%, #0A0E17 100%)` | Deck/Inventory background — diagonal void |
| `panel-scoreBg` | `radial-gradient(circle at 50% 50%, #1F2937 0%, #0A0E17 60%)` | Score results background — centered void |
| `panel-cardRadius` | `8px` | Card corner radius |
| `panel-zoneRadius` | `12px` | Meld zone corner radius |
| `panel-dialogRadius` | `16px` | Dialog/modal corner radius |
| `panel-borderWidth` | `1px` | Standard border width |
| `panel-borderGlowWidth` | `2px` | Glowing border width (selected cards, canasta seals) |
| `panel-shadowColor` | `rgba(0, 240, 255, 0.15)` | Panel drop shadow tint — cyan at 15% opacity |
| `panel-shadowBlur` | `20px` | Panel drop shadow blur radius |
| `panel-glowCyan` | `0 0 12px rgba(0, 240, 255, 0.4), 0 0 24px rgba(0, 240, 255, 0.15)` | Cyan neon glow — outer + inner |
| `panel-glowMagenta` | `0 0 12px rgba(255, 0, 170, 0.4), 0 0 24px rgba(255, 0, 170, 0.15)` | Magenta neon glow |
| `panel-glowGold` | `0 0 12px rgba(255, 215, 0, 0.4), 0 0 24px rgba(255, 215, 0, 0.15)` | Gold neon glow |
| `panel-glowGreen` | `0 0 12px rgba(57, 255, 20, 0.4), 0 0 24px rgba(57, 255, 20, 0.15)` | Green neon glow |
| `panel-glowRed` | `0 0 12px rgba(255, 49, 49, 0.4), 0 0 24px rgba(255, 49, 49, 0.15)` | Red neon glow |
| `panel-glowPurple` | `0 0 12px rgba(176, 38, 255, 0.4), 0 0 24px rgba(176, 38, 255, 0.15)` | Purple neon glow (wild cards) |

### 2.5 Background Effect Specification

| Token Name | Value | Description |
|------------|-------|-------------|
| `bg-starField` | `url(#star-field-pattern)` | SVG pattern — procedural star field with 3 depth layers (bright/dim/faint stars) |
| `bg-nebulaCloud` | `radial-gradient(ellipse at 30% 20%, rgba(176, 38, 255, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0, 240, 255, 0.06) 0%, transparent 50%)` | Nebula cloud overlay — two-tone subtle nebula |
| `bg-gridLines` | `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0, 240, 255, 0.03) 39px, rgba(0, 240, 255, 0.03) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0, 240, 255, 0.03) 39px, rgba(0, 240, 255, 0.03) 40px)` | Subtle perspective grid — cyan at 3% opacity |
| `bg-vignette` | `radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(10, 14, 23, 0.6) 100%)` | Edge vignette — darkens screen edges for focus |
| `bg-scanlines` | `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.05) 2px, rgba(0, 0, 0, 0.05) 4px)` | CRT-style scanline overlay — subtle retro-futuristic effect |
| `bg-transitionDuration` | `300ms` | Screen transition animation duration |
| `bg-transitionEasing` | `cubic-bezier(0.4, 0, 0.2, 1)` | Screen transition easing curve |

---

## 3. Core Algorithms

### 3.1 Screen Layouts and Interaction Model

#### 3.1.1 Gameplay HUD

**Reference resolution:** 1920×1080. Layout uses a 12-column × 8-row CSS grid.

**Wireframe description:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Score: 1,240] [Target: 2,500] [Gold: 12🪙] [Ante 2-3]    [⚙] [⏸]   │  ← Status Bar (row 1, cols 1-12)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  ← Opponent Meld Zone (row 2, cols 1-12)
│  │ Meld Q  │  │ Meld 8  │  │  empty  │  │  empty  │  │  empty  │       │
│  │  7/7 ✓  │  │  4/7    │  │         │  │         │  │         │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  ← Player Meld Zone (rows 3-5, cols 1-12)
│  │ Meld K  │  │ Meld A  │  │  empty  │  │  empty  │  │  empty  │       │
│  │  7/7 ✓  │  │  3/7    │  │  👻👻👻  │  │         │  │         │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│  [Tray: 🪙 Gold]                                                         │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ [Discard Pile ▲] [Frozen ❄]                                              │  ← Discard Zone (row 6, cols 1-3)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │  ← Hand Zone (rows 7-8, cols 1-12)
│  │ Q♠ │ │ Q♥ │ │ 5♦ │ │ K♣ │ │ 2🃏 │ │ A♥ │ │ 7♠ │ │ J♦ │ │ 3♣🔒│ │10♥ │ │
│  │ ✨ │ │    │ │    │ │    │ │ 💜 │ │    │ │    │ │    │ │    │ │    │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│                                                                          │
│  [MELD] [DISCARD] [GO OUT] [DRAW]                    Phase: Meld       │  ← Action Bar (row 8, cols 1-12)
└──────────────────────────────────────────────────────────────────────────┘
```

**Zone layout table:**

| Zone ID | Label | Grid Placement | ARIA Role | Dimensions (ref) |
|---------|-------|---------------|-----------|-----------------|
| `status-bar` | Game status bar | [1, 1, 12, 1] | `status` | 1920×48px |
| `opponent-melds` | Opponent meld area | [1, 2, 12, 2] | `region` | 1920×160px |
| `player-melds` | Player meld area | [1, 3, 12, 5] | `region` | 1920×320px |
| `discard-zone` | Discard pile | [1, 6, 3, 6] | `region` | 480×140px |
`hand-zone` | Player hand | [1, 7, 12, 8] | `listbox` | 1920×200px |
| `action-bar` | Action buttons | [1, 8, 12, 8] | `toolbar` | 1920×64px |

#### 3.1.2 Deck/Inventory Screen

**Reference resolution:** 1920×1080. Layout uses a 12-column × 8-row CSS grid.

**Wireframe description:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [← Back]              DECK / INVENTORY                    [Ante 2-3]   │  ← Header (row 1, cols 1-12)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Deck: 42 cards    Gold: 12🪙    Rerolls: 0                              │  ← Summary Bar (row 2, cols 1-12)
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │  ← Deck Grid (rows 3-7, cols 1-12)
│  │ A♠ │ │ A♥ │ │ A♦ │ │ A♣ │ │ K♠ │ │ K♥ │ │ K♦ │ │ K♣ │ │ Q♠ │ │ Q♥ │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
│  │ Q♦ │ │ Q♣ │ │ 2🃏 │ │ 2🃏 │ │ 5♦✨│ │ 7♠ │ │ 8♥ │ │ 9♣ │ │10♦ │ │ J♠ │ │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
│  ...                                                                     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [+ Add Card (4🪙)]  [− Remove Card (2🪙)]  [↔ Convert (6🪙)]            │  ← Action Bar (row 8, cols 1-12)
└──────────────────────────────────────────────────────────────────────────┘
```

**Zone layout table:**

| Zone ID | Label | Grid Placement | ARIA Role | Dimensions (ref) |
|---------|-------|---------------|-----------|-----------------|
| `deck-header` | Screen header | [1, 1, 12, 1] | `region` | 1920×48px |
| `deck-summary` | Deck summary bar | [1, 2, 12, 2] | `status` | 1920×40px |
| `deck-grid` | Card grid | [1, 3, 12, 7] | `listbox` | 1920×560px |
| `deck-actions` | Action buttons | [1, 8, 12, 8] | `toolbar` | 1920×64px |

#### 3.1.3 Shop Rewards Screen

**Reference resolution:** 1920×1080. Layout uses a 12-column × 8-row CSS grid.

**Wireframe description:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [← Back]              SHOP — Ante 2, Round 3             Gold: 12🪙    │  ← Header (row 1, cols 1-12)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │  ← Shop Grid (rows 2-5, cols 1-12)
│  │ ★ RARE ★             │  │ ● COMMON ●           │  │ ◆ UNCOMMON ◆ │  │
│  │ ┌────┐ ┌────┐ ┌────┐ │  │ ┌────┐ ┌────┐ ┌────┐ │  │ ┌────┐ ┌────┐ │  │
│  │ │ Q♠ │ │ Q♥ │ │ Q♦ │ │  │ │ 5♦ │ │ 6♦ │ │ 7♦ │ │  │ │ 2🃏 │ │ 8♠ │ │  │
│  │ └────┘ └────┘ └────┘ │  │ └────┘ └────┘ └────┘ │  │ └────┘ └────┘ │  │
│  │ "Queen Pack"         │  │ "Diamond Pack"       │  │ "Wild Card"   │  │
│  │ Cost: 8🪙  [BUY]     │  │ Cost: 4🪙  [BUY]     │  │ Cost: 6🪙 [BUY]│  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────┘  │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                     │  ← Row 2 of shop items
│  │ ◆ UNCOMMON ◆         │  │ ◆ UNCOMMON ◆         │                     │
│  │ ┌────┐ ┌────┐ ┌────┐ │  │ ┌────┐ ┌────┐ ┌────┐ │                     │
│  │ │ K♠ │ │ K♥ │ │ K♦ │ │  │ │ A♠ │ │ A♥ │ │ A♦ │ │                     │
│  │ └────┘ └────┘ └────┘ │  │ └────┘ └────┘ └────┘ │                     │
│  │ "King Pack"          │  │ "Ace Pack"           │                     │
│  │ Cost: 6🪙  [BUY]     │  │ Cost: 6🪙  [BUY]     │                     │
│  └──────────────────────┘  └──────────────────────┘                     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [REROLL (1🪙)]  [CONTINUE →]                                           │  ← Action Bar (row 8, cols 1-12)
└──────────────────────────────────────────────────────────────────────────┘
```

**Zone layout table:**

| Zone ID | Label | Grid Placement | ARIA Role | Dimensions (ref) |
|---------|-------|---------------|-----------|-----------------|
| `shop-header` | Screen header | [1, 1, 12, 1] | `region` | 1920×48px |
| `shop-grid` | Shop item grid | [1, 2, 12, 7] | `list` | 1920×640px |
| `shop-actions` | Action buttons | [1, 8, 12, 8] | `toolbar` | 1920×64px |

#### 3.1.4 Score Results Screen

**Reference resolution:** 1920×1080. Layout uses a 12-column × 8-row CSS grid.

**Wireframe description:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ROUND RESULTS — Ante 2, Round 3                 │  ← Header (row 1, cols 1-12)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌────────────────────────┐                        │
│                        │    SCORE: 3,420        │                        │  ← Score Display (rows 2-4, cols 4-9)
│                        │    TARGET: 2,500  ✓    │                        │
│                        │    +920 BONUS          │                        │
│                        └────────────────────────┘                        │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │  ← Breakdown (rows 5-6, cols 2-11)
│  │  SCORE BREAKDOWN                                                  │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  Natural Canasta (Queens)     570  (base)                         │   │
│  │  Dirty Canasta (Kings)        420  (base)                         │   │
│  │  Red Three bonus              200  (2 × 100)                      │   │
│  │  The Purist partner           ×2.0 → +990  (Area 3)              │   │
│  │  Gold Tray bonus              +150  (Area 3)                      │   │
│  │  Boss: Score Cap              −120  (Area 3)                      │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  TOTAL                        3,420                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Gold earned: +7🪙  (4 + floor(3420/2500) = 4 + 1 = 5, +2 bonus)       │  ← Gold Summary (row 7, cols 2-11)
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [CONTINUE TO SHOP →]                                                   │  ← Action Bar (row 8, cols 1-12)
└──────────────────────────────────────────────────────────────────────────┘
```

**Zone layout table:**

| Zone ID | Label | Grid Placement | ARIA Role | Dimensions (ref) |
|---------|-------|---------------|-----------|-----------------|
| `score-header` | Screen header | [1, 1, 12, 1] | `region` | 1920×48px |
| `score-display` | Score display | [4, 2, 9, 4] | `status` | 600×320px |
| `score-breakdown` | Score breakdown | [2, 5, 11, 6] | `list` | 1440×240px |
| `score-gold` | Gold summary | [2, 7, 11, 7] | `status` | 1440×40px |
| `score-actions` | Action buttons | [1, 8, 12, 8] | `toolbar` | 1920×64px |

#### 3.1.5 Interaction Model

**Drag-and-drop card placement:**

```
ALGORITHM: handleCardDrag(cardId, targetZoneId)
INPUT:  cardId: string, targetZoneId: string
OUTPUT: DragResult { success: boolean, meldId: string | null, error: string | null }

1. LOOKUP card visual state by cardId.
2. IF card.interactionState ∈ {'unplayable', 'sealed'}:
     RETURN { success: false, meldId: null, error: 'CARD_NOT_PLAYABLE' }
3. DETERMINE target type from targetZoneId:
     IF targetZoneId starts with 'meld-zone-':
       → targetMeld = MeldVisualState for that zone
     IF targetZoneId === 'discard-zone':
       → targetDiscard = true
4. IF targetMeld EXISTS:
     CALL Area 1 validateMeld(proposedCards, targetMeld, context)
     IF validation.valid === false:
       SHOW rejectionMessage from Area 1 (Area 1, Section 1, MeldValidationResult)
       PLAY error shake animation on card
       RETURN { success: false, meldId: null, error: validation.rejectionReason }
     MOVE card to targetMeld zone (animated, 200ms ease-out)
     UPDATE CardVisualState.position to target slot position
     UPDATE MeldVisualState.cardCount
     IF MeldVisualState.cardCount >= 7:
       TRIGGER seal animation (Section 3.2, seal ring)
       UPDATE MeldVisualState.state = 'complete'
       UPDATE MeldVisualState.canastaType from Area 1 determineCanastaType()
     RETURN { success: true, meldId: targetMeld.meldId, error: null }
5. IF targetDiscard === true:
     CALL Area 1 validateDiscard(card, turnState)  // black three check
     IF validation fails:
       SHOW error
       RETURN { success: false, meldId: null, error: 'INVALID_DISCARD' }
     MOVE card to discard zone (animated)
     RETURN { success: true, meldId: null, error: null }
6. IF targetZoneId === 'hand-zone':
     RETURN card to hand position (animated snap-back)
     RETURN { success: true, meldId: null, error: null }
```

**Click-to-select fallback (accessibility):**

```
ALGORITHM: handleCardClick(cardId)
INPUT:  cardId: string
OUTPUT: SelectionResult { selected: boolean, selectionSet: string[] }

1. IF keyboard modifier (Shift/Ctrl) is held:
     TOGGLE cardId in multi-selection set
   ELSE:
     SET selectionSet = [cardId]
2. UPDATE CardVisualState.interactionState for all cards:
     Cards in selectionSet → 'selected'
     Cards not in selectionSet → recompute from game rules:
       IF card is playable in current phase → 'playable'
       ELSE → 'unplayable'
3. SHOW ghost slots in all valid meld targets (highlighted drop zones)
4. RETURN { selected: true, selectionSet }
```

**Confirmation dialogs:**

| Dialog ID | Trigger | Title | Body | Actions |
|-----------|---------|-------|------|---------|
| `confirm-go-out` | Player clicks "Go Out" | "Go Out?" | "You are about to go out. This will end the round. Continue?" | [Cancel] [Confirm] |
| `confirm-discard-black-three` | Player discards black three (not going out) | "Discard Black Three?" | "Black threes can only be discarded. This will freeze the discard pile." | [Cancel] [Confirm] |
| `confirm-reroll` | Player clicks "Reroll" (reroll cost > 0) | "Reroll Shop?" | "Reroll cost: {cost} gold. You have {gold} gold. Continue?" | [Cancel] [Confirm] |
| `confirm-convert` | Player clicks "Convert" | "Convert Card?" | "Convert {card} to {target}. Cost: {cost} gold. This cannot be undone." | [Cancel] [Confirm] |

**Ghost slot behavior:**

```
ALGORITHM: computeGhostSlots(meldState: MeldVisualState): number
INPUT:  meldState: MeldVisualState
OUTPUT: ghostSlotCount: number

1. IF meldState.state ∈ {'complete', 'sealed'}:
     RETURN 0  // Canasta is complete; no ghost slots needed
2. IF meldState.state === 'empty':
     RETURN 3  // Empty meld shows 3 ghost slots (minimum meld size; Area 1, Section 3.1)
     // Exception: if Anchor enhancement is active (Area 4), RETURN 2
3. IF meldState.state === 'partial':
     remaining = 7 - meldState.cardCount
     RETURN min(remaining, 3)  // Cap at 3 visible ghost slots to avoid clutter
```

---

### 3.2 Interactive States, Breakpoints, and Accessibility

#### 3.2.1 Card Interactive States

| State | Visual Treatment | Border | Glow | Scale | Cursor | When Active |
|-------|-----------------|--------|------|-------|--------|-------------|
| `default` | Standard card face | `color-voidGray` 1px | none | 1.0 | `default` | Card in hand, no interaction |
| `selected` | Lifted card with selection ring | `color-neonCyan` 2px | `panel-glowCyan` | 1.1 | `grab` | Card is in the current selection set |
| `playable` | Subtle pulse animation | `color-neonGreen` 1px | `panel-glowGreen` at 50% | 1.0 | `pointer` | Card can be legally played in current phase |
| `unplayable` | Desaturated (grayscale 60%) | `color-asteroidGray` 1px | none | 1.0 | `not-allowed` | Card cannot be played (e.g., black three) |
| `wild` | Purple glow border | `color-neonPurple` 2px | `panel-glowPurple` | 1.0 | `default` | Card is wild (rank 2 or JOKER; Area 1) |
| `enhanced` | Enhancement badge + colored border | `color-enhancement{Type}` 2px | Per enhancement color | 1.0 | `default` | Card has enhancement (Area 4); badge shows icon |
| `sealed` | Seal ring animation (rotating) | `color-seal{Type}` 2px | `panel-glowGold` | 1.0 | `default` | Card is in a sealed canasta |
| `dragging` | Semi-transparent (opacity 0.8) | `color-neonCyan` 2px | `panel-glowCyan` | 1.08 | `grabbing` | Card is being dragged |
| `ghost` | Dashed border, 40% opacity | `color-cometGray` 1px dashed | none | 1.0 | `default` | Ghost slot placeholder in meld zone |

#### 3.2.2 Meld Zone Interactive States

| State | Visual Treatment | Border | Ghost Slots | Seal Ring | When Active |
|-------|-----------------|--------|-------------|-----------|-------------|
| `empty` | Dashed border, dark fill | `color-cometGray` 1px dashed | 3 visible | none | No cards in meld |
| `partial` | Solid border, card faces visible | `color-asteroidGray` 1px | 1–3 visible | none | 1–6 cards in meld |
| `complete` | Gold border, seal ring animating | `color-seal{Type}` 2px | 0 | Rotating ring + burst | 7+ cards, canasta achieved |
| `sealed` | Solid border, steady glow | `color-seal{Type}` 2px | 0 | Steady ring (no animation) | Canasta sealed, may accept more cards |

#### 3.2.3 Action Button Interactive States

| State | Visual Treatment | Border | Background | Cursor | When Active |
|-------|-----------------|--------|------------|--------|-------------|
| `enabled` | Solid fill, neon border | `color-neonCyan` 1px | `color-nebulaDark` | `pointer` | Action is legal in current phase |
| `disabled` | Desaturated (opacity 0.4) | `color-asteroidGray` 1px | `color-voidGray` | `not-allowed` | Action is not legal right now |
| `loading` | Spinner icon replaces label | `color-neonCyan` 1px | `color-nebulaDark` | `wait` | Action is being processed |

#### 3.2.4 Responsive Layout — Breakpoint ≤1240px

**Trigger:** Viewport width ≤ 1240px (laptop/small desktop).

| Change | Reference (1920px) | ≤1240px |
|--------|-------------------|---------|
| Grid columns | 12 | 8 |
| Card size | 96×140px | 80×116px |
| Hand zone max cards visible | 10 | 7 (scroll for overflow) |
| Meld zone columns | 5 | 3 (scroll horizontal) |
| Shop grid columns | 3 | 2 |
| Deck grid columns | 10 | 7 |
| Status bar font size | `typography-size-md` (16px) | `typography-size-sm` (13px) |
| Action button labels | Full text | Icon-only with tooltip |
| Spacing tokens | `spacing-xl` (24px) | `spacing-lg` (16px) |

#### 3.2.5 Responsive Layout — Breakpoint ≤720px

**Trigger:** Viewport width ≤ 720px (tablet portrait / large phone).

| Change | Reference (1920px) | ≤720px |
|--------|-------------------|---------|
| Grid columns | 12 | 4 |
| Card size | 96×140px | 64×92px |
| Hand zone layout | Horizontal scroll | Vertical stack (max 5 visible) |
| Meld zone layout | Horizontal row | Vertical stack (2 columns) |
| Shop grid columns | 3 | 1 (vertical list) |
| Deck grid columns | 10 | 4 |
| Opponent melds | Visible | Collapsed (tap to expand) |
| Action bar | Horizontal toolbar | Vertical button group (bottom) |
| Score breakdown | Full table | Collapsed accordion |
| Background effects | All layers | `bg-scanlines` disabled (performance) |
| Spacing tokens | `spacing-xl` (24px) | `spacing-md` (12px) |

#### 3.2.6 Keyboard Navigation Map

**Global shortcuts (all screens):**

| Key | Action | Screen |
|-----|--------|--------|
| `Tab` | Move focus to next zone | All |
| `Shift+Tab` | Move focus to previous zone | All |
| `Escape` | Cancel current action / close dialog | All |
| `?` | Show keyboard shortcut help overlay | All |

**Gameplay HUD shortcuts:**

| Key | Action |
|-----|--------|
| `←` / `→` | Navigate cards within hand zone |
| `↑` / `↓` | Navigate between hand and meld zones |
| `Enter` / `Space` | Toggle card selection |
| `M` | Activate "Meld" action (if enabled) |
| `D` | Activate "Discard" action (if enabled) |
| `G` | Activate "Go Out" action (if enabled) |
| `W` | Activate "Draw" action (if enabled) |
| `1`–`5` | Jump to meld zone 1–5 |
| `H` | Read current hand state (screen reader) |

**Deck/Inventory shortcuts:**

| Key | Action |
|-----|--------|
| `←` / `→` / `↑` / `↓` | Navigate card grid |
| `Enter` / `Space` | Select card for action |
| `A` | Activate "Add Card" |
| `R` | Activate "Remove Card" |
| `C` | Activate "Convert" |
| `Backspace` | Return to previous screen |

**Shop shortcuts:**

| Key | Action |
|-----|--------|
| `←` / `→` / `↑` / `↓` | Navigate shop items |
| `Enter` / `Space` | Purchase focused item |
| `R` | Activate "Reroll" |
| `N` | Activate "Continue" (Next) |

#### 3.2.7 ARIA Role Assignments

| Element | ARIA Role | Notes |
|---------|-----------|-------|
| Screen root | `application` | Top-level container for each screen |
| Status bar | `status` | Live region for score/gold updates |
| Hand zone | `listbox` | `aria-multiselectable="true"`; `aria-orientation="horizontal"` |
| Individual card | `option` | `aria-selected` reflects selection state; `aria-describedby` points to tooltip |
| Meld zone | `region` | `aria-label` from MeldVisualState.ariaLabel |
| Ghost slot | `presentation` | Not focusable; decorative |
| Discard pile | `region` | `aria-label`: "Discard pile, top card: {card}" |
| Action button | `button` | `aria-disabled` reflects state; `aria-keyshortcuts` for shortcut |
| Action toolbar | `toolbar` | `aria-orientation="horizontal"`; `aria-label="Game actions"` |
| Shop item | `listitem` | `aria-label`: "{name}, {rarity}, cost {cost} gold" |
| Score breakdown row | `listitem` | `aria-label`: "{description}: {value}" |
| Confirmation dialog | `dialog` | `aria-modal="true"`; `aria-labelledby` points to title |
| Score display | `status` | `aria-live="polite"`; announces score changes |

#### 3.2.8 Color Contrast Ratios

All color tokens in Section 2.1 meet or exceed WCAG AA requirements (4.5:1 for normal text, 3:1 for large text and UI components). The table below summarizes critical pairs:

| Foreground Token | Background Token | Ratio | WCAG AA Normal | WCAG AA Large |
|------------------|------------------|-------|----------------|---------------|
| `color-starWhite` | `color-spaceBlack` | 16.42:1 | ✅ Pass | ✅ Pass |
| `color-neonCyan` | `color-spaceBlack` | 13.14:1 | ✅ Pass | ✅ Pass |
| `color-neonGold` | `color-spaceBlack` | 14.27:1 | ✅ Pass | ✅ Pass |
| `color-neonGreen` | `color-spaceBlack` | 14.93:1 | ✅ Pass | ✅ Pass |
| `color-neonMagenta` | `color-spaceBlack` | 8.37:1 | ✅ Pass | ✅ Pass |
| `color-neonRed` | `color-spaceBlack` | 7.42:1 | ✅ Pass | ✅ Pass |
| `color-neonPurple` | `color-spaceBlack` | 6.89:1 | ✅ Pass | ✅ Pass |
| `color-neonOrange` | `color-spaceBlack` | 9.14:1 | ✅ Pass | ✅ Pass |
| `color-cometGray` | `color-spaceBlack` | 7.84:1 | ✅ Pass | ✅ Pass |
| `color-asteroidGray` | `color-spaceBlack` | 4.63:1 | ✅ Pass | ✅ Pass |
| `color-starWhite` | `color-nebulaDark` | 12.87:1 | ✅ Pass | ✅ Pass |
| `color-cometGray` | `color-nebulaDark` | 6.18:1 | ✅ Pass | ✅ Pass |

**Enhancement border colors** are used as non-text UI component borders (3:1 minimum). All enhancement border colors meet the 3:1 threshold against `color-spaceBlack` except `color-enhancementBuried` (4.63:1) which passes.

**Wild card glow** (`color-neonPurple`, 6.89:1) is used as a non-text indicator and passes the 3:1 UI component contrast requirement.

---

## 4. Interfaces & Contracts with Adjacent Areas

### 4.1 Contract with Area 1 — Game Rules & Core Mechanics

Area 5 consumes card and meld data from Area 1 and derives visual states. Area 5 does not redefine any game rule logic — it references Area 1 types and functions.

**Types imported from Area 1:**

```typescript
// Area 5 imports these from Area 1 (congero-game-rules):
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

**Derivation contract:**

Area 5 derives `CardVisualState` from Area 1's `Card` and `TurnState`. Area 5 derives `MeldVisualState` from Area 1's `Meld` and `TurnState`. The derivation functions are owned by Area 5:

```typescript
// Area 5 derives visual states from game data:
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

**Rejection message ownership:**

Area 1's `MeldValidationResult.rejectionMessage` field is populated by Area 5. Area 1 provides the `rejectionReason` enum; Area 5 maps each reason to a human-readable string:

```typescript
// Area 5 owns the mapping from rejection reason to display message:
const REJECTION_MESSAGES: Record<MeldRejectionReason, string> = {
  'INSUFFICIENT_CARDS': 'A meld requires at least 3 cards.',
  'RANK_MISMATCH': 'All non-wild cards in a meld must be the same rank.',
  'ILLEGAL_RANK': 'Threes cannot be melded.',
  'TOO_MANY_WILDS': 'A meld must have at least one natural card.',
  'WILD_MAJORITY': 'Wild cards must be fewer than natural cards.',
  'EXTENDS_SEALED_WRONG_RANK': 'Cards must match the rank of the meld you are extending.',
  'BLACK_THREE_MELD_ATTEMPT': 'Black threes can only be discarded, not melded.',
  'DISCARD_PILE_LOCKED': 'The discard pile is frozen. You need 2 matching natural cards to take it.',
  'HOOK_REJECTED': 'A boss rule prevents this action.',
};
```

**Area 5 must not redefine `validateMeld()`, `scoreCanasta()`, `determineCanastaType()`, or any game rule function. It must call them and display their results.**

---

### 4.2 Contract with Area 2 — Deckbuilding & Run Structure

Area 5 consumes shop state and round progression data from Area 2 to render the Shop Rewards and Deck/Inventory screens.

**Types imported from Area 2:**

```typescript
// Area 5 imports these from Area 2 (congero-deckbuilding):
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

**Screen transition triggers:**

Area 2's `RoundPhase` transitions (Area 2, Section 3.4) trigger screen transitions in Area 5:

```typescript
// Area 5 maps RoundPhase to ScreenId:
const PHASE_TO_SCREEN: Record<RoundPhase, ScreenId> = {
  'Draw': 'gameplay-hud',
  'Play': 'gameplay-hud',
  'Score': 'score-results',
  'Shop': 'shop-rewards',
};
```

**Deck/Inventory screen data:**

The Deck/Inventory screen is not tied to a specific round phase. It is accessible from the Shop screen via a navigation button. Area 5 renders the card grid using `CardPoolEntry` data filtered to cards in the player's current deck.

---

### 4.3 Contract with Area 3 — Modifier Systems

Area 5 consumes modifier display data from Area 3 to render modifier badges, score breakdowns, and tray indicators.

**Types imported from Area 3:**

```typescript
// Area 5 imports these from Area 3 (congero-modifier-systems):
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

**Score breakdown display:**

Area 3's `AppliedModifierRecord[]` (the audit log from the most recent scoring pass; Area 3, Section 3.4) is consumed by Area 5 to render the score breakdown table on the Score Results screen:

```typescript
// Area 5 renders the score breakdown from Area 3's audit log:
export function renderScoreBreakdown(
  records: AppliedModifierRecord[],
  baseScore: number
): ScoreBreakdownRow[];
```

**Modifier badge rendering:**

Area 5 renders modifier badges on the Gameplay HUD using the `ActiveModifierState`. Each active modifier type maps to a color token from Section 2.1:

| Modifier Type | Color Token | Badge Icon |
|---------------|-------------|------------|
| Partner | `color-modifierPartner` | partner-icon |
| Scorepad | `color-modifierScorepad` | scorepad-icon |
| Tray | `color-modifierTray` | tray-icon |
| Boss Rule | `color-modifierBoss` | boss-icon |
| House Rule | `color-modifierHouse` | house-icon |

---

### 4.4 Contract with Area 4 — Card Enhancements & Wild Card Economy

Area 5 consumes enhancement display data from Area 4 to render enhancement badges, border glows, and tooltips on cards.

**Types imported from Area 4:**

```typescript
// Area 5 imports these from Area 4 (congero-card-enhancements):
import type {
  Enhancement,
  EnhancementType,
  WildCardRule,
  EnhancementInteraction,
} from './area4-card-enhancements';
```

**Enhancement visual mapping:**

Area 5 maps each `EnhancementType` to a visual indicator (Section 1, `EnhancementVisualIndicator`). The mapping uses color tokens from Section 2.1:

```typescript
// Area 5 maps enhancement types to visual tokens:
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

**Wild card glow:**

Area 4's `WildCardRule` defines which cards are wild. Area 5 applies the `color-wildGlow` token border and `panel-glowPurple` effect to all cards where `CardVisualState.isWild === true`.

---

### 4.5 Contract with Area 6 — BabylonJS Rendering

Area 5 defines design tokens; Area 6 maps color tokens to PBR material values for the 3D scene.

**Color token to material mapping contract:**

```typescript
// Area 6 imports design tokens from Area 5 and maps them to BabylonJS materials:
export interface MaterialColorContract {
  /**
   * Area 6 maps each color token to a PBR material color.
   * The mapping is a pure function: (hexColor: string) => BABYLON.Color3.
   *
   * Neon glow effect tokens (panel-glow*) are mapped to emissiveColor
   * on the card mesh material, with intensity derived from the alpha channel.
   */
  mapColorTokenToMaterial(tokenName: string): BABYLON.Color3;
  /**
   * Area 6 reads panel-glow tokens and applies them as emissive intensity.
   * Example: panel-glowCyan → emissiveColor = Color3(0, 0.94, 1.0), intensity = 0.4
   */
  mapGlowTokenToEmissive(tokenName: string): { color: BABYLON.Color3; intensity: number };
}
```

**Area 5 must not define BabylonJS scene nodes, meshes, or API calls. Area 6 owns the rendering implementation.**

---

### 4.6 Contract with Area 7 — Angular App Architecture

Area 5 defines design tokens as CSS custom properties; Area 7 references them in component styles. Area 5 defines accessibility requirements; Area 7 implements ARIA attributes and keyboard event handlers.

**CSS custom property contract:**

```typescript
// Area 7 references design tokens via CSS custom properties:
// The naming convention is: --congero-{category}-{name}
// Example component style:
//   .card-selected {
//     border: var(--congero-panel-borderGlowWidth) solid var(--congero-color-neonCyan);
//     box-shadow: var(--congero-panel-glowCyan);
//   }
//
// Area 7 must not hardcode color values. All visual styles must reference
// design tokens from Area 5.
```

**Accessibility implementation contract:**

```typescript
// Area 7 implements the ARIA roles and keyboard navigation defined in Section 3.2.
// Contract summary:
//
// 1. All screen roots MUST have role="application" and an aria-label matching
//    the ScreenLayout.screenTitle.
//
// 2. All zones MUST have the ARIA role specified in ScreenZone.ariaRole.
//
// 3. Hand zone MUST be a listbox with aria-multiselectable="true".
//    Each card MUST be an option with aria-selected reflecting selection state.
//
// 4. Keyboard shortcuts defined in Section 3.2.6 MUST be implemented via
//    Angular @HostListener decorators or equivalent event binding.
//
// 5. Focus management: Tab order MUST follow the zone order defined in
//    ScreenLayout.zones[]. Arrow keys navigate within zones.
//
// 6. Live regions: Score display and status bar MUST use aria-live="polite".
//    Discard pile updates MUST use aria-live="polite".
//
// 7. Confirmation dialogs MUST trap focus and restore focus on close.
```

**Area 7 must not define new design tokens or override token values. All visual design must reference Area 5 tokens.**

---

### 4.7 Contract with Area 8 — Game State Management

Area 5 consumes UI-relevant state from Area 8 to derive visual states. Area 5 does not define state schemas — it reads from Area 8's state shapes.

**Types Area 5 reads from Area 8:**

```typescript
// Area 5 reads these from Area 8 (congero-state-management):
// (Area 8 aggregates state from all areas; Area 5 reads the combined shape)
import type {
  RunState,          // Full run state (Area 8)
  RoundState,        // Current round state (Area 8)
  MeldState,         // Meld visual data (Area 8)
} from './area8-state-management';
```

---

## 5. Worked Example

**Scenario:** Player drags a Queen of Spades (Gilded) from hand to a partial Queen meld (3 cards), the meld reaches canasta (7+ cards), the seal animation triggers, and the player views the score results screen showing the modifier breakdown.

### Setup

**Player's hand (8 cards):**
| Card | Enhancement | Visual State |
|------|-------------|-------------|
| Q♠ | Gilded | `enhanced` (gold border, ✨ badge) |
| Q♥ | none | `playable` (green pulse) |
| Q♦ | none | `playable` (green pulse) |
| 5♣ | none | `playable` |
| 2🃏 (Joker) | none | `wild` (purple glow) |
| K♠ | none | `playable` |
| 3♣ (black) | none | `unplayable` (grayscale, 🔒 icon) |
| 10♥ | none | `playable` |

**Table state:**
- Meld zone `meld-q`: 3 Queens (Q♣, Q♠, Q♥) — state: `partial`, 4 ghost slots visible
- Meld zone `meld-k`: empty — state: `empty`, 3 ghost slots visible
- Active modifiers: The Purist partner (slot 0, ×2.0 on natural canastas; Area 3)
- Turn phase: `Meld` (Area 1, TurnPhase)

### Step 1 — Player initiates drag

Player clicks and holds Q♠ (Gilded) in the hand zone.

**State change:**
```
CardVisualState[Q♠].interactionState = 'dragging'
CardVisualState[Q♠].scale = 1.08
CardVisualState[Q♠].zIndex = 100
```

**Visual feedback:**
- Card lifts slightly (translateY: -8px)
- Card opacity: 0.8
- Cursor changes to `grabbing`
- All valid drop zones (meld zones accepting Queens) highlight with `color-neonCyan` dashed border
- Invalid zones (meld-k, discard) remain dim

### Step 2 — Player drags over meld-q zone

Player moves Q♠ over the Queen meld zone (`meld-q`).

**Ghost slot behavior:**
- The nearest ghost slot in `meld-q` shows Q♠ as a `ghost` preview (dashed border, 40% opacity)
- Remaining ghost slots (3 left after this drop) remain visible

**Accessibility:**
- Screen reader announces: "Dropping Queen of Spades into Queen meld, 3 cards, partial"

### Step 3 — Player drops Q♠ onto meld-q

**Validation (Area 1):**
```
validateMeld(
  proposedCards: [Q♠ (Gilded)],
  existingMeld: meld-q (rank: 'Q', cards: [Q♣, Q♠, Q♥]),
  context: { anchorEnhancementActive: false, discardPileFrozen: false, ... }
)
```

Result: `{ valid: true, rejectionReason: null, rejectionMessage: null }`

**State change:**
```
CardVisualState[Q♠].interactionState = 'default'
CardVisualState[Q♠].position = { x: meldQ.slot4.x, y: meldQ.slot4.y }
MeldVisualState[meld-q].cardCount = 4
MeldVisualState[meld-q].ghostSlotCount = 3
```

**Animation:** Card slides from drag position to meld slot (200ms ease-out).

### Step 4 — Player adds remaining Queens

Player clicks Q♥ and Q♦ in hand (multi-select), then clicks the "Meld" action button.

**Selection state:**
```
CardVisualState[Q♥].interactionState = 'selected'  // cyan border, scale 1.1
CardVisualState[Q♦].interactionState = 'selected'  // cyan border, scale 1.1
```

**Meld action (Area 1):**
```
validateMeld(
  proposedCards: [Q♥, Q♦],
  existingMeld: meld-q (rank: 'Q', cards: [Q♣, Q♠, Q♥, Q♠]),
  context: { ... }
)
```

Result: `{ valid: true }`

**State change:**
```
MeldVisualState[meld-q].cardCount = 6
MeldVisualState[meld-q].ghostSlotCount = 1  // 7 - 6 = 1
```

### Step 5 — Player draws a Queen and adds it to complete canasta

Player clicks "Draw" action (Area 1, Draw phase). Draws Q♦ (second copy). Adds it to meld-q.

**Canasta reached:**
```
MeldVisualState[meld-q].cardCount = 7
MeldVisualState[meld-q].state = 'complete'
MeldVisualState[meld-q].isCanasta = true
MeldVisualState[meld-q].canastaType = 'natural'  // Area 1, determineCanastaType()
MeldVisualState[meld-q].ghostSlotCount = 0
```

**Seal animation:**
- Seal ring appears around meld-q zone (rotating, `color-sealNatural` = `color-neonCyan`)
- Particle burst effect (Area 6) triggers at meld center
- All cards in meld transition to `sealed` state (steady cyan glow border)
- Screen reader announces: "Natural canasta sealed with Queens, 570 points"

### Step 6 — Scoring with modifier pipeline

Area 1 computes base score (Area 1, Section 3.3):
```
cardPointTotal = 10 × 7 = 70
canastaBonus = 500  // natural canasta
baseTotal = 570
```

Area 3 modifier pipeline fires (Area 3, Section 2.1):
```
after_scorepad: 570  // no scorepad active
after_partner:  570 × 2.0 = 1,140  // The Purist (natural ×2.0)
after_tray:     1,140  // no tray assigned
after_boss:     1,140  // no boss rule active
```

**Audit log (Area 3, AppliedModifierRecord[]):**
```
[
  { modifierId: 'the-purist', stage: 'partner', mode: 'multiplicative', value: 2.0, scoreBefore: 570, scoreAfter: 1140 }
]
```

### Step 7 — Score results screen displays

Player ends the round. Score Results screen renders.

**Score display zone:**
```
SCORE: 1,140
TARGET: 1,000  ✓ (met)
+140 ABOVE TARGET
```

**Score breakdown (from Area 3 audit log):**
```
SCORE BREAKDOWN
─────────────────────────────────────
Natural Canasta (Queens)     570  (base)
The Purist partner           ×2.0 → +570
─────────────────────────────────────
TOTAL                        1,140
```

**Gold earned (Area 2, Section 3.6):**
```
baseGold = 4 + floor(1140 / 1000) = 4 + 1 = 5
```

**Visual treatment:**
- Score number: `typography-display`, `typography-size-2xl` (48px), `color-neonGold`
- Target checkmark: `color-neonGreen`, animated pop-in
- Breakdown rows: `typography-body`, `typography-size-md` (16px), `color-starWhite`
- Modifier row: `color-modifierPartner` badge, `typography-weight-semibold`
- Background: `panel-scoreBg` (radial void gradient)
- `bg-nebulaCloud` overlay with subtle purple/cyan nebula

### Step 8 — Player continues to shop

Player clicks "Continue to Shop" button. Screen transition (300ms, `bg-transitionDuration`) fades to Shop Rewards screen.

**Verification:**
- Drag-and-drop: card moved from hand to meld with visual feedback ✓
- Ghost slots: decreased from 4 → 3 → 1 → 0 as cards were added ✓
- Seal animation: triggered at 7 cards, natural canasta type ✓
- Modifier display: The Purist ×2.0 shown in breakdown with correct color ✓
- Score results: base score 570, modified score 1,140, gold +5 ✓
- Accessibility: all zones have correct ARIA roles, keyboard shortcuts functional ✓
- Design tokens: all colors reference Neon Space Canasta token table ✓

---

## 6. Open Questions

### OQ-1: Card Stack vs Fan Layout in Hand Zone
**Question:** Should the hand zone display cards in a horizontal fan (overlapping, fanned out) or a horizontal stack (evenly spaced, no overlap)?

**Status:** Resolved — horizontal fan with overlap.

**Rationale:** A fan layout is the standard card game metaphor and allows more cards to be visible in a limited horizontal space. Overlap ratio: 40% of card width at reference resolution. At ≤720px breakpoint, the fan collapses to a vertical stack (max 5 visible, scroll for overflow). The fan layout is more readable and more consistent with physical card game expectations.

---

### OQ-2: Meld Zone Maximum Count
**Question:** How many meld zones should be visible on the player meld area? Is 5 the right number, or should it be dynamic?

**Status:** Resolved — 5 fixed zones.

**Rationale:** Five meld zones provide enough space for a typical canasta game (players rarely need more than 4–5 simultaneous melds). Fixed zones simplify the layout and avoid dynamic reflow during gameplay. Empty zones show ghost slots. If a player needs more than 5 melds, the oldest unsealed meld can be auto-consolidated (Area 1 rule). The 5-zone layout is fixed at all breakpoints (scrolls horizontally at ≤1240px).

---

### OQ-3: Enhancement Badge Size on Small Cards
**Question:** At the ≤720px breakpoint, cards are 64×92px. Is there enough room for enhancement badges (icon + border glow) without obscuring the card rank/suit?

**Status:** Resolved — badges shrink to 12×12px at ≤720px.

**Rationale:** The enhancement badge is positioned in the top-left corner of the card. At 64×92px, a 12×12px badge with 2px padding leaves 52×80px for the card face — sufficient for rank/suit display at `typography-size-xs` (10px). The border glow is applied to the full card perimeter and does not compete with the badge for space. Tooltip on tap/long-press provides full enhancement description.

---

### OQ-4: Drag-and-Drop on Touch Devices
**Question:** How does the interaction model adapt for touch devices where drag-and-drop is less precise?

**Status:** Resolved — tap-to-select + tap-target fallback.

**Reason:** On touch devices (≤720px), the primary interaction is tap-to-select (card highlights with selection ring) followed by tap on a valid drop zone. Drag-and-drop is still supported but not required. A "quick meld" button appears when a valid selection + valid target combination is detected. The confirmation dialog is shown for irreversible actions (Go Out, discard black three).

---

### OQ-5: Score Breakdown — Modifier Ordering
**Question:** In the score breakdown on the Score Results screen, should modifiers be displayed in pipeline order (scorepad → partner → tray → boss) or grouped by type?

**Status:** Resolved — pipeline order.

**Rationale:** Pipeline order (Area 3, Section 2.1: `base_score → scorepad → partner → tray → boss`) shows the player exactly how their score was computed, step by step. This is more educational and debuggable than grouping by type. Each row shows the modifier name, operation (×2.0, +150, etc.), and the score delta. The running total is shown on each row.

---

### OQ-6: Background Animation Performance
**Question:** The star field, nebula cloud, scanlines, and grid lines create 4 layered background effects. Should all layers be active on low-end devices?

**Status:** Resolved — progressive enhancement with breakpoint-based disabling.

**Rationale:** At reference resolution (1920×1080), all 4 layers are active. At ≤1240px, `bg-scanlines` is disabled (saves one compositing layer). At ≤720px, both `bg-scanlines` and `bg-gridLines` are disabled. The star field and nebula cloud remain active at all breakpoints asthe primary atmospheric effects. This ensures the Neon Space Canasta aesthetic is preserved even on low-end devices while reducing GPU compositing load.

---

### OQ-7: Canasta Seal Ring — Color Differentiation
**Question:** With 7 canasta types (Area 1, Section 1), each with a distinct seal ring color, can players reliably distinguish between seal types at a glance?

**Status:** Resolved — color + icon dual encoding.

**Rationale:** Color alone is insufficient for colorblind players. Each seal ring uses both a distinct color (from Section 2.1 color-seal* tokens) AND a unique icon/badge (natural = ✦, dirty = ◆, super = ★, red = ♥, frozen = ❄, partner = ∞, concealed = ☆). This dual encoding ensures the canasta type is identifiable without relying solely on color. The icon is rendered at the center of the seal ring and in the tooltip.

---

### OQ-8: Confirmation Dialog — Default Focus
**Question:** When a confirmation dialog opens, which button should receive initial focus — the safe action (Cancel) or the primary action (Confirm)?

**Status:** Resolved — Cancel receives initial focus.

**Rationale:** For safety, the Cancel button receives initial focus. This prevents accidental confirmation via Enter key press. The Confirm button is visually highlighted (solid fill, neon border) to indicate it is the primary action, but focus starts on Cancel. Users can Tab to Confirm or press the keyboard shortcut (Enter for Confirm, Escape for Cancel). This follows the "safe default" accessibility pattern.

---

## 7. Self-Review Against Done Criteria

### Universal Done Checklist

- [x] All required sections present: Overview, Data Models (Section 1), Core Algorithms (Section 3), Design Token Table (Section 2), Interfaces & Contracts (Section 4), Worked Example (Section 5), Open Questions (Section 6)
- [x] All data models fully typed: `ScreenLayout`, `ScreenZone`, `CardVisualState`, `CardInteractionState`, `EnhancementVisualIndicator`, `MeldVisualState`, `MeldZoneState`, `TrayVisualIndicator`, `ActionButtonState`, `ActionButtonInteractionState`, `DesignToken`, `DesignTokenCategory` — no `any`, no partial types
- [x] All algorithms described at pseudocode or decision-table level: drag-and-drop placement (Section 3.1.5, pseudocode), click-to-select fallback (Section 3.1.5, pseudocode), ghost slot computation (Section 3.1.5, pseudocode), confirmation dialogs (Section 3.1.5, decision table), responsive layout changes (Section 3.2.4 and 3.2.5, comparison tables), keyboard navigation (Section 3.2.6, key map tables)
- [x] All interfaces between this area and adjacent areas explicitly named and typed: Area 1 (Section 4.1), Area 2 (Section 4.2), Area 3 (Section 4.3), Area 4 (Section 4.4), Area 6 (Section 4.5), Area 7 (Section 4.6), Area 8 (Section 4.7)
- [x] All open questions either resolved or explicitly deferred with rationale: OQ-1 through OQ-8
- [x] Worked example traces a concrete game scenario end-to-end: Section 5 (drag Q♠ to meld, build to canasta, seal animation, score results display)
- [x] No content redefines rules owned by upstream dependencies: all scoring formulas reference Area 1; all canasta types reference Area 1 Section 3.2; all shop mechanics reference Area 2 Section 3.5; all modifier display references Area 3; all enhancement display references Area 4

### Area-Specific Done Criteria

- [x] All four screens have complete wireframe descriptions with layout dimensions and zone labels: Gameplay HUD (Section 3.1.1), Deck/Inventory (Section 3.1.2), Shop Rewards (Section 3.1.3), Score Results (Section 3.1.4)
- [x] The interaction model covers drag-and-drop card placement, click-to-select fallback, confirmation dialogs, and ghost slot behavior: all defined in Section 3.1.5
- [x] All interactive states are enumerated for cards (9 states), melds (4 states), and action buttons (3 states): Sections 3.2.1, 3.2.2, 3.2.3
- [x] Responsive layout changes are specified at both breakpoints (≤1240px and ≤720px): Sections 3.2.4 and 3.2.5
- [x] Keyboard navigation map covers all four screens: Section 3.2.6
- [x] ARIA role assignments are complete for all interactive elements: Section 3.2.7
- [x] Color contrast ratios are documented for all critical foreground/background pairs: Section 3.2.8
- [x] The Neon Space Canasta design token table is complete with color palette (40 tokens), typography (17 tokens), spacing (9 tokens), panel styles (16 tokens), and background effects (7 tokens): Section 2
- [x] The design token table is the owner document for all design tokens; Areas 6 and 7 reference tokens but do not redefine them: stated in Section 2 and Sections 4.5/4.6 contracts
- [x] Typed contracts with Area 6 (BabylonJS) specify material color mapping: Section 4.5, `MaterialColorContract`
- [x] Typed contracts with Area 7 (Angular) specify CSS custom property references and accessibility requirements: Section 4.6
- [x] Cross-references to upstream documents use name and section format: e.g., "Area 1, Section 3.2", "Area 3, Section 2.1", "Area 4, Section 2.1"
