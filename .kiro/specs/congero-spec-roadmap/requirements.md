# Requirements Document

## Introduction

This is a meta-spec for **Congero** — a roguelite canasta deckbuilder browser game inspired by Balatro, built with BabylonJS and Angular 21. Rather than specifying the game itself, this document defines the requirements for a **spec-writing roadmap**: a structured plan that identifies every distinct area of concern in the Congero codebase, specifies what each area's design document must cover, establishes the ordering and dependencies between areas, and defines what "done" looks like for the entire spec-writing process.

The output of this roadmap is a set of eight design documents — one per concern area — that together provide sufficient technical guidance to implement Congero from scratch.

## Glossary

- **Congero**: The roguelite canasta deckbuilder game being designed and built.
- **Spec Roadmap**: This meta-spec — the plan for producing all design documents.
- **Design Document**: A technical design doc for one concern area, covering architecture, data models, algorithms, and interfaces. No requirements or task lists — design only.
- **Concern Area**: A distinct, bounded domain of the Congero system (e.g., game rules, UI/UX, rendering).
- **Dependency**: A relationship where one design document must be completed before another can be authored, because the latter references decisions made in the former.
- **Done Criteria**: The conditions under which a design document is considered complete and ready for implementation.
- **BabylonJS**: The 3D rendering engine used for the Congero table scene, card visuals, and animations.
- **Angular 21**: The frontend framework used for Congero's component architecture, routing, and reactive state via signals.
- **Canasta**: A card game mechanic involving melds of seven or more same-rank cards; the core scoring unit in Congero.
- **Meld**: Three or more same-rank cards played to the table, which can be extended toward a canasta.
- **Run**: A single playthrough of Congero, consisting of multiple rounds with escalating score targets.
- **Round**: One scoring cycle within a run — draw, play melds, complete canastas, score, then shop.
- **Ante**: A grouping of rounds that escalates difficulty; boss rounds appear at the end of each ante.
- **Partner**: A passive modifier slot that applies a persistent rule to the player's run.
- **House Rule**: A global run mutation purchased or encountered during a run.
- **Scorepad**: A modifier that alters scoring formulas for specific canasta types or events.
- **Tray**: A meld-slot modifier that applies a bonus or constraint to the meld placed in it.
- **Card Enhancement**: An upgrade applied to an individual card (e.g., Gilded, Echo, Sticky, Marked, Pure, Hot, Frozen, Partner, Buried, Anchor).
- **Wild Card**: A 2 or Joker that can substitute for any rank in a meld.
- **Natural Canasta**: A canasta of seven or more same-rank cards with no wild cards.
- **Dirty Canasta**: A canasta that includes one or more wild cards.
- **Boss Round**: A round with a hostile table rule that attacks common strategies.
- **Neon Space Canasta**: The visual design system for Congero — dark sci-fi aesthetic with cyan, magenta, and gold accents.

---

## Requirements

### Requirement 1: Define the Eight Concern Areas

**User Story:** As a spec author, I want a canonical list of concern areas for Congero, so that I know exactly which design documents need to be produced and nothing is missed.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL define exactly eight concern areas for Congero: Game Rules & Core Mechanics, Deckbuilding & Run Structure, Modifier Systems, Card Enhancements & Wild Card Economy, UI/UX Design, BabylonJS Rendering, Angular App Architecture, and Game State Management.
2. THE Spec_Roadmap SHALL assign a unique identifier (Area 1 through Area 8) to each concern area.
3. THE Spec_Roadmap SHALL provide a one-paragraph scope statement for each concern area that defines what is in scope and what is explicitly out of scope for that area's design document.
4. WHEN two concern areas share a boundary concept (e.g., scoring formulas appear in both Game Rules and Modifier Systems), THE Spec_Roadmap SHALL designate which area owns the canonical definition and which area references it.

---

### Requirement 2: Specify the Content of Each Design Document

**User Story:** As a spec author, I want a clear content specification for each design document, so that each doc is complete and consistent without overlap or gaps.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL specify the required sections for each design document, including at minimum: Overview, Data Models, Core Algorithms or Logic, Interfaces & Contracts, and Open Questions.
2. THE Spec_Roadmap SHALL specify that the Game Rules & Core Mechanics design document covers: canasta rule definitions (natural, dirty, super, red, frozen, partner, concealed out), meld validity rules, scoring formulas for all canasta types and bonuses, turn structure, going-out conditions, and boss round rule injection points.
3. THE Spec_Roadmap SHALL specify that the Deckbuilding & Run Structure design document covers: card pool composition, run and ante progression, round lifecycle, shop mechanics, card acquisition and removal, upgrade pricing, and score target scaling.
4. THE Spec_Roadmap SHALL specify that the Modifier Systems design document covers: Partner slot architecture, House Rule application model, Scorepad formula composition, Tray slot mechanics, boss rule injection, and modifier stacking and conflict resolution.
5. THE Spec_Roadmap SHALL specify that the Card Enhancements & Wild Card Economy design document covers: all ten enhancement types (Gilded, Echo, Sticky, Marked, Pure, Hot, Frozen, Partner, Buried, Anchor), wild card substitution rules, enhancement interaction matrix, and wild card economy constraints.
6. THE Spec_Roadmap SHALL specify that the UI/UX Design document covers: the four screens (Gameplay HUD, Deck/Inventory, Shop Rewards, Score Results), interaction model (drag-and-drop, selection, confirmation), responsive breakpoints, the Neon Space Canasta design system tokens, and accessibility considerations.
7. THE Spec_Roadmap SHALL specify that the BabylonJS Rendering design document covers: scene graph structure for the 3D table, card mesh and material pipeline, animation system (deal, meld, seal, discard), particle and glow effects, camera and lighting setup, and asset loading strategy.
8. THE Spec_Roadmap SHALL specify that the Angular App Architecture design document covers: module and component tree, signal-based reactive state model, functional reactivity patterns, routing structure, service layer design, and integration points with BabylonJS.
9. THE Spec_Roadmap SHALL specify that the Game State Management design document covers: round state schema, deck state schema, meld state schema, run persistence model, save/load lifecycle, and state transition rules between game phases.

---

### Requirement 3: Establish Ordering and Dependencies Between Design Documents

**User Story:** As a spec author, I want a dependency graph for the eight design documents, so that I can author them in an order that avoids forward references and rework.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL define a directed dependency graph where each edge `A → B` means "Design Document A must be completed before Design Document B can be authored."
2. THE Spec_Roadmap SHALL specify that Game Rules & Core Mechanics (Area 1) has no upstream dependencies and is the first document to be authored.
3. THE Spec_Roadmap SHALL specify that Deckbuilding & Run Structure (Area 2) depends on Area 1, because run progression references scoring targets and canasta types defined in game rules.
4. THE Spec_Roadmap SHALL specify that Modifier Systems (Area 3) depends on Area 1 and Area 2, because modifiers alter rules and shop/run mechanics defined in those areas.
5. THE Spec_Roadmap SHALL specify that Card Enhancements & Wild Card Economy (Area 4) depends on Area 1 and Area 3, because enhancements interact with meld rules and modifier stacking.
6. THE Spec_Roadmap SHALL specify that Game State Management (Area 8) depends on Areas 1 through 4, because the state schema must represent all game entities defined in those areas.
7. THE Spec_Roadmap SHALL specify that UI/UX Design (Area 5) depends on Areas 1 through 4, because the four screens must reflect all game entities, flows, and modifier states.
8. THE Spec_Roadmap SHALL specify that Angular App Architecture (Area 7) depends on Area 5 and Area 8, because the component tree and signal model are shaped by the UI design and state schema.
9. THE Spec_Roadmap SHALL specify that BabylonJS Rendering (Area 6) depends on Area 5 and Area 7, because the rendering pipeline is driven by the UI design and the Angular integration contract.
10. THE Spec_Roadmap SHALL present the dependency graph as both a textual adjacency list and a visual ASCII diagram.

---

### Requirement 4: Define "Done" Criteria for Each Design Document

**User Story:** As a spec author, I want explicit done criteria for each design document, so that I can objectively determine when a doc is ready for implementation to begin.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL define a universal done checklist that applies to every design document, including: all required sections are present, all data models are fully typed, all algorithms are described at pseudocode or decision-table level, all interfaces between this area and adjacent areas are explicitly named and typed, and all open questions are either resolved or explicitly deferred with a rationale.
2. THE Spec_Roadmap SHALL define area-specific done criteria for Game Rules & Core Mechanics, including: every canasta type has a complete scoring formula, every boss rule has a defined injection point, and the meld validity function is fully specified.
3. THE Spec_Roadmap SHALL define area-specific done criteria for Deckbuilding & Run Structure, including: the full card pool is enumerated, the shop item generation algorithm is specified, and the ante/round progression table is complete.
4. THE Spec_Roadmap SHALL define area-specific done criteria for Modifier Systems, including: the modifier stacking order is defined, all conflict resolution rules are specified, and every modifier type has at least one worked example.
5. THE Spec_Roadmap SHALL define area-specific done criteria for Card Enhancements & Wild Card Economy, including: the enhancement interaction matrix is complete for all ten enhancement types, and the wild card economy constraints are expressed as invariants.
6. THE Spec_Roadmap SHALL define area-specific done criteria for UI/UX Design, including: all four screens have annotated wireframe descriptions, all interactive states are enumerated, and the design system token mapping is complete.
7. THE Spec_Roadmap SHALL define area-specific done criteria for BabylonJS Rendering, including: the scene graph is fully described, the card material pipeline is specified, and the animation state machine is defined.
8. THE Spec_Roadmap SHALL define area-specific done criteria for Angular App Architecture, including: the component tree is fully specified, every signal and computed value is named and typed, and the BabylonJS integration boundary is explicitly defined.
9. THE Spec_Roadmap SHALL define area-specific done criteria for Game State Management, including: all state schemas are fully typed, all state transitions are enumerated, and the persistence format is specified.

---

### Requirement 5: Capture Cross-Cutting Concerns

**User Story:** As a spec author, I want cross-cutting concerns identified and assigned to specific design documents, so that topics like error handling, performance, and accessibility are not lost between areas.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL identify all cross-cutting concerns that span multiple design documents and assign each to a primary owner document.
2. THE Spec_Roadmap SHALL assign performance budgets (frame rate targets, animation timing, state update latency) as a cross-cutting concern owned by the BabylonJS Rendering design document, with references from Angular App Architecture and Game State Management.
3. THE Spec_Roadmap SHALL assign accessibility (keyboard navigation, screen reader support, color contrast compliance) as a cross-cutting concern owned by the UI/UX Design document, with references from Angular App Architecture.
4. THE Spec_Roadmap SHALL assign error handling and recovery (invalid game state, failed persistence, rendering errors) as a cross-cutting concern owned by the Game State Management document, with references from all other areas.
5. THE Spec_Roadmap SHALL assign the Neon Space Canasta design system token definitions as a cross-cutting concern owned by the UI/UX Design document, with references from BabylonJS Rendering and Angular App Architecture.
6. WHEN a cross-cutting concern is referenced in a non-owner design document, THE Spec_Roadmap SHALL specify that the non-owner document must cite the owner document rather than redefine the concern.

---

### Requirement 6: Provide Authoring Guidance for Each Design Document

**User Story:** As a spec author, I want authoring guidance for each design document, so that each doc is written at the right level of detail and avoids common pitfalls.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL provide authoring guidance for each design document that specifies: the intended audience, the expected level of detail (conceptual, architectural, or implementation-ready), and the primary pitfalls to avoid.
2. THE Spec_Roadmap SHALL specify that Game Rules & Core Mechanics must be implementation-ready — every rule must be expressible as a pure function or decision table, with no ambiguity left to the implementer.
3. THE Spec_Roadmap SHALL specify that UI/UX Design must be architectural — it describes layout, interaction model, and design tokens, but does not specify Angular component names or BabylonJS API calls.
4. THE Spec_Roadmap SHALL specify that BabylonJS Rendering must be implementation-ready for the rendering pipeline and architectural for the Angular integration boundary.
5. THE Spec_Roadmap SHALL specify that each design document must avoid re-specifying rules or schemas already defined in an upstream dependency document, and must instead reference the upstream document by name and section.
6. THE Spec_Roadmap SHALL specify that each design document must include at least one worked example that traces a concrete game scenario (e.g., "player seals a natural Queen canasta with a Gilded card and The Purist partner active") through the area's logic.

---

### Requirement 7: Define the Roadmap's Own Completion State

**User Story:** As a project lead, I want a clear definition of when the entire spec-writing process is complete, so that the team can confidently transition from design to implementation.

#### Acceptance Criteria

1. THE Spec_Roadmap SHALL define the spec-writing process as complete when all eight design documents satisfy their respective done criteria and have been reviewed and approved.
2. THE Spec_Roadmap SHALL specify that the review process for each design document includes: a self-review pass against the universal done checklist, a cross-reference pass verifying all upstream dependencies are cited correctly, and a worked-example pass verifying the example traces correctly through the area's logic.
3. THE Spec_Roadmap SHALL specify that no design document may be marked complete if it contains unresolved forward references to a design document that has not yet been authored.
4. WHEN all eight design documents are marked complete, THE Spec_Roadmap SHALL be considered done and implementation task generation may begin for each area independently.
5. THE Spec_Roadmap SHALL specify that design documents for areas with no downstream dependencies (BabylonJS Rendering and Angular App Architecture) may be authored in parallel once their upstream dependencies are satisfied.
