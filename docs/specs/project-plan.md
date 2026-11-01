# Congero — Project Plan

## Overview

This is the master project plan for implementing Congero, a roguelite canasta deckbuilder. It is organized into **8 areas** that mirror the design documents in `.kiro/specs/`. Each area has a detailed sub-plan in its own file. This document provides the full implementation order, dependency graph, and milestone checkpoints.

**Design docs:** `.kiro/specs/congero-*/design.md`
**Tech specs:** `docs/specs/area-*.md`

---

## Implementation Waves

The project is organized into **7 waves** based on the dependency graph. Areas within the same wave can be implemented in parallel. Each wave has a checkpoint that must be satisfied before the next wave begins.

```
Wave 1: Area 1 (Game Rules) — no dependencies
Wave 2: Area 2 (Deckbuilding) — depends on Area 1
Wave 3: Area 3 (Modifier Systems) — depends on Areas 1, 2
Wave 4: Area 4 (Card Enhancements) — depends on Areas 1, 3
Wave 5: Area 5 (UI/UX) + Area 8 (State Management) — depends on Areas 1–4 (parallel)
Wave 6: Area 7 (Angular Architecture) — depends on Areas 5, 8
Wave 7: Area 6 (BabylonJS Rendering) — depends on Areas 5, 7
```

---

## Area Summary

| Area | Name | File | Depends On | Wave |
|------|------|------|------------|------|
| 1 | Game Rules & Core Mechanics | [area-1-game-rules.md](area-1-game-rules.md) | — | 1 |
| 2 | Deckbuilding & Run Structure | [area-2-deckbuilding.md](area-2-deckbuilding.md) | Area 1 | 2 |
| 3 | Modifier Systems | [area-3-modifiers.md](area-3-modifiers.md) | Areas 1, 2 | 3 |
| 4 | Card Enhancements & Wild Card Economy | [area-4-enhancements.md](area-4-enhancements.md) | Areas 1, 3 | 4 |
| 5 | UI/UX Design | [area-5-ui-ux.md](area-5-ui-ux.md) | Areas 1–4 | 5 |
| 6 | BabylonJS Rendering | [area-6-babylonjs.md](area-6-babylonjs.md) | Areas 5, 7 | 7 |
| 7 | Angular App Architecture | [area-7-angular.md](area-7-angular.md) | Areas 5, 8 | 6 |
| 8 | Game State Management | [area-8-state.md](area-8-state.md) | Areas 1–4 | 5 |

---

## Milestones

### Milestone 1 — Core Game Logic Complete (End of Wave 4)
**Deliverable:** All game rules, deckbuilding, modifiers, and enhancements are implemented and unit-testable without any UI.

- [ ] Area 1: `GameRulesService` with pure functions for meld validation, scoring, canasta type determination
- [ ] Area 2: `DeckbuildingService` with card pool, run progression, shop generation, card acquisition
- [ ] Area 3: `ModifierService` with partner slots, house rules, scorepads, trays, boss rules, modifier pipeline
- [ ] Area 4: `EnhancementService` with all 10 enhancement types, wild card rules, economy invariants
- [ ] Checkpoint: All pure-transform logic is covered by unit tests. No Angular/BabylonJS dependencies.

### Milestone 2 — State & UI Design Complete (End of Wave 5)
**Deliverable:** State management layer and UI/UX spec are ready for frontend implementation.

- [ ] Area 8: `GameStateService` with all state schemas, phase transitions, persistence, error recovery
- [ ] Area 5: UI component specs, design token CSS variables, interaction model, accessibility requirements
- [ ] Checkpoint: State schemas are serializable. Design tokens are defined as CSS custom properties.

### Milestone 3 — Frontend Architecture Complete (End of Wave 6)
**Deliverable:** Angular app architecture is implemented with DSFR pattern, routing, and BabylonJS boundary.

- [ ] Area 7: Angular module structure, component tree, signal inventory, service layer, routing, BabylonJS boundary contract
- [ ] Checkpoint: Angular app boots, routes work, signals flow correctly, BabylonJS scene initializes.

### Milestone 4 — Rendering Complete (End of Wave 7)
**Deliverable:** Full BabylonJS rendering pipeline with animations, particles, and performance budget.

- [ ] Area 6: Scene graph, card mesh pipeline, animation state machine, particle effects, performance budget
- [ ] Checkpoint: Game is playable end-to-end with full visual fidelity at 60fps.

---

## Cross-Cutting Concerns

| Concern | Owner Area | Consumer Areas | Description |
|---------|-----------|----------------|-------------|
| Design Tokens | Area 5 | Areas 6, 7 | Neon Space Canasta color palette, typography, spacing, panel styles, background effects |
| Error Handling | Area 8 | All areas | Invalid state detection, rollback, persistence failure, rendering error fallback |
| Performance Budget | Area 6 | Areas 7, 8 | Target 60fps, max draw calls, particle limits, animation timing constraints |
| BabylonJS Boundary | Area 7 | Area 6 | Typed contract for Angular signal → scene update, scene event → Angular signal |
| DSFR Architecture | Area 7 | All frontend | Domain-scoped reactive state, pure transforms, entry points, isolated effects |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Angular 21** | Signals-based reactivity, standalone components, `linkedSignal` for writable derived state that auto-resets on source change, `linkedResource`/`resource` APIs, `@let` template syntax. `linkedSignal` is used for `selected-card-id` and `current-screen` to prevent stale UI state. |
| 3D Rendering | **BabylonJS 9.9.1** | PBR materials, particle systems, animation state engine. v9 includes improved WebGPU support, better instanced rendering, and `Mesh.thinInstance` optimizations critical for 108-card scenes. |
| State Management | Angular signals + DSFR pattern | `signal()` for source of truth, `computed()` for read-only derivations, `linkedSignal()` for writable derived state (e.g., `selected-card-id`, `current-screen`), `effect()` for side effects only. No external state library. |
| Styling | CSS custom properties + SCSS | Design tokens from Area 5 as CSS variables. Angular 21's `host` binding improvements for component-scoped tokens. |
| Persistence | localStorage (MVP), IndexedDB (post-MVP) | JSON serialization with schema versioning |
| Testing | Vitest (unit), Cypress (e2e) | Pure transforms tested in isolation; components tested with Angular Testing Library. Vitest chosen for speed and native ESM. |
| Build | Angular CLI + Vite | Angular 21 CLI with Vite/esbuild. Fast HMR during development. |

---

## File Structure (Planned)

```
src/
├── app/
│   ├── core/                          # Singleton services (DSFR domain containers)
│   │   ├── game-rules/                # Area 1: Pure transforms
│   │   │   ├── game-rules.service.ts
│   │   │   ├── meld-validation.ts
│   │   │   ├── scoring.ts
│   │   │   └── game-rules.spec.ts
│   │   ├── deckbuilding/              # Area 2: Run/deck/shop state
│   │   │   ├── deckbuilding.service.ts
│   │   │   ├── card-pool.ts
│   │   │   ├── run-progression.ts
│   │   │   ├── shop-generation.ts
│   │   │   └── deckbuilding.spec.ts
│   │   ├── modifiers/                 # Area 3: Modifier pipeline
│   │   │   ├── modifier.service.ts
│   │   │   ├── modifier-pipeline.ts
│   │   │   ├── partner-slots.ts
│   │   │   ├── boss-rules.ts
│   │   │   └── modifier.spec.ts
│   │   ├── enhancements/              # Area 4: Enhancement application
│   │   │   ├── enhancement.service.ts
│   │   │   ├── enhancement-interactions.ts
│   │   │   ├── wild-card-rules.ts
│   │   │   └── enhancement.spec.ts
│   │   ├── state/                     # Area 8: State management
│   │   │   ├── game-state.service.ts
│   │   │   ├── round-state.service.ts
│   │   │   ├── deck-state.service.ts
│   │   │   ├── meld-state.service.ts
│   │   │   ├── persistence.service.ts
│   │   │   ├── error-recovery.service.ts
│   │   │   └── state.spec.ts
│   │   ├── scene-bridge/              # Area 7: BabylonJS boundary
│   │   │   ├── scene-bridge.service.ts
│   │   │   └── babylonjs-boundary.ts
│   │   └── routing/
│   │       ├── app.routes.ts
│   │       ├── guards/
│   │       └── resolvers/
│   ├── features/
│   │   ├── gameplay/                  # Lazy-loaded
│   │   │   ├── gameplay.component.ts
│   │   │   ├── components/
│   │   │   │   ├── hud/
│   │   │   │   ├── hand/
│   │   │   │   ├── table/
│   │   │   │   ├── discard-pile/
│   │   │   │   ├── draw-pile/
│   │   │   │   ├── action-bar/
│   │   │   │   └── modifier-bar/
│   │   │   └── services/
│   │   │       └── ui-state.service.ts
│   │   ├── deck-inventory/            # Lazy-loaded
│   │   ├── shop/                      # Lazy-loaded
│   │   └── score-results/             # Lazy-loaded
│   ├── shared/
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   ├── assets/
│   │   ├── textures/                  # Card face atlas, particle sprites
│   │   └── fonts/
│   └── styles/
│       ├── _tokens.scss               # Area 5 design tokens as CSS variables
│       ├── _mixins.scss
│       └── main.scss
├── babylonjs/                         # Area 6: Rendering engine
│   ├── scene/
│   │   ├── scene-manager.ts
│   │   ├── scene-graph.ts
│   │   └── camera-setup.ts
│   ├── cards/
│   │   ├── card-mesh-factory.ts
│   │   ├── card-materials.ts
│   │   └── texture-atlas.ts
│   ├── animation/
│   │   ├── animation-state-machine.ts
│   │   └── animation-controller.ts
│   ├── effects/
│   │   ├── glow-layer.ts
│   │   └── particle-systems.ts
│   └── performance/
│       └── performance-monitor.ts
└── docs/
    └── specs/                         # This project plan
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| BabylonJS performance on low-end devices | High | Strict performance budget (Area 6). LOD for card meshes. GPU particle fallback to CPU. |
| Modifier pipeline complexity | Medium | Pure transform architecture (DSFR). Each modifier type tested independently. Composition tested via integration tests. |
| State synchronization between Angular and BabylonJS | High | Single direction of data flow: Angular signals → BabylonJS via explicit effect calls. BabylonJS events → Angular via entry points only. |
| Scope creep in enhancement interactions | Medium | 10×10 matrix fully specified in design doc. Each pair has exactly one classification. No runtime discovery. |
| Save/load migration complexity | Medium | Schema version field in RunState. Sequential migration functions. Always validate on load. |
| Drag-and-drop accessibility | Medium | Click-to-select fallback. Full keyboard navigation map (Area 5). ARIA live regions for state changes. |

---

## Cross-Cutting Integration Specifications

### Design Token Propagation (Area 5 → Areas 6, 7)

**Problem:** Area 5 defines design tokens as CSS custom properties. Area 6 needs to map them to BabylonJS PBR material properties. Area 7 needs to expose them to Angular components.

**Solution:** A single `DesignTokenService` (Area 7, feature-scoped to the root component) reads the SCSS custom properties at runtime via `getComputedStyle()` and exposes them as a `signal<DesignToken[]>`.

```typescript
// Area 7 — DesignTokenService (root-scoped)
@Injectable({ providedIn: 'root' })
export class DesignTokenService {
  private readonly tokens = signal<DesignToken[]>([]);
  
  constructor() {
    // Read CSS custom properties once at init
    this.tokens.set(this.readCssTokens());
  }
  
  private readCssTokens(): DesignToken[] {
    const style = getComputedStyle(document.documentElement);
    return Object.entries(TOKEN_CSS_MAP).map(([tokenId, cssVar]) => ({
      tokenId,
      value: style.getPropertyValue(cssVar).trim(),
      cssVar,
    }));
  }
}
```

**Area 6 integration:** `SceneBridgeService` injects `DesignTokenService` and calls `getMaterialColor(tokenId: string): Color3` which reads from the signal and converts hex to BabylonJS `Color3`.

**Runtime token changes:** If tokens change (e.g., theme switch), `DesignTokenService` re-reads CSS properties and updates the signal. Angular effects in Area 6 automatically propagate changes to BabylonJS materials. No shader recompilation needed — only emissive/diffuse color updates.

### Signal Derivation Timing (Area 7 ↔ Area 8)

**Problem:** Area 7 derives signals from Area 8's state schemas. The timing of when signals recalculate during state transitions must be specified to avoid stale reads.

**Solution:** Area 8's state transitions are **synchronous** — they call `.set()` or `.update()` on signals and return. Angular's `computed()` signals recalculate **lazily** (on next read), not eagerly. This means:

1. **During a transition:** Area 8 calls `roundState.set(newState)`. Computed signals depending on `roundState` are marked as "dirty" but not yet recalculated.
2. **After the transition:** When a component or effect reads a computed signal, Angular recalculates it from the new `roundState`. This is guaranteed to see the latest value.
3. **No intermediate state:** Because JavaScript is single-threaded and transitions are synchronous, there is no window where a computed signal could return a stale value mid-transition.

**Performance for large state objects:** `RunState` can be large (~50-200 KB serialized). To avoid expensive recalculations:
- Use `computed()` with fine-grained selectors (e.g., `computed(() => runState().roundState?.phase)`) rather than deriving from the entire `RunState`.
- Angular's `computed()` uses memoization — it only recalculates when its direct dependencies change.
- For deeply nested derivations, use `shallowEqual` comparison or split into multiple `computed()` signals.

**Cache invalidation:** Angular `computed()` signals automatically track dependencies. When `runState()` changes, all computed signals that read from it are marked dirty. No manual cache invalidation is needed.

### Enhancement Duration Tracking (Area 4 → Area 8)

**Problem:** Temporary modifier-granted enhancements expire at end of round. The mechanism for tracking and expiring them must be specified.

**Solution:** The `Enhancement.appliedViaSeal` boolean doubles as a duration flag:
- `appliedViaSeal: true` → permanent (never expires automatically).
- `appliedViaSeal: false` → temporary (expires at end of round).

Area 8's `RoundStateService.endRound()` iterates the deck and removes all enhancements where `!enhancement.appliedViaSeal`. Mid-round modifier deactivation does NOT immediately expire enhancements — they persist until end of round to prevent cascading failures.

### Deep Clone for Rollback (Area 8)

**Problem:** Rollback recovery needs to clone `RunState`. The implementation must be safe and performant.

**Solution:** Use `JSON.parse(JSON.stringify(state))` — safe because `RunState` contains only plain types (no circular references in the clone target, no class instances, no `Date` objects, no `undefined`). Performance: <5ms for a full state snapshot. The rollback algorithm clones only the immediate `lastValidState`, not the full chain, keeping the clone bounded.

### Asset Loading Fallback (Area 6)

**Problem:** Texture loads can fail. The fallback strategy must be specified.

**Solution:** Three-level fallback:
1. **Texture atlas failure:** Solid-color card faces with rank/suit text rendered via BabylonJS `DynamicTexture`. Toast notification to user.
2. **Particle texture failure:** Default point sprites (white circles) instead of themed sprites. No notification — degradation is subtle.
3. **Normal map failure:** Flat shading (roughness 1.0, no normal). Logged as warning only.

All fallbacks are per-asset — if only the normal map fails, atlas and particles still load normally. Game remains fully playable under any fallback combination.

### `selectBossRule` Integration (Area 2 ↔ Area 3)

**Problem:** Area 2's `buildRound()` needs to call Area 3's `selectBossRule()`, but the exact signature and wiring were ambiguous.

**Solution:**
- **Area 2** declares `type SelectBossRuleFn = (anteNumber: number, bossRulePool: BossRule[]) => string` and accepts it as a parameter to `buildRound()`.
- **Area 3** exports a concrete `selectBossRule(anteNumber, bossRulePool): string` implementing weighted random selection.
- **Area 7** (composition root) wires them: calls `buildRound(ante, round, absRound, selectBossRule)` where `selectBossRule` is imported from Area 3 and the `bossRulePool` is read from `ModifierStateService`.
- **The boss rule pool** is owned by Area 3's canonical data. Area 2 never constructs or filters it.
- **In tests:** Pass a stub: `const stub = (ante: number) => 'the-purist';`

## Open Questions

| # | Question | Resolution | Rationale |
|---|----------|------------|-----------|
| 1 | BabylonJS version? | **BabylonJS 9.9.1** | Latest stable. WebGPU support, `Mesh.thinInstance` for efficient 108-card rendering, improved particle systems. |
| 2 | Angular version? | **Angular 21** | Latest stable. First-class signals (`linkedSignal`, `resource`, `linkedResource`), `@let` template syntax, improved standalone component APIs, Vite/esbuild build pipeline. |
| 3 | Testing framework? | **Vitest** | Faster than Jest, native ESM, compatible with Angular 21 via `@analogjs/vite-plugin-angular`. |
| 4 | Card face art: procedural or hand-crafted? | **Hand-crafted by the developer** | Custom card face art will be created directly and packed into the texture atlas. No procedural generation needed. |
| 5 | Multiplayer: future need? | **No for MVP** | Architecture should not preclude it (state is serializable), but no implementation work needed now. |
| 6 | i18n from the start? | **Yes, minimally** | All user-facing strings should be in a translation file from day one. The architecture (DSFR) already separates logic from display. |
