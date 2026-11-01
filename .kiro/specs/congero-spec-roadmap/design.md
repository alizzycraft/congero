# Design Document — Congero Spec Roadmap

## Overview

This document is the design for the **Congero Spec Roadmap** — a meta-spec that defines the eight design documents needed to fully specify the Congero roguelite canasta deckbuilder game before implementation begins. It covers the structure, content, authoring order, done criteria, cross-cutting concerns, and authoring guidance for each of the eight concern areas.

Congero is a browser game built with **BabylonJS** (3D rendering) and **Angular 21** (signals, functional reactivity). The game is a roguelite deckbuilder based on canasta card game mechanics, inspired by Balatro.

---

## 1. The Eight Concern Areas

Each area is a bounded domain of the Congero system. Each area produces exactly one design document. Boundary ownership rules resolve shared concepts between areas.

---

### Area 1 — Game Rules & Core Mechanics

**In scope:** Canasta rule definitions (natural, dirty, super, red, frozen, partner, concealed out), meld validity rules, scoring formulas for all canasta types and bonuses, turn structure (draw, meld, discard, go out), going-out conditions, and boss round rule injection points.

**Out of scope:** How rules are stored in state (Area 8), how modifiers alter rules (Area 3), how rules are rendered in the UI (Area 5), how rules are implemented in Angular services (Area 7).

**Boundary ownership:** Area 1 owns the canonical definition of all scoring formulas and meld validity logic. Area 3 (Modifier Systems) references these formulas and describes how modifiers compose on top of them — it does not redefine them.

---

### Area 2 — Deckbuilding & Run Structure

**In scope:** Card pool composition (full enumeration of ranks, suits, wilds, special cards), run and ante progression, round lifecycle (draw phase, play phase, score phase, shop phase), shop mechanics (item generation, pricing, reroll), card acquisition and removal, upgrade pricing, and score target scaling across antes.

**Out of scope:** Individual card enhancement types (Area 4), modifier systems that alter shop or run rules (Area 3), how run state is persisted (Area 8), how the shop screen is rendered (Area 5).

**Boundary ownership:** Area 2 owns the card pool enumeration and the round/ante progression table. Area 3 references the shop mechanics when describing House Rules that alter shop behavior.

---

### Area 3 — Modifier Systems

**In scope:** Partner slot architecture (slot count, slot types, passive effect application), House Rule application model (global run mutations, stacking behavior), Scorepad formula composition (how scorepads modify the base formulas from Area 1), Tray slot mechanics (meld-slot modifiers, constraints), boss rule injection (how boss rules override or extend base rules), and modifier stacking and conflict resolution.

**Out of scope:** Base scoring formulas (Area 1), individual card enhancements (Area 4), how modifiers are displayed in the UI (Area 5), how modifier state is stored (Area 8).

**Boundary ownership:** Area 3 owns the modifier application pipeline and stacking order. Area 4 references the modifier pipeline when describing how card enhancements interact with active modifiers.

---

### Area 4 — Card Enhancements & Wild Card Economy

**In scope:** All ten enhancement types (Gilded, Echo, Sticky, Marked, Pure, Hot, Frozen, Partner, Buried, Anchor), wild card substitution rules (which cards are wild, how wilds count in melds), enhancement interaction matrix (how enhancements interact with each other and with modifiers), and wild card economy constraints (maximum wilds per meld, dirty canasta thresholds).

**Out of scope:** Base meld validity rules (Area 1), modifier stacking pipeline (Area 3), how enhancements are displayed on cards in the UI (Area 5), how enhancement state is stored per card (Area 8).

**Boundary ownership:** Area 4 owns the enhancement interaction matrix and wild card substitution rules. Area 1 references wild card rules when defining meld validity but defers the full substitution model to Area 4.

---

### Area 5 — UI/UX Design

**In scope:** The four screens (Gameplay HUD, Deck/Inventory, Shop Rewards, Score Results), interaction model (drag-and-drop card placement, selection, confirmation dialogs), responsive breakpoints (≤1240px, ≤720px), the Neon Space Canasta design system token definitions (color palette, typography, panel style, background effects), and accessibility considerations (keyboard navigation, screen reader support, color contrast).

**Out of scope:** Angular component names or implementation details (Area 7), BabylonJS scene graph or API calls (Area 6), game rule logic (Area 1).

**Boundary ownership:** Area 5 owns the Neon Space Canasta design system token definitions. Areas 6 and 7 reference these tokens but do not redefine them. Area 5 owns accessibility requirements; Area 7 references them when specifying ARIA attributes and keyboard event handlers.

---

### Area 6 — BabylonJS Rendering

**In scope:** Scene graph structure for the 3D table (nodes, meshes, hierarchy), card mesh and material pipeline (geometry, PBR materials, glow layers), animation system (deal, meld, seal, discard animations — state machine and timing), particle and glow effects (canasta seal burst, wild card glow, frozen discard shimmer), camera and lighting setup (orthographic vs perspective, ambient and point lights), asset loading strategy (texture atlases, font rendering, lazy loading), and performance budgets (target frame rate, animation timing constraints, draw call limits).

**Out of scope:** Angular component structure (Area 7), game rule logic (Area 1), UI layout and design tokens (Area 5 owns tokens; Area 6 references them for material colors).

**Boundary ownership:** Area 6 owns performance budgets. Areas 7 and 8 reference the performance budget when specifying state update latency and signal computation frequency.

---

### Area 7 — Angular App Architecture

**In scope:** Module and component tree (feature modules, standalone components, lazy-loaded routes), signal-based reactive state model (which signals exist, what they represent, computed signal graph), functional reactivity patterns (effects, derived state, signal composition), routing structure (route definitions, guards, resolvers), service layer design (which services exist, their responsibilities, injection scope), and integration points with BabylonJS (the Angular/BabylonJS boundary contract — how Angular components own and communicate with the BabylonJS scene).

**Out of scope:** BabylonJS scene internals (Area 6), game rule logic (Area 1), UI visual design (Area 5 owns design tokens; Area 7 uses them via CSS custom properties).

**Boundary ownership:** Area 7 owns the Angular/BabylonJS integration boundary contract. Area 6 references this contract when describing how the scene receives game state updates.

---

### Area 8 — Game State Management

**In scope:** Round state schema (current round, turn number, hand, melds, discard pile, draw pile, score, target), deck state schema (full card list with enhancements, rank density, wild count), meld state schema (per-meld card list, canasta status, tray assignment), run persistence model (save format, localStorage vs IndexedDB, versioning), save/load lifecycle (when state is saved, how it is restored, migration strategy), and state transition rules between game phases (phase enum, valid transitions, invariants).

**Out of scope:** Game rule logic that produces state transitions (Area 1), modifier application that mutates state (Area 3), how state is rendered (Area 5), how Angular signals consume state (Area 7).

**Boundary ownership:** Area 8 owns all state schemas and the error handling and recovery model (invalid state detection, failed persistence recovery, rendering error fallback). All other areas reference Area 8 for error handling rather than defining their own recovery strategies.

---

## 2. Content Specification for Each Design Document

Every design document must contain the following universal sections:

| Section | Purpose |
|---|---|
| **Overview** | One-paragraph summary of the area, its boundaries, and its role in the system |
| **Data Models** | Fully typed schemas for all entities owned by this area (TypeScript interfaces or equivalent) |
| **Core Algorithms or Logic** | Pseudocode or decision tables for all non-trivial logic owned by this area |
| **Interfaces & Contracts** | Named and typed interfaces between this area and each adjacent area |
| **Worked Example** | A concrete game scenario traced through this area's logic end-to-end |
| **Open Questions** | Unresolved decisions, each with a rationale for deferral or a proposed resolution |

### Area-Specific Required Content

**Area 1 — Game Rules & Core Mechanics**
- Canasta type definitions: natural, dirty, super, red, frozen, partner, concealed out — each with eligibility conditions and base score
- Meld validity function: inputs (cards proposed), outputs (valid/invalid + reason)
- Scoring formula for each canasta type, expressed as a pure function
- Turn structure state machine: phases (Draw, Meld, Discard, GoOut) and valid transitions
- Going-out conditions: hand empty, minimum meld requirements, concealed out conditions
- Boss rule injection points: named hooks where boss rules can override base behavior

**Area 2 — Deckbuilding & Run Structure**
- Full card pool enumeration: all ranks (A–K), suits (♠♥♦♣), special cards (red threes, black threes, jokers, twos), starting deck composition
- Ante/round progression table: ante number, rounds per ante, score target formula, boss round position
- Round lifecycle diagram: phases in sequence with entry/exit conditions
- Shop item generation algorithm: item pool, rarity weights, slot count, reroll cost
- Card acquisition model: add, remove, convert operations with cost formulas
- Score target scaling: formula relating ante number to target score

**Area 3 — Modifier Systems**
- Partner slot model: slot count (5 per prototype), slot types, how partners are drafted and replaced
- Partner effect application: when effects fire (on meld, on canasta, on draw, on discard), how they compose
- House Rule model: global vs round-scoped rules, how they are applied to the base rule set
- Scorepad model: formula composition — how scorepads modify the base scoring functions from Area 1
- Tray slot model: slot count, tray types, how trays constrain or bonus the meld placed in them
- Boss rule injection: how boss rules use the injection points defined in Area 1
- Modifier stacking order: the canonical pipeline (base score → scorepad → partner → tray → boss)
- Conflict resolution rules: what happens when two modifiers contradict each other

**Area 4 — Card Enhancements & Wild Card Economy**
- Enhancement definitions: all ten types with trigger condition, effect, and constraints
- Wild card substitution rules: which cards are wild (2s, Jokers), how they count toward meld size and canasta type
- Enhancement interaction matrix: 10×10 table showing how each pair of enhancements interacts when both are present in a meld
- Wild card economy constraints: maximum wilds per meld, dirty canasta wild thresholds, boss rule override points
- Enhancement acquisition: how enhancements are applied to cards (shop, seal items)

**Area 5 — UI/UX Design**
- Screen layouts: annotated wireframe descriptions for all four screens (Gameplay HUD, Deck/Inventory, Shop Rewards, Score Results)
- Interaction model: drag-and-drop card placement, click-to-select fallback, confirmation dialogs, ghost slot behavior
- Interactive state enumeration: all states for cards (default, selected, playable, unplayable, wild, enhanced, sealed), melds (empty, partial, complete, sealed), and action buttons (enabled, disabled, loading)
- Responsive breakpoints: layout changes at ≤1240px and ≤720px
- Neon Space Canasta design system: full token table (color palette, typography roles, panel style, background effect specification)
- Accessibility: keyboard navigation map, ARIA role assignments, color contrast ratios

**Area 6 — BabylonJS Rendering**
- Scene graph: full node hierarchy for the table scene (root → table → meld zones → card meshes → UI overlays)
- Card mesh pipeline: geometry spec (plane mesh dimensions), material pipeline (PBR material, emissive for glow, texture atlas layout)
- Animation state machine: states (Idle, Dealing, Melding, Sealing, Discarding), transitions, timing values
- Glow and particle effects: glow layer configuration, particle system specs for canasta seal burst and wild card effects
- Camera and lighting: camera type (orthographic for 2D-feel), position, FOV; ambient light color and intensity; point lights for card highlights
- Asset loading: texture atlas strategy, font rendering approach, loading sequence and fallbacks
- Performance budget: target 60fps, max draw calls per frame, animation timing constraints, state update latency budget

**Area 7 — Angular App Architecture**
- Module and component tree: full hierarchy with lazy-loading boundaries marked
- Signal inventory: named list of all signals and computed signals, with type and owning service
- Functional reactivity patterns: how effects are used (side effects only, no derived state in effects), signal composition patterns
- Routing structure: route definitions, lazy-loaded feature modules, route guards
- Service layer: named services, their responsibilities, injection scope (root vs feature)
- BabylonJS integration boundary: the contract between Angular components and the BabylonJS scene (input signals → scene updates, scene events → Angular signals)

**Area 8 — Game State Management**
- Round state schema: fully typed TypeScript interface
- Deck state schema: fully typed TypeScript interface
- Meld state schema: fully typed TypeScript interface
- Run state schema: fully typed TypeScript interface (wraps round, deck, meld, run metadata)
- Phase enum and transition table: all valid phase transitions with guard conditions
- Persistence model: storage mechanism (localStorage for MVP, IndexedDB for large state), serialization format, schema version field
- Save/load lifecycle: when auto-save fires, how state is restored on load, migration strategy for schema version changes
- Error handling model: invalid state detection (invariant checks), recovery strategies (rollback to last valid state, reset to round start), persistence failure handling

---

## 3. Dependency Graph

### Adjacency List

```
Area 1 (Game Rules)          → Area 2, Area 3, Area 4, Area 5, Area 8
Area 2 (Deckbuilding)        → Area 3, Area 5, Area 8
Area 3 (Modifiers)           → Area 4, Area 5, Area 8
Area 4 (Enhancements)        → Area 5, Area 8
Area 5 (UI/UX)               → Area 6, Area 7
Area 8 (State Management)    → Area 7
Area 7 (Angular Arch)        → Area 6
Area 6 (BabylonJS)           → [none — leaf node]
```

Areas 6 and 7 are leaf nodes. Once Areas 5 and 8 are complete, Areas 6 and 7 may be authored in parallel.

### ASCII Dependency Diagram

```
Area 1
(Game Rules)
    │
    ├──────────────────────────────────┐
    │                                  │
    ▼                                  ▼
Area 2                              Area 3
(Deckbuilding)                      (Modifiers)
    │                                  │
    └──────────┬───────────────────────┘
               │
               ▼
            Area 4
         (Enhancements)
               │
    ┌──────────┴──────────┐
    ▼                     ▼
Area 5                 Area 8
(UI/UX)           (State Mgmt)
    │                     │
    └──────────┬───────────┘
               ▼
            Area 7
         (Angular Arch)
               │
               ▼
            Area 6
          (BabylonJS)
```

### Authoring Order

| Wave | Areas | Can start when... |
|---|---|---|
| Wave 1 | Area 1 | Immediately |
| Wave 2 | Area 2 | Area 1 complete |
| Wave 3 | Area 3 | Areas 1–2 complete |
| Wave 4 | Area 4 | Areas 1, 3 complete |
| Wave 5 | Areas 5 and 8 | Areas 1–4 complete |
| Wave 6 | Area 7 | Areas 5 and 8 complete |
| Wave 7 | Area 6 | Areas 5 and 7 complete |

---

## 4. Done Criteria

### Universal Done Checklist

Every design document is complete when all of the following are true:

- [ ] All required sections are present (Overview, Data Models, Core Algorithms or Logic, Interfaces & Contracts, Worked Example, Open Questions)
- [ ] All data models are fully typed (no `any`, no partial types, all fields named and typed)
- [ ] All algorithms are described at pseudocode or decision-table level — no hand-waving
- [ ] All interfaces between this area and adjacent areas are explicitly named and typed
- [ ] All open questions are either resolved with a decision or explicitly deferred with a written rationale
- [ ] The worked example traces a concrete game scenario through this area's logic end-to-end
- [ ] No content redefines rules or schemas already owned by an upstream dependency — upstream docs are cited by name and section instead

### Area-Specific Done Criteria

**Area 1 — Game Rules & Core Mechanics**
- [ ] Every canasta type (natural, dirty, super, red, frozen, partner, concealed out) has a complete scoring formula expressed as a pure function
- [ ] The meld validity function is fully specified: inputs, outputs, and all rejection conditions enumerated
- [ ] Every boss rule has a named injection point in the turn structure state machine
- [ ] The going-out conditions cover all cases (normal, concealed, partner canasta)

**Area 2 — Deckbuilding & Run Structure**
- [ ] The full card pool is enumerated (every rank, suit, and special card with count)
- [ ] The ante/round progression table is complete for at least 8 antes
- [ ] The shop item generation algorithm specifies item pool, rarity weights, and slot count
- [ ] Score target scaling formula is defined and produces values for all antes

**Area 3 — Modifier Systems**
- [ ] The modifier stacking order is defined as a canonical pipeline
- [ ] All conflict resolution rules are specified (at minimum: last-write-wins vs additive vs multiplicative)
- [ ] Every modifier type (Partner, House Rule, Scorepad, Tray, Boss Rule) has at least one fully worked example
- [ ] The boss rule injection mechanism references the named injection points from Area 1

**Area 4 — Card Enhancements & Wild Card Economy**
- [ ] All ten enhancement types are defined with trigger, effect, and constraints
- [ ] The enhancement interaction matrix is complete for all 10×10 pairs
- [ ] Wild card economy constraints are expressed as invariants (e.g., "a meld may contain at most N wilds where N < total meld size / 2")
- [ ] The worked example covers at least one multi-enhancement interaction

**Area 5 — UI/UX Design**
- [ ] All four screens have annotated wireframe descriptions with layout dimensions and zone labels
- [ ] All interactive states for cards, melds, and action buttons are enumerated
- [ ] The Neon Space Canasta design system token table is complete (all color, typography, and spacing tokens)
- [ ] Responsive layout changes at both breakpoints (≤1240px, ≤720px) are fully described
- [ ] Keyboard navigation map covers all interactive elements

**Area 6 — BabylonJS Rendering**
- [ ] The scene graph node hierarchy is fully described
- [ ] The card material pipeline is specified (geometry, material type, texture atlas layout)
- [ ] The animation state machine is defined with all states, transitions, and timing values
- [ ] Performance budget is stated: target fps, max draw calls, animation timing constraints
- [ ] Asset loading sequence and fallback strategy are specified

**Area 7 — Angular App Architecture**
- [ ] The component tree is fully specified with lazy-loading boundaries marked
- [ ] Every signal and computed signal is named, typed, and assigned to an owning service
- [ ] The BabylonJS integration boundary is explicitly defined as a typed contract
- [ ] All route definitions, guards, and resolvers are named and described
- [ ] All services are named with their responsibilities and injection scope

**Area 8 — Game State Management**
- [ ] All state schemas (round, deck, meld, run) are fully typed TypeScript interfaces
- [ ] All phase transitions are enumerated with guard conditions
- [ ] The persistence format is specified (storage mechanism, serialization format, schema version)
- [ ] Error handling model covers invalid state, persistence failure, and rendering error cases
- [ ] Save/load lifecycle specifies when auto-save fires and how migration works

---

## 5. Cross-Cutting Concerns

| Concern | Owner | Referenced By |
|---|---|---|
| Performance budgets (fps target, draw call limits, animation timing, state update latency) | Area 6 (BabylonJS Rendering) | Area 7 (Angular Arch), Area 8 (State Mgmt) |
| Accessibility (keyboard navigation, screen reader support, color contrast) | Area 5 (UI/UX Design) | Area 7 (Angular Arch) |
| Error handling and recovery (invalid state, persistence failure, rendering errors) | Area 8 (State Mgmt) | All areas |
| Neon Space Canasta design system tokens (color palette, typography, panel style) | Area 5 (UI/UX Design) | Area 6 (BabylonJS Rendering), Area 7 (Angular Arch) |

**Rule:** When a non-owner design document touches a cross-cutting concern, it must cite the owner document by name and section. It must not redefine the concern. For example, Area 7 must not define its own color tokens — it must reference "Area 5, Design System Tokens."

---

## 6. Authoring Guidance

### Area 1 — Game Rules & Core Mechanics
- **Audience:** Game designer + lead developer
- **Detail level:** Implementation-ready — every rule must be expressible as a pure function or decision table with no ambiguity left to the implementer
- **Pitfalls to avoid:**
  - Leaving scoring formulas as prose descriptions instead of explicit functions
  - Conflating base rules with modifier effects (modifiers belong in Area 3)
  - Omitting edge cases: what happens when a meld has exactly 7 cards with 3 wilds? What if a player goes out with no canastas?

### Area 2 — Deckbuilding & Run Structure
- **Audience:** Game designer + developer
- **Detail level:** Architectural — the card pool and progression table must be complete, but shop UI details belong in Area 5
- **Pitfalls to avoid:**
  - Omitting special cards (red threes, black threes) from the card pool enumeration
  - Leaving score target scaling as a vague "increases each ante" — provide the formula
  - Conflating shop item types with modifier definitions (item types belong here; modifier effects belong in Area 3)

### Area 3 — Modifier Systems
- **Audience:** Game designer + developer
- **Detail level:** Architectural — the modifier pipeline and stacking order must be precise, but individual modifier values (e.g., "+100 score") are examples, not final balance numbers
- **Pitfalls to avoid:**
  - Defining modifier effects without specifying when they fire (on meld? on canasta? on score calculation?)
  - Leaving conflict resolution undefined — two modifiers that both affect the same formula must have a defined resolution
  - Redefining base scoring formulas instead of referencing Area 1

### Area 4 — Card Enhancements & Wild Card Economy
- **Audience:** Game designer + developer
- **Detail level:** Implementation-ready for enhancement logic; architectural for economy constraints
- **Pitfalls to avoid:**
  - Leaving the interaction matrix incomplete — all 10×10 pairs must be addressed, even if the answer is "no interaction"
  - Conflating wild card rules with meld validity rules (meld validity belongs in Area 1; wild substitution belongs here)
  - Omitting the Anchor enhancement's effect on the meld validity function (it changes the minimum meld size from 3 to 2)

### Area 5 — UI/UX Design
- **Audience:** UI designer + frontend developer
- **Detail level:** Architectural — describes layout, interaction model, and design tokens; does not specify Angular component names, CSS class names, or BabylonJS API calls
- **Pitfalls to avoid:**
  - Specifying implementation details (e.g., "use a `cdkDrag` directive") instead of interaction behavior (e.g., "cards are draggable from hand to meld zones")
  - Omitting interactive states — every element that changes appearance based on game state must have all its states enumerated
  - Leaving the design system token table incomplete — downstream areas (6 and 7) depend on it

### Area 6 — BabylonJS Rendering
- **Audience:** Graphics developer
- **Detail level:** Implementation-ready for the rendering pipeline; architectural for the Angular integration boundary
- **Pitfalls to avoid:**
  - Specifying Angular component internals (those belong in Area 7)
  - Leaving animation timing values as "fast" or "slow" — provide millisecond values
  - Omitting the performance budget — this is the owner document for fps targets and draw call limits

### Area 7 — Angular App Architecture
- **Audience:** Frontend developer
- **Detail level:** Architectural — component tree and signal inventory must be complete; implementation details of individual components are left to the developer
- **Pitfalls to avoid:**
  - Defining signals without specifying their type or owning service
  - Leaving the BabylonJS integration boundary vague — the contract must be typed
  - Using effects for derived state (use `computed()` instead; effects are for side effects only)

### Area 8 — Game State Management
- **Audience:** Lead developer
- **Detail level:** Implementation-ready for schemas and transitions; architectural for persistence strategy
- **Pitfalls to avoid:**
  - Leaving state schemas with optional fields that should be required (prefer explicit null over optional)
  - Omitting the schema version field from the persistence format — this is required for migration
  - Conflating game rule logic with state transitions (rules belong in Area 1; state transitions belong here)

---

## 7. Roadmap Completion State

The spec-writing process is complete when:

1. All eight design documents exist and satisfy their area-specific done criteria
2. Each document has passed all three review passes:
   - **Self-review pass:** Author checks the document against the universal done checklist
   - **Cross-reference pass:** Author verifies all upstream dependency documents are cited correctly by name and section, and no upstream content is redefined
   - **Worked-example pass:** Author traces the worked example through the area's logic and confirms the output is correct
3. No document contains an unresolved forward reference to a document that has not yet been authored

Once all eight documents are marked complete, implementation task generation may begin for each area independently. Areas 6 and 7 may be implemented in parallel since neither depends on the other.

---

## 8. Worked Example — Roadmap Authoring Trace

To illustrate how the roadmap is used, here is a trace of authoring the scoring for a natural Queen canasta with The Purist partner active and a Gilded card in the meld.

**Wave 1 — Area 1 authored first.**
Area 1 defines: natural canasta base score = 500 + (card count × card value). It defines the `scoreCanasta(meld, canasta_type)` pure function. It defines the boss rule injection point `ON_CANASTA_SCORED`.

**Wave 3 — Area 3 authored.**
Area 3 defines: The Purist partner fires on `ON_CANASTA_SCORED`. Effect: if `canasta_type === 'natural'`, multiply score by 2. It references Area 1's `ON_CANASTA_SCORED` hook. It defines the modifier pipeline: `base_score → scorepad_modifiers → partner_modifiers → tray_modifiers → boss_modifiers`.

**Wave 4 — Area 4 authored.**
Area 4 defines: Gilded enhancement fires when a card is melded. Effect: +50 added to the meld's running score. It references Area 1's meld scoring and Area 3's modifier pipeline (Gilded fires before the pipeline, contributing to `base_score`).

**Wave 5 — Area 8 authored.**
Area 8 defines the `MeldState` schema including `cards: CardState[]`, `canastaType: CanastaType | null`, `score: number`. It defines the `CANASTA_SEALED` state transition that triggers score calculation.

**Trace of the scenario:**
1. Player seals a 7-Queen natural canasta. One Queen has the Gilded enhancement.
2. Area 4: Gilded fires → +50 added to meld running score.
3. Area 1: `scoreCanasta` called → base = 500 + (7 × 10) = 570. Add Gilded contribution: 570 + 50 = 620.
4. Area 3: modifier pipeline runs → The Purist fires on `ON_CANASTA_SCORED` → 620 × 2 = 1,240.
5. Area 8: `MeldState.score` updated to 1,240. `CANASTA_SEALED` transition fires.
6. Area 5: Score Results screen displays 1,240 for the Queens canasta with "Purist bonus active" label.

This trace confirms the dependency order is correct: Area 1 must exist before Area 3 can reference its hooks, Area 3 must exist before Area 4 can reference the modifier pipeline, and Area 8 must exist before Area 5 can display the result.
