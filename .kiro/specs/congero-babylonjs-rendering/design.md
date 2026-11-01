# Design Document — Area 6: BabylonJS Rendering

## Overview

Area 6 defines the BabylonJS rendering pipeline for Congero: the scene graph hierarchy, the card mesh pipeline (geometry, PBR materials, emissive glow, texture atlas), the camera and lighting setup, the animation state machine with timing values in milliseconds, the glow and particle effects system, and the performance budget. Area 6 depends on Area 5 (UI/UX Design) for design token references (material colors, glow colors, panel styles) and on Area 7 (Angular App Architecture) for the BabylonJS integration boundary contract that governs how Angular signals drive scene updates and how scene events propagate back to Angular. Area 6 implements the scene-side rendering logic — it does not own the integration boundary contract (Area 7 owns it). Area 6 is the owner document for performance budgets — Areas 7 and 8 reference this section.

**Out of scope for this document:** Angular component structure and service layer (Area 7), game rule logic (Area 1), UI layout and wireframe descriptions (Area 5), state persistence (Area 8), modifier stacking order (Area 3), card enhancement definitions (Area 4), deckbuilding mechanics (Area 2). Design tokens are owned by Area 5 — Area 6 references them by name and section but does not redefine them.

---

## 1. Data Models

All types are TypeScript. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

```typescript
// ─── Imports from upstream areas ─────────────────────────────────────────────

import type {
  Card, Meld, CanastaType, MeldValidationResult,
} from './area1-game-rules';
import type {
  DesignToken,
} from './area5-ui-ux';
import type {
  BabylonJSBoundaryContract,
} from './area7-angular-architecture';

// ─── Scene Node ──────────────────────────────────────────────────────────────

/**
 * A node in the BabylonJS scene graph hierarchy.
 * Every renderable element in the scene is a SceneNode.
 */
export interface SceneNode {
  /** Unique identifier for this scene node. */
  id: string;
  /** The BabylonJS mesh or transform node name. */
  nodeName: string;
  /** The type of node in the hierarchy. */
  nodeType: 'root' | 'table' | 'meldZone' | 'cardMesh' | 'uiOverlay' | 'particleSystem' | 'light' | 'camera';
  /** The parent node ID, or null for the root node. */
  parentNodeId: string | null;
  /** Child node IDs. Empty array for leaf nodes. */
  childNodeIds: string[];
  /** The BabylonJS mesh reference (only for mesh-type nodes). */
  meshId: string | null;
  /** The BabylonJS material reference (only for mesh-type nodes). */
  materialId: string | null;
  /** The BabylonJS transform position (world space). */
  position: { x: number; y: number; z: number };
  /** The BabylonJS transform rotation (Euler angles in radians). */
  rotation: { x: number; y: number; z: number };
  /** The BabylonJS transform scale. */
  scale: { x: number; y: number; z: number };
}

// ─── Card Mesh ───────────────────────────────────────────────────────────────

/**
 * The visual representation of a single card in the BabylonJS scene.
 * Each card mesh uses the shared card geometry with a unique material
 * instance for its face texture and glow state.
 */
export interface CardMesh {
  /** The card ID this mesh represents (matches Card.id from Area 1). */
  cardId: string;
  /** The scene node ID for this card's root node. */
  sceneNodeId: string;
  /** The mesh ID for the card face (front). */
  faceMeshId: string;
  /** The mesh ID for the card back. */
  backMeshId: string;
  /** The material ID for the card face. */
  faceMaterialId: string;
  /** The material ID for the card back (shared across all cards). */
  backMaterialId: string;
  /** The current visual state of this card. */
  visualState: 'default' | 'selected' | 'playable' | 'unplayable' | 'wild' | 'enhanced' | 'sealed' | 'dragging' | 'buried';
  /** The enhancement visual indicator type, or null if no enhancement. */
  enhancementIndicator: EnhancementIndicatorType | null;
  /** The emissive glow intensity (0.0 = no glow, 1.0 = full glow). */
  glowIntensity: number;
  /** The glow color key from the design token table (Area 5). */
  glowColorToken: string | null;
  /** The texture atlas coordinates for this card's face. */
  atlasCoords: TextureAtlasCoords;
  /** True if the card is currently face-up. */
  isFaceUp: boolean;
  /** The z-order for rendering (higher = closer to camera). */
  zOrder: number;
}

/**
 * Texture atlas coordinates for a card face.
 * The texture atlas is a single texture containing all card faces.
 */
export interface TextureAtlasCoords {
  /** Left edge (0-1 UV space). */
  u0: number;
  /** Top edge (0-1 UV space). */
  v0: number;
  /** Right edge (0-1 UV space). */
  u1: number;
  /** Bottom edge (0-1 UV space). */
  v1: number;
}

/**
 * Enhancement visual indicator types.
 * Each enhancement type has a distinct visual indicator on the card mesh.
 */
export type EnhancementIndicatorType =
  | 'gilded'    // Gold border glow
  | 'echo'      // Cyan pulse ring
  | 'sticky'    // Red lock icon
  | 'marked'    // Red star badge
  | 'pure'      // White halo
  | 'hot'       // Orange flame particles
  | 'frozen'    // Blue ice crystal overlay
  | 'partner'   // Green chain link icon
  | 'buried'    // Dark fog overlay
  | 'anchor';   // Purple anchor icon

// ─── Animation State ─────────────────────────────────────────────────────────

/**
 * The animation state machine for card and scene animations.
 * All timing values are in milliseconds.
 */
export interface AnimationState {
  /** The current animation state. */
  state: AnimationStateType;
  /** The animation state machine owning this animation. */
  machineId: string;
  /** The start time of the current animation (performance.now()). */
  startTime: number;
  /** The duration of the current animation in milliseconds. */
  durationMs: number;
  /** The easing function for this animation. */
  easing: EasingFunction;
  /** The target value being animated toward. */
  targetValue: AnimationTargetValue | null;
}

/**
 * All animation states in the state machine.
 */
export type AnimationStateType =
  | 'Idle'
  | 'Dealing'
  | 'Melding'
  | 'Sealing'
  | 'Discarding'
  | 'Drawing'
  | 'Selecting'
  | 'Deselecting'
  | 'Dragging'
  | 'Hovering'
  | 'Transitioning'
  | 'ScoreReveal'
  | 'ShopEntrance'
  | 'ScreenTransition';

/**
 * Easing functions for animations.
 */
export type EasingFunction =
  | 'linear'
  | 'easeInOutQuad'
  | 'easeOutBack'
  | 'easeInCubic'
  | 'easeOutElastic'
  | 'easeOutBounce';

/**
 * The target value being animated.
 */
export interface AnimationTargetValue {
  /** The property being animated. */
  property: 'position' | 'rotation' | 'scale' | 'glowIntensity' | 'opacity' | 'zOrder';
  /** The target value (interpretation depends on property). */
  value: { x: number; y: number; z: number } | number;
}

// ─── Particle Effect Config ──────────────────────────────────────────────────

/**
 * Configuration for a particle system effect.
 */
export interface ParticleEffectConfig {
  /** Unique identifier for this particle effect type. */
  id: string;
  /** The display name for debugging. */
  name: string;
  /** The number of particles in the system. */
  particleCount: number;
  /** The emission rate (particles per second). */
  emissionRate: number;
  /** The lifetime of each particle in milliseconds. */
  lifetimeMs: { min: number; max: number };
  /** The initial particle size. */
  size: { min: number; max: number };
  /** The particle color (design token key from Area 5). */
  colorToken: string;
  /** The emission shape. */
  emissionShape: 'point' | 'sphere' | 'box' | 'ring';
  /** The velocity of emitted particles. */
  velocity: { x: number; y: number; z: number };
  /** The gravity applied to particles. */
  gravity: number;
  /** The texture atlas sprite for particles (or null for default). */
  spriteToken: string | null;
}

// ─── Performance Budget ──────────────────────────────────────────────────────

/**
 * The performance budget for the BabylonJS rendering pipeline.
 * Area 6 owns this budget. Areas 7 and 8 reference this section.
 */
export interface PerformanceBudget {
  /** Target frames per second. */
  targetFps: number;
  /** Maximum draw calls per frame. */
  maxDrawCalls: number;
  /** Maximum active particle systems. */
  maxParticleSystems: number;
  /** Maximum particles across all active systems. */
  maxTotalParticles: number;
  /** Maximum animation state machines active simultaneously. */
  maxActiveAnimations: number;
  /** Maximum state update latency (time from signal change to frame render). */
  maxStateUpdateLatencyMs: number;
  /** Target GPU frame time budget (1000 / targetFps). */
  gpuFrameTimeBudgetMs: number;
  /** Maximum texture memory usage in MB. */
  maxTextureMemoryMb: number;
  /** Maximum mesh instances. */
  maxMeshInstances: number;
}
```

---

## 2. Core Algorithms

### 2.1 Scene Graph and Card Mesh Pipeline

**Scene graph hierarchy:**

```
root (SceneNode, type: root)
├── camera (SceneNode, type: camera)
│   └── MainCamera (orthographic, position: {x:0, y:10, z:0}, looking at origin)
├── lighting (SceneNode, type: light)
│   ├── AmbientLight (color: --color-ambient-bg from Area 5, intensity: 0.4)
│   ├── DirectionalLight (color: --color-neon-cyan from Area 5, intensity: 0.6)
│   └── PointLight-Highlight (color: --color-selection-glow from Area 5, intensity: 0.0→1.0 animated)
├── table (SceneNode, type: table)
│   ├── table-surface (plane mesh, PBR material, --color-panel-bg from Area 5)
│   ├── table-grid (line mesh, emissive, --color-grid-line from Area 5)
│   ├── meld-zone-0 (SceneNode, type: meldZone)
│   │   ├── zone-highlight (plane mesh, emissive, --color-meld-zone from Area 5)
│   │   ├── tray-indicator (optional, icon mesh)
│   │   └── card-mesh-* (SceneNode, type: cardMesh, one per card in meld)
│   ├── meld-zone-1 (SceneNode, type: meldZone)
│   │   └── ...
│   ├── meld-zone-2..N (up to 5 meld zones based on tray slot count from Area 3)
│   ├── hand-area (SceneNode, type: table)
│   │   └── card-mesh-* (SceneNode, type: cardMesh, one per card in hand)
│   ├── discard-pile (SceneNode, type: table)
│   │   └── card-mesh-* (SceneNode, type: cardMesh, stacked)
│   ├── draw-pile (SceneNode, type: table)
│   │   └── card-mesh-* (SceneNode, type: cardMesh, stacked)
│   └── action-bar (SceneNode, type: uiOverlay)
│       ├── button-draw, button-meld, button-discard, button-go-out
│       └── modifier-badges (partner slots, active modifiers)
├── particle-systems (SceneNode, type: particleSystem)
│   ├── seal-burst (ParticleEffectConfig: seal-burst)
│   ├── wild-glow (ParticleEffectConfig: wild-glow)
│   ├── frozen-shimmer (ParticleEffectConfig: frozen-shimmer)
│   └── hot-flame (ParticleEffectConfig: hot-flame)
└── ui-overlays (SceneNode, type: uiOverlay)
    ├── score-display, phase-indicator, turn-counter
    └── tooltip-layer
```

**Card mesh pipeline:**

1. **Geometry:** All cards share a single plane mesh (0.063m × 0.088m, standard poker card aspect ratio ≈ 1:1.4). The mesh is instanced for each card — one draw call for all card backs, one draw call per unique face material.

2. **PBR material pipeline:**
   - `card-back-material`: Shared across all cards. PBR material with diffuse texture (card back design), normal map (paper texture), roughness 0.8, metallic 0.0.
   - `card-face-material-{rank}-{suit}`: Unique per card type. PBR material with diffuse texture from texture atlas, normal map (shared paper texture), roughness 0.7, metallic 0.0.
   - `card-glow-material`: Overlay material for selection/enhancement glow. Emissive color from design tokens, opacity animated.

3. **Emissive glow:** Each card mesh has an emissive layer controlled by `glowIntensity` and `glowColorToken`. The glow color is mapped from Area 5 design tokens:
   - Selection glow: `--color-selection-glow` (cyan)
   - Wild card glow: `--color-wild-glow` (magenta)
   - Enhancement glow: varies by enhancement type (see Section 2.4)
   - Sealed canasta glow: `--color-seal-gold` (gold)

4. **Texture atlas layout:** All card faces are packed into a single 4096×4096 texture atlas. Each card occupies a 256×352 pixel cell (16 columns × 13 rows = 208 cells, enough for 52 standard cards + enhancements + card back). The atlas is loaded once at scene initialization.

```typescript
// Texture atlas cell calculation:
const ATLAS_COLS = 16;
const ATLAS_ROWS = 13;
const CELL_WIDTH = 1 / ATLAS_COLS;   // 0.0625
const CELL_HEIGHT = 1 / ATLAS_ROWS;  // ~0.0769

function getAtlasCoords(rank: string, suit: string | null): TextureAtlasCoords {
  const col = RANK_COL_MAP[rank];    // 0-15
  const row = SUIT_ROW_MAP[suit];    // 0-12
  return {
    u0: col * CELL_WIDTH,
    v0: row * CELL_HEIGHT,
    u1: (col + 1) * CELL_WIDTH,
    v1: (row + 1) * CELL_HEIGHT,
  };
}
```

**Camera and lighting:**

| Element | Type | Position | Properties |
|---------|------|----------|------------|
| MainCamera | Orthographic | {x: 0, y: 10, z: 0} | Looking down at table. Ortho width: 2.0, height: 1.4. Gives 2D-feel with 3D depth. |
| AmbientLight | Hemispheric | — | Color: `--color-ambient-bg` (#0A0A1A). Intensity: 0.4. |
| DirectionalLight | Directional | {x: -5, y: 10, z: -5} | Color: `--color-neon-cyan` (#00FFFF). Intensity: 0.6. Creates subtle directional shading. |
| PointLight-Highlight | Point | Follows selected card | Color: `--color-selection-glow`. Intensity: 0.0 (idle) → 1.0 (selected). Radius: 0.3. |

---

### 2.2 Animation State Machine and Effects

**Animation state machine:**

| State | Description | Transitions | Timing |
|-------|-------------|-------------|--------|
| `Idle` | No animation playing. Card is at rest. | → Dealing, Melding, Selecting, Dragging, Hovering | — |
| `Dealing` | Card flies from draw pile to hand position. | → Idle | 300ms, easeOutBack |
| `Melding` | Card flies from hand to meld zone position. | → Idle | 250ms, easeInOutQuad |
| `Sealing` | Canasta seal animation: glow burst + particle effect. | → Idle | 800ms, easeOutElastic |
| `Discarding` | Card flies from hand to discard pile. | → Idle | 200ms, easeInCubic |
| `Drawing` | Card flies from draw pile to hand (player-initiated draw). | → Idle | 250ms, easeOutQuad |
| `Selecting` | Card rises slightly, glow intensifies. | → Idle, Dragging | 150ms, easeOutQuad |
| `Deselecting` | Card lowers, glow fades. | → Idle | 150ms, easeInQuad |
| `Dragging` | Card follows cursor at raised height. | → Melding (on drop), Selecting (on cancel) | Continuous |
| `Hovering` | Card rises slightly on mouse hover. | → Idle | 100ms, easeOutQuad |
| `Transitioning` | Screen transition (camera move, layout swap). | → Idle | 500ms, easeInOutQuad |
| `ScoreReveal` | Score numbers animate in on score results screen. | → Idle | 600ms, easeOutBack |
| `ShopEntrance` | Shop items animate in from off-screen. | → Idle | 400ms, easeOutQuad |
| `ScreenTransition` | Full screen transition between gameplay/shop/score. | → Idle | 500ms, easeInOutQuad |

**Animation transition table:**

```
Idle ──► Dealing ──► Idle
Idle ──► Melding ──► Idle
Idle ──► Selecting ──► Idle
Idle ──► Selecting ──► Dragging ──► Melding ──► Idle
Idle ──► Selecting ──► Dragging ──► Selecting ──► Idle
Idle ──► Hovering ──► Idle
Idle ──► Discarding ──► Idle
Idle ──► Drawing ──► Idle
Idle ──► Sealing ──► Idle
Idle ──► Transitioning ──► Idle
Idle ──► ScoreReveal ──► Idle
Idle ──► ShopEntrance ──► Idle
Idle ──► ScreenTransition ──► Idle
```

**Glow and particle effects:**

| Effect | Trigger | Particle Config | Design Token Color |
|--------|---------|----------------|-------------------|
| Canasta seal burst | `Sealing` animation start | 200 particles, ring emission, 1000ms lifetime, size 0.01-0.03 | `--color-seal-gold` (#FFD700) |
| Wild card glow | Card has `visualState === 'wild'` | 20 particles, sphere emission, continuous, size 0.005-0.015 | `--color-wild-glow` (#FF00FF) |
| Frozen discard shimmer | Frozen card discarded | 100 particles, point emission, 2000ms lifetime, size 0.01-0.02 | `--color-frozen-blue` (#00BFFF) |
| Hot flame | Hot card in sealed canasta | 30 particles, point emission, continuous, size 0.005-0.01 | `--color-hot-orange` (#FF6600) |
| Selection pulse | Card selected | Glow layer intensity oscillates 0.5→1.0→0.5, 500ms period | `--color-selection-glow` (#00FFFF) |
| Enhancement badge | Card has enhancement | Small icon mesh attached to card corner, no particles | Varies by enhancement type |

---

### 2.3 Performance Budget and Asset Loading

**Performance budget (Area 6 owns this — Areas 7 and 8 reference this section):**

```typescript
export const PERFORMANCE_BUDGET: PerformanceBudget = {
  targetFps: 60,
  maxDrawCalls: 100,
  maxParticleSystems: 8,
  maxTotalParticles: 2000,
  maxActiveAnimations: 50,
  maxStateUpdateLatencyMs: 16,  // One frame at 60fps
  gpuFrameTimeBudgetMs: 16.67,
  maxTextureMemoryMb: 64,
  maxMeshInstances: 200,
};
```

**Budget rationale:**

| Budget Item | Value | Reasoning |
|-------------|-------|-----------|
| Target FPS | 60 | Smooth card animations require 60fps. 30fps would feel sluggish for drag-and-drop. |
| Max draw calls | 100 | Card faces (instanced): ~2. Card backs (instanced): 1. Meld zones: ~5. UI overlays: ~10. Particle systems: ~8. Table + lights: ~5. Total baseline: ~31. Budget allows headroom for dynamic effects. |
| Max particle systems | 8 | One per effect type (seal, wild, frozen, hot, selection, echo, partner, anchor). |
| Max total particles | 2000 | 8 systems × 250 average particles = 2000. Prevents GPU overload during intense moments (e.g., sealing multiple canastas simultaneously). |
| Max active animations | 50 | Dealing 11 cards = 11 animations. Melding up to 7 cards = 7 animations. UI transitions = ~5. Total baseline: ~23. Budget allows headroom. |
| State update latency | 16ms | One frame. Angular effect → BabylonJS update must complete within one frame to avoid visible lag. |
| Texture memory | 64 MB | Card face atlas (4096×4096 RGBA = 64MB). No additional textures needed — all UI is procedural or CSS. |
| Mesh instances | 200 | 108 cards in deck + ~50 scene nodes (zones, lights, UI) = ~158. Budget allows headroom for dynamic elements. |

**Asset loading sequence:**

1. **Preload (blocking):** Card face texture atlas (4096×4096), card back texture, shared normal map. Total: ~65MB. Shows loading screen with progress bar.
2. **Async (non-blocking):** Particle system textures (small sprites, loaded in background). Font textures for score display.
3. **Fallback:** If texture atlas fails to load, use solid-color card faces with text labels (rank + suit). If particle textures fail, use glow-layer-only effects (no particles).

---

## 3. Interfaces & Contracts with Adjacent Areas

### 3.1 Contract with Area 5 — UI/UX Design

Area 6 references Area 5's design token table (Area 5, Section 4) for all material colors, glow colors, and visual effect colors. Area 6 does not redefine any design tokens — it maps them to BabylonJS material properties.

**Design token mapping:**

| Design Token (Area 5) | BabylonJS Usage |
|----------------------|-----------------|
| `--color-neon-cyan` | Directional light color, selection glow |
| `--color-neon-magenta` | Wild card glow |
| `--color-neon-gold` | Canasta seal glow, seal burst particles |
| `--color-panel-bg` | Table surface material |
| `--color-grid-line` | Table grid emissive lines |
| `--color-meld-zone` | Meld zone highlight material |
| `--color-selection-glow` | Point light + card glow overlay |
| `--color-wild-glow` | Wild card particle system |
| `--color-frozen-blue` | Frozen discard shimmer particles |
| `--color-hot-orange` | Hot flame particles |
| `--color-seal-gold` | Seal burst particles |
| `--color-enhancement-gilded` | Gilded border glow |
| `--color-enhancement-pure` | Pure halo |

### 3.2 Contract with Area 7 — Angular App Architecture

Area 7 owns the `BabylonJSBoundaryContract` (Area 7, Section 2.4). Area 6 implements the scene-side rendering logic for each entry in the contract:

- **Input signals:** Area 6 implements the `syncCardMeshes`, `syncMeldZones`, `syncActionButtons`, `transitionScene`, `highlightCard`, and `updateDragGhost` methods that Area 7's `SceneBridgeService` calls.
- **Output events:** Area 6 raises the `onCardClicked`, `onCardDroppedOnMeldZone`, `onDrawPileClicked`, `onActionButtonClicked`, and `onShopItemClicked` events that `SceneBridgeService` listens to.

Area 6 must not redefine the boundary contract — it must reference Area 7 by name and section.

---

## 4. Worked Example

**Scenario:** Player seals a natural canasta — deal animation plays, glow layer activates, particle burst fires, scene updates to sealed state.

### Step 1 — Deal animation (11 cards)

1. Angular `SceneBridgeService` effect fires: `syncCardMeshes(cardVisualStates())`.
2. For each of 11 cards, BabylonJS creates an animation: `Idle → Dealing → Idle`.
3. Animation: card flies from draw pile position {x: 0.8, y: 0.1, z: 0} to hand position {x: -0.6 + i×0.12, y: 0.1, z: -0.5} where `i` is the card index (0-10).
4. Timing: 300ms per card, staggered by 50ms (total: 300 + 10×50 = 800ms for all 11 cards).
5. Easing: `easeOutBack` (slight overshoot for satisfying feel).

### Step 2 — Player melds 7 Queens

1. Player drags Q♠ from hand to meld zone 0. BabylonJS raises `onCardDroppedOnMeldZone`.
2. Angular `MeldStateService.placeMeld()` validates and updates state.
3. `syncCardMeshes()` fires: Q♠ animation `Idle → Melding → Idle` (250ms, easeInOutQuad).
4. Player repeats for remaining 6 Queens. Each card animates to a position within meld zone 0, fanned out.
5. After 7th card is placed, `MeldStateService.sealCanasta()` fires.

### Step 3 — Canasta seal animation

1. `syncMeldZones()` fires: meld zone 0 visual state changes to `sealed`.
2. Animation state machine: `Idle → Sealing → Idle` (800ms, easeOutElastic).
3. Glow layer activates: all 7 card meshes get `glowIntensity: 1.0`, `glowColorToken: '--color-seal-gold'`.
4. Particle burst fires: `seal-burst` system emits 200 particles in a ring pattern at the meld center. Color: gold. Lifetime: 1000ms.
5. After 800ms: glow fades to `glowIntensity: 0.3` (maintained for sealed canastas). Particle system stops emitting.

### Step 4 — Scene state verification

| Element | State |
|---------|-------|
| 7 Queen card meshes | Position: meld zone 0, fanned. Visual state: `sealed`. Glow: 0.3 intensity, gold. |
| Meld zone 0 | Highlight: gold border. Canasta indicator: visible. |
| Particle system (seal-burst) | Emitting: false. Active particles: fading out. |
| Hand area | 4 remaining cards (11 dealt - 7 melded). |
| Performance | Draw calls: ~35. Active animations: 0 (all complete). Particles: ~50 remaining. FPS: 60. |

---

## 5. Open Questions

### OQ-1: Orthographic vs. Perspective Camera
**Question:** Should the camera be orthographic (current design) or perspective for a more 3D feel?

**Status:** Resolved — orthographic.

**Rationale:** Orthographic projection gives a clean 2D card-game feel while still allowing 3D effects (card raising, glow, particles). Perspective would introduce foreshortening that makes card ranks harder to read at an angle. The orthographic camera with subtle card elevation changes provides depth without readability issues.

---

### OQ-2: Texture Atlas Resolution
**Question:** Is 4096×4096 the right resolution for the card face texture atlas, or should it be 2048×2048 to save memory?

**Status:** Resolved — 4096×4096.

**Rationale:** At 256×352 pixels per card in a 4096×4096 atlas, each card face has sufficient detail for close-up viewing (cards can be zoomed during selection). A 2048×2048 atlas would reduce each card to 128×176 pixels, which would appear blurry on high-DPI displays. The 64MB memory cost is acceptable within the 64MB texture budget.

---

### OQ-3: Particle System GPU Budget
**Question:** Should particle systems run on the GPU (BabylonJS GPU particles) or CPU?

**Status:** Resolved — CPU particles for MVP, GPU particles for post-MVP.

**Rationale:** CPU particles are simpler to implement and debug. With a max of 2000 total particles, CPU particles are sufficient for 60fps. GPU particles can be swapped in later if the particle budget increases (e.g., for more elaborate enhancement effects).

---

### OQ-4: Animation Stagger for Dealing
**Question:** Should all 11 cards be dealt simultaneously or staggered?

**Status:** Resolved — staggered at 50ms intervals.

**Rationale:** Staggered dealing creates a satisfying cascade effect and gives the player time to see each card arrive. Simultaneous dealing would be visually overwhelming. The 50ms stagger is fast enough to feel snappy but slow enough to be visually distinct.

---

### OQ-5: Glow Layer Implementation
**Question:** Should the card glow be implemented as a post-process glow layer or per-material emissive?

**Status:** Resolved — per-material emissive for MVP.

**Rationale:** Per-material emissive is simpler and has lower GPU cost than a full post-process glow layer. Each card material has an emissive color and intensity that is animated directly. A post-process bloom effect can be added post-MVP for enhanced visual quality if the GPU budget allows.

---

### OQ-6: Card Back Design
**Question:** Should the card back be a static texture or animated (e.g., subtle shimmer)?

**Status:** Resolved — static texture for MVP.

**Rationale:** An animated card back would require an additional material animation or shader. A static texture with a normal map for paper texture is sufficient for MVP. A subtle shimmer effect can be added post-MVP as an emissive overlay if the GPU budget allows.

---

### OQ-7: LOD (Level of Detail) for Card Meshes
**Question:** Should card meshes use LOD (simplified geometry at distance) to improve performance?

**Status:** Resolved — no LOD needed.

**Rationale:** With a maximum of 108 card meshes in the scene and an orthographic camera (no distance-based scaling), all cards are roughly the same size on screen. LOD would add complexity without meaningful performance gain. The instanced rendering approach (one draw call per card face type) is sufficient to stay within the 100 draw call budget.

---

## 6. Self-Review Against Done Criteria

### Universal Done Checklist

- [x] All required sections present: Overview, Data Models (Section 1), Core Algorithms (Section 2), Interfaces & Contracts (Section 3), Worked Example (Section 4), Open Questions (Section 5)
- [x] All data models fully typed: `SceneNode`, `CardMesh`, `TextureAtlasCoords`, `EnhancementIndicatorType`, `AnimationState`, `AnimationStateType`, `EasingFunction`, `AnimationTargetValue`, `ParticleEffectConfig`, `PerformanceBudget` — no `any`, no partial types
- [x] All algorithms described at pseudocode or decision-table level: scene graph hierarchy (Section 2.1, tree diagram), card mesh pipeline (Section 2.1, numbered steps), animation state machine (Section 2.2, state table + transition table), performance budget (Section 2.3, table with rationale)
- [x] All interfaces between this area and adjacent areas explicitly named and typed: Area 5 (Section 3.1), Area 7 (Section 3.2)
- [x] All open questions either resolved or explicitly deferred with rationale: OQ-1 through OQ-7
- [x] Worked example traces a concrete rendering scenario end-to-end: Section 4 (deal animation → meld 7 Queens → seal animation → glow + particles → scene state verification)
- [x] No content redefines rules owned by upstream dependencies: all design tokens reference Area 5 Section 4; BabylonJS boundary contract references Area 7 Section 2.4; card visual states reference Area 1 card types and Area 4 enhancement types

### Area-Specific Done Criteria

- [x] Scene graph node hierarchy fully described: Section 2.1 (root → camera, lighting, table, meld zones, card meshes, particle systems, UI overlays)
- [x] Card material pipeline specified: Section 2.1 (geometry spec: 0.063m × 0.088m plane mesh; material type: PBR with diffuse texture from atlas, normal map, roughness/metallic values; texture atlas layout: 4096×4096, 16×13 grid, 256×352px per card)
- [x] Animation state machine defined with all states, transitions, and timing values in milliseconds: Section 2.2 (14 states, transition table, timing values with easing functions)
- [x] Performance budget stated: Section 2.3 (target 60fps, max 100 draw calls, max 8 particle systems, max 2000 particles, max 50 active animations, max 16ms state update latency, max 64MB texture memory, max 200 mesh instances)
- [x] Asset loading sequence and fallback strategy specified: Section 2.3 (preload blocking for atlas, async for particles, fallback to solid-color cards)
- [x] Design token references cite Area 5 by name and section: Section 3.1 (13 token mappings, all referencing Area 5 design token table)
- [x] BabylonJS integration boundary contract references Area 7 by name and section: Section 3.2 (Area 7, Section 2.4)