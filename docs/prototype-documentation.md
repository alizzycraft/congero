# CONGERO — Prototype Screen Documentation

**File:** `canasta-drift-polished-3.html`
**Project:** Roguelite Canasta Deckbuilder
**Design System:** Neon Space Canasta (dark sci-fi, cyan/magenta/gold accents)

---

## Design System Overview

### Color Palette

| Token | OKLCH Value | Usage |
|---|---|---|
| `--bg` | `oklch(7% 0.026 250)` | Page background (near-black navy) |
| `--surface` | `oklch(12% 0.038 245)` | Panel surfaces |
| `--panel` | `oklch(10% 0.032 245)` | Secondary panel fills |
| `--fg` | `oklch(88% 0.044 78)` | Primary text (warm off-white) |
| `--muted` | `oklch(70% 0.055 205)` | Secondary text, labels |
| `--border` | `oklch(54% 0.078 78)` | Borders and dividers |
| `--accent` | `oklch(78% 0.145 205)` | Cyan — navigation, CTAs, active states |
| `--magenta` | `oklch(68% 0.22 325)` | Wild cards, dirty melds, high-voltage moments |
| `--red` | `oklch(66% 0.20 25)` | Red suit cards |
| `--gold` | `oklch(75% 0.11 78)` | Sealed canastas, currency, score values |
| `--green` | `oklch(76% 0.17 155)` | Fresh melds, positive states |
| `--ink` | `oklch(4% 0.018 250)` | Deepest background layer (table surface) |

### Typography

| Role | Font Stack | Weight |
|---|---|---|
| Display | `Rajdhani`, `Agency FB`, `Bahnschrift Condensed`, `Arial Narrow` | 800 (black) |
| Body | `Barlow Condensed`, `Bahnschrift`, `Segoe UI`, system-ui | normal |
| Mono | `JetBrains Mono`, `IBM Plex Mono`, `ui-monospace` | normal |

All headings and labels are **uppercase**. Display font is condensed/industrial. Body is condensed sans.

### Background Effect

The page uses three radial gradients + a linear dark gradient for a deep space glow. A subtle grid overlay (72px, 3.5% white lines) with a radial mask fading at edges creates a sci-fi tabletop feel.

### Panel Style

Panels use the `.cut` class: clipped corners (L-bracket on top-left and bottom-right) via `::before`/`::after` pseudo-elements, thin inset borders, and a dark gradient fill. This is applied consistently to all major UI panels.

---

## Screen 1 — Gameplay HUD (`#gameplay`)

The primary play screen. Three-column HUD layout (`128px | flex | 180px`).

### Left Rail

- **Draw Pile** — Shows remaining cards (`32`). Indicates "Rank sort ready" (deck state).
- **Frozen Discard** — Shows top card face (`7C`). Displays penalty info ("Take pile: +300").
- **Round / Ante** — Current round number (`5`). Warns of upcoming boss rule.

The discard face uses a repeating diagonal line pattern over a dark gradient to suggest a frozen/blocked state.

### Center Table

The table area has three stacked zones:

#### Partners Bar (top)
Five partner cards in a row, each with:
- **Name** — e.g. The Purist, Wild Agent, Discard Broker, Queen Collector, Table Fixer
- **Effect description** — e.g. "Natural canasta x2", "2s and jokers wild"
- **Point value** — e.g. `500`, `750`

Partners use color-coded borders (cyan for gameplay, gold for two, magenta for one). Partners modify scoring rules and draw/discard behavior.

#### Playfield (middle) — Melds
A flex-wrap container holding meld areas. Each meld is a bordered card group:

**Kings — Sealed Canasta**
- 7 natural King cards (all suits) in a stacked spread with slight rotation
- Gold border + gold glow background
- `sealed-badge` component: diamond + "Canasta" label in gold
- `canasta-ribbon`: "Pure natural — Purist double active"
- Status: `7 / 7` (complete)
- Cards tagged "Natural"

**Queens — Partial Meld**
- 4 cards placed: 3 Queens (Gilded, Echo, Marked) + 1 wild `2C`
- 3 ghost slots: `+Q`, `+W`, `Seal` (shows what can still be added)
- `rank-tag partial` in cyan indicating incomplete
- Status: `4 / 7 · +3 slots open`
- `canasta-ribbon`: "Dirty — 1 natural more seals"

**Sevens — Fresh Meld**
- 2 cards: `7S` (Lead), `7C` (Draw)
- 5 ghost slots: `+7`, `+7`, `+7`, `+W`, `Seal`
- `rank-tag` in green indicating fresh
- Status: `2 / 7`

**Empty Meld Slots (×2)**
- Dashed border, muted text "Drop a pair"
- Indicates where new melds can be started

**Card Component**
Each card is `48×70px` with:
- `rank` — suit+rank code (e.g. `KC`, `QH`)
- `pip` — large center character (e.g. `K`, `Q`, `W` for wild)
- `tag` — card modifier (Natural, Gilded, Echo, Marked, Wild, Clean, Anchor, Hot, Draw, Red, Cut?, etc.)
- Color variants: `.red`, `.wild`, `.gold` classes change the accent color
- Wild cards (2s, Jokers) render in magenta
- Gold cards have gold accents

**Ghost Slot Component**
Dashed border placeholder `48×70px` showing what card is expected there (`+Q`, `+W`, `+7`, `Seal`).

**Sealed Stack Effect**
7-card stacks use `sealed-stack` class with individual rotation transforms (`-0.6deg` through `0.9deg`) and Y-offsets for a fanned-book look.

#### Hand Tray (bottom)
- Meta line: "Hand — 9 cards · rank sorted / Playable: 6"
- 9 cards displayed in a row with alternating Y-offset (every 2nd card raised `-3px`)
- Cards show tags: Clean, Anchor, Hot, Draw, Wild (×3), Red, Cut?
- Wild cards appear magenta; the Joker and two 2s in hand are wild

### Right Rail

- **Score** — `12,450` (current)
- **Target** — `15,000` (win condition)
- **Turns Left** — `18` (round limit)
- **Best Move** — Purple-bordered hint card: "Play QC + Joker to seal Queens next turn without breaking Purist." (AI suggestion)
- **Action Buttons** — Cyan primary "Draw" + secondary buttons: Take Discard, Play Meld, Discard, Go Out

---

## Screen 2 — Deck / Inventory (`#inventory`)

Two-column layout: rank density grid + stats panel.

### Rank Density Grid
Six columns, one per card category:

| Category | Color | Count | Meter Bars | Assessment |
|---|---|---|---|---|
| Queens | Magenta | 12 | 7/8 | "Canasta potential 82%" |
| Kings | Cyan | 9 | 6/8 | "Natural engine stable" |
| Sevens | Green | 7 | 5/8 | "Ladder build option" |
| Twos | Red | 6 | 6/8 | "Wild economy high" |
| Jokers | Magenta | 2 | 4/8 | "Dirty finisher" |
| Clutter | Gold | 16 | 2/8 | "Remove candidates" |

Each rank card has:
- Rank name as heading
- A sample card illustration (`94×142px` — the largest card rendering in the prototype)
- A density meter (8-segment bar, segments filled = relative density)
- Assessment text

### Deck Scan Panel (right sidebar)
- **Deck Size** — `52 / 60` (current vs max)
- **Wild Cards** — `8`
- **Best Rank** — `Queens`
- **Natural Odds** — `72%`
- **Dirty Odds** — `58%`
- **Dead Draw Risk** — `18%`
- Actions: "Suggest Cuts" (primary) + "Sort By Enhancement"

---

## Screen 3 — Shop Rewards (`#shop`)

### Header
- Kicker: "Between rounds — choose one upgrade path"
- Title: "Shop Rewards"
- Filter chips: All, Deck, Rules, Partners

### Shop Grid (5 items)
Five-column grid, each item is a `.shop-item` card:

| Item | Rarity | Stock | Price | Shape | Description |
|---|---|---|---|---|---|
| Neon Card Pack | Uncommon | 3 | 1,200 | Rotated card rect | "Add two tuned cards. At least one matches densest rank." |
| Partner Contract | Rare | 1 | 900 | Circle (coin) | "Draft one passive Partner." |
| House Rule Slip | Unique | 1 | 1,500 | Tall card (parchment) | "Deep Tray: canastas require 8 cards, pay double." |
| Card Seal | Epic | 2 | 800 | Circle (seal) | "Seal a Queen — draws a card on meld completion." |
| Wild Upgrade | Legendary | 1 | 2,000 | Rotated card | "Every 2 and Joker gains +40 score as card 6 or 7." |

Each item has:
- `rarity` label (colored border + text)
- `reward-art` — a shaped container matching item type (rotated card, coin circle, parchment card, seal circle)
- Title + description
- Buy button with chip price and star icon

### Shop Footer
- Boss teaser: "Next boss: The Freezer. Discard pile stays frozen until a natural meld opens."
- "Reroll Shop / 750" button
- Bank display: `9,850` star chips

---

## Screen 4 — Score Results (`#results`)

Four-column layout: book stacks left and right, breakdown center, summary rail.

### Left Book Stack
- **QUEENS** — Natural Canasta book visual (gold border, rotated `-3deg`, gold glow). "Purist bonus active."
- **TWOS** — Dirty Wild Chain book (magenta border, rotated `-1deg`, magenta glow). "2s and jokers used."

### Right Book Stack
- **KINGS** — Natural Canasta (gold, rotated `+2deg`). "Clean tray sealed."
- **OUT** — Concealed Out (gold, rotated `-2deg`). "Hand emptied this turn."

The book visual is a tall rounded rectangle with repeating horizontal line texture, shadow stack (14px bottom offset), and glow matching the border color.

### Center Breakdown Panel
Line-item scoring:

| Line | Value |
|---|---|
| Meld Points | 4,500 |
| Natural Canasta | 3,000 |
| Dirty Canasta | 1,500 |
| Frozen Discard | 900 |
| Partner Bonuses | 1,050 |
| Going Out | 1,000 |
| **Multiplier** | **× 2.35** |
| **Total** | **27,963** |

"Continue Run" button at bottom.

### Right Rail Summary
- Target: `15,000`
- Margin: `+12,963`
- Credits: `5,240`
- Next Boss: `Freezer`

---

## Tab Navigation

A 4-button tab bar at top persists the active tab to `localStorage` (key: `congero-polished-tab`). Active tab gets cyan border + glow treatment. Defaults to Gameplay HUD on first visit.

## Responsive Behavior

- **≤1240px** — Stacks columns, reduces grid columns, playfield goes vertical
- **≤720px** — All grids to single column, card size reduces to `42×62px`, overlap reduced to `16px`
