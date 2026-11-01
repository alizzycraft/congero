# Area 6: BabylonJS Rendering — Technical Specification & Implementation Plan

## 1. Overview

Area 6 implements the complete BabylonJS rendering pipeline for Congero, a neon-lit card game. This specification covers the scene graph hierarchy, card mesh pipeline (geometry, PBR materials, emissive glow, texture atlas), camera and lighting setup, animation state machine, particle effects system, and performance budget.

This document is the implementation companion to the design document (`.kiro/specs/congero-babylonjs-rendering/design.md`). All architectural decisions, open questions, and design rationales are resolved there; this document translates those decisions into concrete implementation steps.

**Key responsibilities:**
- **Scene graph** — Full node hierarchy from root to individual card meshes, lights, cameras, and particle systems
- **Card mesh pipeline** — Shared geometry instancing, PBR material creation, emissive glow layers, texture atlas UV mapping
- **Camera & lighting** — Orthographic camera with 3-light setup (hemispheric ambient, directional, point highlight)
- **Animation state machine** — 14 states with transition table, millisecond timing, and easing functions
- **Particle effects** — 5 particle system configurations for seal burst, wild glow, frozen shimmer, hot flame, and selection pulse
- **Performance budget** — 10-item budget with enforcement strategy
- **Asset loading** — Preload sequence, async loading, and fallback strategy
- **BabylonJS boundary** — Scene update methods and scene event raising per the Area 7 contract

**Dependencies:**
- **Area 5 (UI/UX Design)** — Design tokens for material colors, glow colors, and visual effect colors (referenced by name, not redefined)
- **Area 7 (Angular App Architecture)** — `BabylonJSBoundaryContract` that governs how Angular signals drive scene updates and how scene events propagate back to Angular

**Out of scope:** Angular component/service structure (Area 7), game rule logic (Area 1), UI layout wireframes (Area 5), state persistence (Area 8), modifier stacking (Area 3), card enhancement definitions (Area 4), deckbuilding mechanics (Area 2).

---

## 2. File Structure

All BabylonJS rendering code lives under `src/babylonjs/`:

```
src/babylonjs/
├── index.ts                          # Public barrel export
│
├── scene/
│   ├── scene-manager.ts              # Scene initialization, engine lifecycle, render loop
│   ├── scene-graph.ts                # Scene graph node creation, hierarchy management, node lookup
│   ├── scene-node-factory.ts         # Factory functions for creating typed SceneNode instances
│   └── scene-graph.test.ts           # Unit tests for scene graph operations
│
├── cards/
│   ├── card-mesh-pipeline.ts         # Card geometry creation, instancing, material pipeline
│   ├── card-mesh-manager.ts          # Card mesh CRUD: create, update, destroy, z-ordering
│   ├── card-material-factory.ts      # PBR material creation (face, back, glow overlay)
│   ├── texture-atlas.ts              # Atlas loading, UV coordinate calculation, sprite lookup
│   ├── card-mesh-pipeline.test.ts    # Unit tests for card mesh creation and materials
│   └── texture-atlas.test.ts         # Unit tests for atlas UV mapping
│
├── animation/
│   ├── animation-state-machine.ts    # State machine: transitions, timing, easing evaluation
│   ├── animation-controller.ts       # High-level animation orchestration (deal, meld, seal, etc.)
│   ├── easing-functions.ts           # All easing function implementations
│   └── animation-state-machine.test.ts # Unit tests for state machine transitions and timing
│
├── effects/
│   ├── particle-system-manager.ts    # Particle system creation, activation, deactivation
│   ├── particle-configs.ts           # All 5 particle effect configurations
│   ├── glow-layer-manager.ts         # Per-material emissive glow control
│   └── particle-system-manager.test.ts # Unit tests for particle system lifecycle
│
├── performance/
│   ├── performance-budget.ts         # PERFORMANCE_BUDGET constant and budget enforcement
│   ├── performance-monitor.ts        # Runtime FPS, draw call, particle, and animation tracking
│   └── performance-budget.test.ts    # Unit tests for budget enforcement
│
├── camera/
│   ├── camera-setup.ts               # Orthographic camera creation and configuration
│   └── lighting-setup.ts             # 3-light setup (hemispheric, directional, point)
│
├── assets/
│   ├── asset-loader.ts               # Preload sequence, async loading, fallback strategy
│   └── asset-manifest.ts             # Asset URL definitions and loading priorities
│
└── boundary/
    ├── scene-update-handlers.ts      # Implements syncCardMeshes, syncMeldZones, etc. (Area 7 contract)
    ├── scene-event-raiser.ts         # Raises onCardClicked, onCardDroppedOnMeldZone, etc.
    └── boundary-types.ts             # Local type aliases for Area 7 contract methods
```

---

## 3. Interfaces & Types

All types are TypeScript. No `any`, no partial types. All fields are required unless explicitly typed as `| null`.

### 3.1 SceneNode

```typescript
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
```

### 3.2 CardMesh

```typescript
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
```

### 3.3 TextureAtlasCoords

```typescript
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
```

### 3.4 EnhancementIndicatorType

```typescript
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
```

### 3.5 AnimationState

```typescript
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
```

### 3.6 AnimationStateType

```typescript
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
```

### 3.7 EasingFunction

```typescript
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
```

### 3.8 AnimationTargetValue

```typescript
/**
 * The target value being animated.
 */
export interface AnimationTargetValue {
  /** The property being animated. */
  property: 'position' | 'rotation' | 'scale' | 'glowIntensity' | 'opacity' | 'zOrder';
  /** The target value (interpretation depends on property). */
  value: { x: number; y: number; z: number } | number;
}
```

### 3.9 ParticleEffectConfig

```typescript
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
```

### 3.10 PerformanceBudget

```typescript
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

## 4. Scene Graph Implementation

### 4.1 Hierarchy

The scene graph is a strict tree rooted at a single `root` node. Every renderable element is a `SceneNode`:

```
root (type: root)
├── camera (type: camera)
│   └── MainCamera (orthographic)
├── lighting (type: light)
│   ├── AmbientLight (hemispheric)
│   ├── DirectionalLight (directional)
│   └── PointLight-Highlight (point)
├── table (type: table)
│   ├── table-surface (plane mesh, PBR)
│   ├── table-grid (line mesh, emissive)
│   ├── meld-zone-0 (type: meldZone)
│   │   ├── zone-highlight (plane mesh, emissive)
│   │   ├── tray-indicator (icon mesh, optional)
│   │   └── card-mesh-* (type: cardMesh, one per card)
│   ├── meld-zone-1 (type: meldZone)
│   │   └── ...
│   ├── meld-zone-2..N (up to 5 zones per Area 3 tray slots)
│   ├── hand-area (type: table)
│   │   └── card-mesh-* (one per card in hand)
│   ├── discard-pile (type: table)
│   │   └── card-mesh-* (stacked)
│   ├── draw-pile (type: table)
│   │   └── card-mesh-* (stacked)
│   └── action-bar (type: uiOverlay)
│       ├── button-draw, button-meld, button-discard, button-go-out
│       └── modifier-badges
├── particle-systems (type: particleSystem)
│   ├── seal-burst
│   ├── wild-glow
│   ├── frozen-shimmer
│   └── hot-flame
└── ui-overlays (type: uiOverlay)
    ├── score-display, phase-indicator, turn-counter
    └── tooltip-layer
```

### 4.2 Node Creation and Management

**`scene-graph.ts`** provides the core API:

- `createNode(spec: Omit<SceneNode, 'id'>): SceneNode` — Creates a node, assigns a UUID, registers it in the node map
- `getNode(id: string): SceneNode | undefined` — O(1) lookup by ID
- `setParent(childId: string, parentId: string): void` — Updates both parent's `childNodeIds` and child's `parentNodeId`
- `removeNode(id: string): void` — Removes node and all descendants recursively
- `getDescendants(id: string): SceneNode[]` — Returns all descendants in depth-first order
- `getChildren(id: string): SceneNode[]` — Returns direct children only
- `getNodesByType(type: SceneNode['nodeType']): SceneNode[]` — Filter by node type

**`scene-node-factory.ts`** provides typed factory functions:

- `createRootNode(): SceneNode` — Root node at origin, scale 1
- `createCameraNode(): SceneNode` — Camera-type node
- `createLightNode(): SceneNode` — Light-type node
- `createTableNode(): SceneNode` — Table-type node
- `createMeldZoneNode(zoneIndex: number): SceneNode` — Meld zone with indexed naming
- `createCardMeshNode(cardId: string): SceneNode` — Card mesh node linked to card ID
- `createParticleSystemNode(effectId: string): SceneNode` — Particle system node
- `createUIOverlayNode(overlayId: string): SceneNode` — UI overlay node

**`scene-manager.ts`** orchestrates the full lifecycle:

- `initialize(engine: Engine): Scene` — Creates BabylonJS scene, calls `buildSceneGraph()`
- `buildSceneGraph(): void` — Creates the full hierarchy in dependency order: root → camera → lighting → table → zones → cards → particles → UI
- `dispose(): void` — Tears down the entire scene graph, disposes all meshes and materials

### 4.3 Node ID Convention

All node IDs follow the pattern `{type}-{qualifier}-{index}`:

| Pattern | Example |
|---------|---------|
| `root` | `root` |
| `camera-main` | `camera-main` |
| `light-ambient` | `light-ambient` |
| `light-directional` | `light-directional` |
| `light-highlight` | `light-highlight` |
| `table-surface` | `table-surface` |
| `zone-meld-{n}` | `zone-meld-0` |
| `zone-hand` | `zone-hand` |
| `zone-discard` | `zone-discard` |
| `zone-draw` | `zone-draw` |
| `card-{cardId}` | `card-AS` (Ace of Spades) |
| `particle-{effectId}` | `particle-seal-burst` |
| `ui-{overlayId}` | `ui-score-display` |

---

## 5. Card Mesh Pipeline

### 5.1 Geometry

All cards share a single plane mesh with standard poker card dimensions:

- **Width:** 0.063 meters
- **Height:** 0.088 meters
- **Aspect ratio:** ≈ 1:1.4 (standard poker card)
- **Subdivisions:** 1×1 (single quad, no subdivision needed for flat cards)
- **Orientation:** Lies in the XZ plane (facing up toward positive Y)

The mesh is created once and instanced for each card. Two instance groups exist:
- **Card face instances** — One per unique face material (up to 52 for standard deck)
- **Card back instances** — One shared back material for all cards

This yields 2 draw calls for all card geometry (one for all faces via instancing, one for all backs via instancing).

### 5.2 PBR Material Setup

**Card back material** (`card-back-material`):
- Type: `PBRMaterial`
- Diffuse texture: Card back design texture
- Normal map: Shared paper texture normal map
- Roughness: 0.8
- Metallic: 0.0
- Shared across all cards (single material instance)

**Card face material** (`card-face-material-{rank}-{suit}`):
- Type: `PBRMaterial`
- Diffuse texture: Texture atlas (all card faces packed into one atlas)
- Normal map: Shared paper texture normal map (same as back)
- Roughness: 0.7
- Metallic: 0.0
- UV coordinates: Per-card `TextureAtlasCoords` mapped to the atlas cell
- One unique material instance per card type (rank + suit combination)

**Glow overlay material** (`card-glow-material-{cardId}`):
- Type: `PBRMaterial`
- Emissive color: Mapped from Area 5 design tokens (see Section 5.3)
- Opacity: Animated via `glowIntensity` (0.0–1.0)
- Rendering mode: Alpha blend
- One instance per card (each card has independent glow state)

### 5.3 Emissive Glow

Each card mesh has an emissive layer controlled by `glowIntensity` and `glowColorToken`:

| Glow Purpose | Design Token (Area 5) | Color |
|---|---|---|
| Selection glow | `--color-selection-glow` | Cyan (#00FFFF) |
| Wild card glow | `--color-wild-glow` | Magenta (#FF00FF) |
| Sealed canasta glow | `--color-seal-gold` | Gold (#FFD700) |
| Gilded enhancement | `--color-enhancement-gilded` | Gold |
| Pure enhancement | `--color-enhancement-pure` | White |

Implementation: Per-material emissive (not post-process glow layer). Each card's glow material has its `emissiveColor` set from the design token mapping and its alpha animated by `glowIntensity`. This is the MVP approach — post-process bloom can be added later if GPU budget allows.

### 5.4 Texture Atlas

**Atlas specifications:**
- Resolution: 4096 × 4096 pixels
- Format: RGBA
- Memory: 64 MB (exactly matches `maxTextureMemoryMb` budget)
- Grid: 16 columns × 13 rows = 208 cells
- Cell size: 256 × 352 pixels per card face
- Capacity: 52 standard cards + enhancement variants + card back + padding

**UV coordinate calculation:**

```typescript
const ATLAS_COLS = 16;
const ATLAS_ROWS = 13;
const CELL_WIDTH = 1 / ATLAS_COLS;   // 0.0625
const CELL_HEIGHT = 1 / ATLAS_ROWS;  // ~0.076923

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

The `RANK_COL_MAP` maps ranks (A, 2–10, J, Q, K, Wild, Joker, etc.) to column indices 0–15. The `SUIT_ROW_MAP` maps suits (Hearts, Diamonds, Clubs, Spades, null for special cards) to row indices 0–12.

**`texture-atlas.ts`** provides:
- `loadAtlas(url: string): Promise<Texture>` — Loads the atlas texture with proper sampling settings
- `getAtlasCoords(rank: string, suit: string | null): TextureAtlasCoords` — Calculates UV cell coordinates
- `applyToMaterial(material: PBRMaterial, coords: TextureAtlasCoords): void` — Sets UV offset/scale on the material's diffuse texture

---

## 6. Camera & Lighting

### 6.1 Orthographic Camera

**`camera-setup.ts`** creates and configures the main camera:

| Property | Value |
|----------|-------|
| Type | Orthographic |
| Position | `{x: 0, y: 10, z: 0}` |
| Target | Origin `{x: 0, y: 0, z: 0}` (looking straight down) |
| Ortho width | 2.0 |
| Ortho height | 1.4 |
| Near plane | 0.1 |
| Far plane | 100 |

The orthographic projection gives a clean 2D card-game feel while allowing 3D depth effects (card raising, glow, particles). The 2.0 × 1.4 ortho window matches the table aspect ratio.

### 6.2 Three-Light Setup

**`lighting-setup.ts`** creates all three lights:

**AmbientLight (Hemispheric):**
| Property | Value |
|----------|-------|
| Type | `HemisphericLight` |
| Color | `--color-ambient-bg` from Area 5 (#0A0A1A) |
| Intensity | 0.4 |
| Direction | `{x: 0, y: 1, z: 0}` |

**DirectionalLight:**
| Property | Value |
|----------|-------|
| Type | `DirectionalLight` |
| Color | `--color-neon-cyan` from Area 5 (#00FFFF) |
| Intensity | 0.6 |
| Direction | `{x: -5, y: 10, z: -5}` (normalized internally) |

**PointLight-Highlight:**
| Property | Value |
|----------|-------|
| Type | `PointLight` |
| Color | `--color-selection-glow` from Area 5 (#00FFFF) |
| Intensity | 0.0 (idle) → 1.0 (selected, animated) |
| Position | Follows the currently selected card |
| Radius | 0.3 |
| Diffuse | Same as color |

---

## 7. Animation State Machine

### 7.1 All 14 States

| # | State | Description | Duration | Easing |
|---|-------|-------------|----------|--------|
| 1 | `Idle` | No animation playing. Card at rest. | — | — |
| 2 | `Dealing` | Card flies from draw pile to hand position. | 300ms | easeOutBack |
| 3 | `Melding` | Card flies from hand to meld zone position. | 250ms | easeInOutQuad |
| 4 | `Sealing` | Canasta seal: glow burst + particle effect. | 800ms | easeOutElastic |
| 5 | `Discarding` | Card flies from hand to discard pile. | 200ms | easeInCubic |
| 6 | `Drawing` | Card flies from draw pile to hand (player draw). | 250ms | easeInOutQuad |
| 7 | `Selecting` | Card rises slightly, glow intensifies. | 150ms | easeInOutQuad |
| 8 | `Deselecting` | Card lowers, glow fades. | 150ms | easeInOutQuad |
| 9 | `Dragging` | Card follows cursor at raised height. | Continuous | — |
| 10 | `Hovering` | Card rises slightly on mouse hover. | 100ms | easeInOutQuad |
| 11 | `Transitioning` | Screen transition (camera move, layout swap). | 500ms | easeInOutQuad |
| 12 | `ScoreReveal` | Score numbers animate in on results screen. | 600ms | easeOutBack |
| 13 | `ShopEntrance` | Shop items animate in from off-screen. | 400ms | easeInOutQuad |
| 14 | `ScreenTransition` | Full screen transition between screens. | 500ms | easeInOutQuad |

### 7.2 Transition Table

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

### 7.3 State Machine Implementation

**`animation-state-machine.ts`** implements:

- `createMachine(machineId: string): AnimationStateMachine` — Creates a new state machine in `Idle`
- `canTransition(from: AnimationStateType, to: AnimationStateType): boolean` — Validates transitions against the transition table
- `transition(machine: AnimationStateMachine, to: AnimationStateType, targetValue?: AnimationTargetValue): void` — Performs the transition, records `startTime` and `durationMs`
- `evaluate(machine: AnimationStateMachine, now: number): number` — Returns the current animation progress (0.0–1.0) using the easing function
- `isComplete(machine: AnimationStateMachine, now: number): boolean` — Returns true if `now >= startTime + durationMs`

**`easing-functions.ts`** implements all 6 easing functions:

| Easing | Formula (t = normalized time 0→1) |
|--------|-------------------------------------|
| `linear` | `t` |
| `easeInOutQuad` | `t < 0.5 ? 2t² : 1 - (-2t+2)² / 2` |
| `easeOutBack` | `1 + c·(t-1)³ + c·(t-1)²` where `c = 1.70158` |
| `easeInCubic` | `t³` |
| `easeOutElastic` | `2^(-10t) · sin((t·10 - 0.75) · 2π/3) + 1` |
| `easeOutBounce` | Piecewise: `<1/2.75`, `<2/2.75`, `<2.5/2.75`, else |

**`animation-controller.ts`** provides high-level orchestration:

- `dealCards(cards: CardMesh[], staggerMs: number = 50): void` — Deals cards with staggered timing (default 50ms between cards)
- `meldCard(card: CardMesh, zonePosition: Vector3): void` — Animates card to meld zone
- `sealCanasta(cards: CardMesh[], zoneCenter: Vector3): void` — Triggers sealing animation + particle burst
- `discardCard(card: CardMesh): void` — Animates card to discard pile
- `selectCard(card: CardMesh): void` — Raises card, intensifies glow
- `deselectCard(card: CardMesh): void` — Lowers card, fades glow

---

## 8. Particle Effects

### 8.1 All 5 Particle System Configurations

**`particle-configs.ts`** defines all configurations:

#### Seal Burst
```typescript
export const SEAL_BURST_CONFIG: ParticleEffectConfig = {
  id: 'seal-burst',
  name: 'Canasta Seal Burst',
  particleCount: 200,
  emissionRate: 200,
  lifetimeMs: { min: 500, max: 1000 },
  size: { min: 0.01, max: 0.03 },
  colorToken: '--color-seal-gold',
  emissionShape: 'ring',
  velocity: { x: 0, y: 0.5, z: 0 },
  gravity: -0.1,
  spriteToken: null,
};
```

#### Wild Glow
```typescript
export const WILD_GLOW_CONFIG: ParticleEffectConfig = {
  id: 'wild-glow',
  name: 'Wild Card Glow',
  particleCount: 20,
  emissionRate: 10,
  lifetimeMs: { min: 500, max: 1500 },
  size: { min: 0.005, max: 0.015 },
  colorToken: '--color-wild-glow',
  emissionShape: 'sphere',
  velocity: { x: 0, y: 0.1, z: 0 },
  gravity: 0,
  spriteToken: null,
};
```

#### Frozen Shimmer
```typescript
export const FROZEN_SHIMMER_CONFIG: ParticleEffectConfig = {
  id: 'frozen-shimmer',
  name: 'Frozen Discard Shimmer',
  particleCount: 100,
  emissionRate: 50,
  lifetimeMs: { min: 1000, max: 2000 },
  size: { min: 0.01, max: 0.02 },
  colorToken: '--color-frozen-blue',
  emissionShape: 'point',
  velocity: { x: 0, y: 0.2, z: 0 },
  gravity: 0.05,
  spriteToken: null,
};
```

#### Hot Flame
```typescript
export const HOT_FLAME_CONFIG: ParticleEffectConfig = {
  id: 'hot-flame',
  name: 'Hot Card Flame',
  particleCount: 30,
  emissionRate: 15,
  lifetimeMs: { min: 300, max: 800 },
  size: { min: 0.005, max: 0.01 },
  colorToken: '--color-hot-orange',
  emissionShape: 'point',
  velocity: { x: 0, y: 0.3, z: 0 },
  gravity: -0.2,
  spriteToken: null,
};
```

#### Selection Pulse
```typescript
export const SELECTION_PULSE_CONFIG: ParticleEffectConfig = {
  id: 'selection-pulse',
  name: 'Selection Pulse',
  particleCount: 0,
  emissionRate: 0,
  lifetimeMs: { min: 0, max: 0 },
  size: { min: 0, max: 0 },
  colorToken: '--color-selection-glow',
  emissionShape: 'point',
  velocity: { x: 0, y: 0, z: 0 },
  gravity: 0,
  spriteToken: null,
};
```

Note: Selection Pulse is implemented as a glow-layer intensity oscillation (0.5→1.0→0.5, 500ms period) rather than actual particles, since it's a per-material emissive effect.

### 8.2 Particle System Manager

**`particle-system-manager.ts`** provides:

- `initialize(scene: Scene): void` — Pre-creates all 5 particle system instances in an inactive state
- `activate(effectId: string, position: Vector3): void` — Activates a particle system at a world position
- `deactivate(effectId: string): void` — Stops emission (existing particles continue to age out)
- `setTargetCard(effectId: string, cardId: string): void` — Makes a particle system follow a card mesh
- `getActiveCount(): number` — Returns number of currently emitting systems
- `getTotalParticleCount(): number` — Returns total live particles across all systems
- `dispose(): void` — Disposes all particle systems

All particle systems use CPU particles for MVP (simpler to implement/debug). GPU particles are a post-MVP upgrade path.

---

## 9. Performance Budget

### 9.1 Budget Constant

**`performance-budget.ts`** defines:

```typescript
export const PERFORMANCE_BUDGET: PerformanceBudget = {
  targetFps: 60,
  maxDrawCalls: 100,
  maxParticleSystems: 8,
  maxTotalParticles: 2000,
  maxActiveAnimations: 50,
  maxStateUpdateLatencyMs: 16,
  gpuFrameTimeBudgetMs: 16.67,
  maxTextureMemoryMb: 64,
  maxMeshInstances: 200,
};
```

### 9.2 Budget Item Details

| # | Budget Item | Value | Reasoning |
|---|-------------|-------|-----------|
| 1 | Target FPS | 60 | Smooth card animations require 60fps. 30fps would feel sluggish for drag-and-drop. |
| 2 | Max draw calls | 100 | Card faces (instanced): ~2. Card backs (instanced): 1. Meld zones: ~5. UI overlays: ~10. Particle systems: ~8. Table + lights: ~5. Total baseline: ~31. Budget allows headroom for dynamic effects. |
| 3 | Max particle systems | 8 | One per effect type (seal, wild, frozen, hot, selection, echo, partner, anchor). |
| 4 | Max total particles | 2000 | 8 systems × 250 average particles = 2000. Prevents GPU overload during intense moments. |
| 5 | Max active animations | 50 | Dealing 11 cards = 11. Melding up to 7 = 7. UI transitions = ~5. Total baseline: ~23. Budget allows headroom. |
| 6 | State update latency | 16ms | One frame. Angular effect → BabylonJS update must complete within one frame. |
| 7 | GPU frame time | 16.67ms | 1000 / 60 = 16.67ms per frame. |
| 8 | Texture memory | 64 MB | Card face atlas (4096×4096 RGBA = 64MB). No additional textures needed. |
| 9 | Max mesh instances | 200 | 108 cards + ~50 scene nodes = ~158. Budget allows headroom. |

### 9.3 Enforcement Strategy

**`performance-monitor.ts`** tracks runtime metrics:

- `trackFrame(frameTimeMs: number): void` — Records frame time, calculates rolling FPS
- `trackDrawCall(): void` — Increments draw call counter (reset each frame)
- `trackAnimationStart(): void` / `trackAnimationEnd(): void` — Tracks active animation count
- `trackParticleSystemActivate(): void` / `trackParticleSystemDeactivate(): void` — Tracks active particle system count
- `trackParticleCount(count: number): void` — Tracks total live particles
- `trackMeshInstanceCreate(): void` / `trackMeshInstanceDispose(): void` — Tracks mesh instance count
- `getMetrics(): PerformanceMetrics` — Returns current frame metrics
- `isWithinBudget(): boolean` — Returns true if all metrics are within budget
- `getViolations(): string[]` — Returns list of budget violation descriptions

**Enforcement actions on violation:**

| Violation | Action |
|-----------|--------|
| FPS < 60 for 3+ consecutive frames | Log warning; reduce particle emission rates by 50% |
| Draw calls > 100 | Log warning; disable non-essential UI overlay meshes |
| Particle systems > 8 | Refuse to activate additional systems; queue request |
| Total particles > 2000 | Reduce emission rates across all active systems proportionally |
| Active animations > 50 | Complete oldest animations immediately (snap to end state) |
| State update latency > 16ms | Log warning with timestamp delta for debugging |
| Texture memory > 64MB | Refuse to load additional textures; use fallback materials |
| Mesh instances > 200 | Refuse to create new instances; reuse disposed slots |

---

## 10. Asset Loading

### 10.1 Asset Manifest

**`asset-manifest.ts`** defines all assets with URLs and priorities:

```typescript
export const ASSET_MANIFEST = {
  preload: [
    { id: 'card-face-atlas', url: 'assets/textures/card-atlas-4096.png', sizeMb: 64 },
    { id: 'card-back', url: 'assets/textures/card-back.png', sizeMb: 1 },
    { id: 'paper-normal', url: 'assets/textures/paper-normal.png', sizeMb: 1 },
  ],
  async: [
    { id: 'particle-sprites', url: 'assets/textures/particle-sprites.png', sizeMb: 0.5 },
    { id: 'font-score', url: 'assets/fonts/score-display.png', sizeMb: 0.25 },
  ],
} as const;
```

### 10.2 Loading Sequence

**`asset-loader.ts`** implements the loading pipeline:

1. **Preload phase (blocking):**
   - Show loading screen with progress bar
   - Load card face texture atlas (4096×4096), card back texture, shared normal map sequentially
   - Total: ~65MB
   - Progress callback: `(loaded: number, total: number) => void`
   - On completion: hide loading screen, proceed to scene initialization

2. **Async phase (non-blocking):**
   - Load particle system textures and font textures in background
   - No loading screen — scene is already interactive
   - On completion: swap in higher-quality particle sprites and font textures

3. **Fallback strategy:**

   **Texture atlas failure → Solid-color card faces with text labels:**
   - Detection: `AssetLoader.loadPreload()` catches `Texture.LoadError` or network timeout (30s limit).
   - Fallback material: Each card face uses a solid PBR material with:
     - Diffuse color: Suit-based (hearts/diamonds = red `#CC0000`, clubs/spades = black `#111111`).
     - Text label: Rank character rendered via BabylonJS `DynamicTexture` (canvas-based) applied as the diffuse texture. Font: Orbitron 64px, white for black suits, black for red suits.
     - Roughness: 0.9 (matte card feel), Metallic: 0.0.
   - Visual quality: Lower than hand-crafted atlas but fully functional. Cards remain readable and playable.
   - UX: A non-blocking toast notification appears: "Card art failed to load — using text-only mode." Dismissable.
   - **Note:** The primary card art is hand-crafted and packed into the 4096×4096 texture atlas. This fallback only triggers on load failure (e.g., network error, corrupted file).

   **Particle texture failure → Glow-layer-only effects:**
   - Detection: `ParticleSystemManager.initialize()` catches missing sprite texture.
   - Fallback: Particle systems use default point sprites (white circles) instead of custom sprites. Glow layer effects (emissive card borders) continue to work since they use material emissive color, not textures.
   - Visual quality: Particles are plain circles instead of themed sprites. Seal burst, wild glow, etc. still visible but less polished.
   - UX: No notification — the degradation is subtle enough to not interrupt gameplay.

   **Normal map failure → Flat shading:**
   - Detection: `AssetLoader.loadPreload()` catches normal map load error.
   - Fallback: All card materials use `roughness: 1.0` with no normal map. Cards appear flat/shiny instead of having paper texture.
   - Visual quality: Noticeable but not game-breaking. Cards still have correct colors and glow effects.
   - UX: Logged as warning. No player notification.

   **General fallback rules:**
   - All fallbacks are logged via `console.warn()` with the specific failure reason and asset ID.
   - Fallbacks are applied per-asset — if only the normal map fails, the atlas and particle textures still load normally.
   - The game remains fully playable under any combination of fallback conditions.
   - Fallback state is persisted in `ErrorRecoveryService` for debugging (Area 8 error log).

### 10.3 Loader API

```typescript
class AssetLoader {
  async loadPreload(onProgress: (loaded: number, total: number) => void): Promise<void>;
  loadAsync(): Promise<void>;  // Fire-and-forget, resolves when done
  getTexture(id: string): Texture | null;
  getFallbackMaterial(): PBRMaterial;
  dispose(): void;
}
```

---

## 11. BabylonJS Boundary Implementation

### 11.1 Contract Reference

Area 7 owns the `BabylonJSBoundaryContract` (Area 7, Section 2.4). Area 6 implements the scene-side rendering logic for each entry in the contract. Area 6 must not redefine the boundary contract — it references Area 7 by name and section.

### 11.2 Scene Update Methods (Input from Angular)

**`scene-update-handlers.ts`** implements the methods that Area 7's `SceneBridgeService` calls:

| Method | Called When | Implementation |
|--------|-------------|----------------|
| `syncCardMeshes(states: CardMeshState[]): void` | Card visual states change (deal, meld, discard, etc.) | For each card state, find the `CardMesh` by ID, update `visualState`, `glowIntensity`, `glowColorToken`, `isFaceUp`, `zOrder`. Trigger appropriate animation via `AnimationController`. |
| `syncMeldZones(zones: MeldZoneState[]): void` | Meld zone states change (seal, add card, etc.) | Update zone highlight materials, canasta indicators, and card positions within zones. |
| `syncActionButtons(states: ActionButtonState[]): void` | Action button enabled/disabled states change | Update button overlay visibility and glow states. |
| `transitionScene(target: SceneLayout): void` | Screen layout changes (gameplay → shop → score) | Trigger `Transitioning` animation, move camera, swap visible node groups. |
| `highlightCard(cardId: string, highlightType: string): void` | Card needs visual highlight (hover, selection, etc.) | Set card glow color and intensity based on highlight type. Trigger `Selecting`/`Hovering` animation. |
| `updateDragGhost(cardId: string, screenPos: {x: number, y: number}): void` | Mouse moves during drag | Convert screen position to world position, update card mesh position. Card is in `Dragging` state. |

### 11.3 Scene Event Raising (Output to Angular)

**`scene-event-raiser.ts`** raises events that `SceneBridgeService` listens to:

| Event | Raised When | Payload |
|-------|-------------|---------|
| `onCardClicked` | Player clicks a card mesh | `{ cardId: string, button: 'left' | 'right' }` |
| `onCardDroppedOnMeldZone` | Player drops a card on a meld zone | `{ cardId: string, zoneIndex: number }` |
| `onDrawPileClicked` | Player clicks the draw pile | `{}` |
| `onActionButtonClicked` | Player clicks an action button | `{ action: 'draw' | 'meld' | 'discard' | 'goOut' }` |
| `onShopItemClicked` | Player clicks a shop item in the shop screen | `{ itemId: string }` |

### 11.4 Event Raising Mechanism

Events are raised via a simple observer pattern:

```typescript
type SceneEventHandler<T> = (payload: T) => void;

class SceneEventRaiser {
  onCardClicked(handler: SceneEventHandler<{ cardId: string; button: 'left' | 'right' }>): void;
  onCardDroppedOnMeldZone(handler: SceneEventHandler<{ cardId: string; zoneIndex: number }>): void;
  onDrawPileClicked(handler: SceneEventHandler<void>): void;
  onActionButtonClicked(handler: SceneEventHandler<{ action: string }>): void;
  onShopItemClicked(handler: SceneEventHandler<{ itemId: string }>): void;
}
```

Area 7's `SceneBridgeService` subscribes to these events and translates them into Angular signal updates.

---

## 12. Unit Test Plan

### 12.1 Scene Graph Tests (`scene/scene-graph.test.ts`)

| Test | Description |
|------|-------------|
| `should create root node` | Verify root node has `nodeType: 'root'`, `parentNodeId: null` |
| `should create node with unique IDs` | Creating two nodes produces different IDs |
| `should set parent-child relationship` | After `setParent`, child's `parentNodeId` and parent's `childNodeIds` are correct |
| `should remove node and descendants` | Removing a node also removes all descendants |
| `should get descendants depth-first` | `getDescendants` returns nodes in correct order |
| `should get nodes by type` | `getNodesByType('cardMesh')` returns only card mesh nodes |
| `should build full scene graph` | `buildSceneGraph()` creates the complete hierarchy with correct node counts |
| `should enforce single root` | Attempting to create a second root throws an error |

### 12.2 Card Mesh Pipeline Tests (`cards/card-mesh-pipeline.test.ts`)

| Test | Description |
|------|-------------|
| `should create shared card geometry` | Plane mesh has correct dimensions (0.063 × 0.088) |
| `should create PBR face material` | Material has correct roughness (0.7), metallic (0.0), and diffuse texture |
| `should create PBR back material` | Material has correct roughness (0.8), metallic (0.0), and shared texture |
| `should create glow overlay material` | Material has emissive color set and alpha blend mode |
| `should create card mesh with correct IDs` | All mesh/material IDs follow naming convention |
| `should set z-order on card mesh` | `zOrder` property is correctly assigned |
| `should handle face-up and face-down states` | `isFaceUp` toggles front/back mesh visibility |

### 12.3 Texture Atlas Tests (`cards/texture-atlas.test.ts`)

| Test | Description |
|------|-------------|
| `should calculate UV coords for Ace of Spades` | `getAtlasCoords('A', 'spades')` returns correct `{u0, v0, u1, v1}` |
| `should calculate UV coords for King of Hearts` | `getAtlasCoords('K', 'hearts')` returns correct coords |
| `should calculate UV coords for null suit` | `getAtlasCoords('Joker', null)` returns correct coords |
| `should return valid UV range` | All coords are in [0, 1] range |
| `should have non-overlapping cells` | Different rank/suit combinations produce non-overlapping UV regions |
| `should apply UV coords to material` | `applyToMaterial` sets correct UV offset and scale on texture |

### 12.4 Animation State Machine Tests (`animation/animation-state-machine.test.ts`)

| Test | Description |
|------|-------------|
| `should start in Idle state` | New machine has `state: 'Idle'` |
| `should allow Idle → Dealing` | Transition from Idle to Dealing succeeds |
| `should allow Dealing → Idle` | Transition from Dealing to Idle succeeds |
| `should allow Idle → Selecting → Dragging → Melding → Idle` | Full drag-to-meld flow succeeds |
| `should reject invalid transition` | `Idle → Sealing` (without melding first) returns false |
| `should evaluate linear easing` | `evaluate` returns 0.5 at 50% of duration for linear easing |
| `should evaluate easeOutBack overshoot` | `easeOutBack` exceeds 1.0 before settling |
| `should detect completion` | `isComplete` returns true when `now >= startTime + durationMs` |
| `should record correct duration` | Each state transition records the correct duration from the timing table |
| `should handle all 14 states` | Every state in `AnimationStateType` has a valid transition from/to Idle |

### 12.5 Particle System Tests (`effects/particle-system-manager.test.ts`)

| Test | Description |
|------|-------------|
| `should initialize all 5 particle systems` | After `initialize`, 5 systems exist in inactive state |
| `should activate particle system` | `activate('seal-burst', pos)` sets system to emitting |
| `should deactivate particle system` | `deactivate('seal-burst')` stops emission |
| `should track active count` | `getActiveCount()` returns correct number of emitting systems |
| `should enforce max particle systems` | Activating a 9th system is refused when budget is 8 |
| `should enforce max total particles` | Emission is throttled when total particles exceed 2000 |
| `should follow target card` | `setTargetCard` makes particle system position track card mesh |

### 12.6 Performance Budget Tests (`performance/performance-budget.test.ts`)

| Test | Description |
|------|-------------|
| `should define all 10 budget items` | `PERFORMANCE_BUDGET` has all required fields |
| `should have correct budget values` | Each field matches the specified value (60fps, 100 draw calls, etc.) |
| `should report within budget` | `isWithinBudget()` returns true when all metrics are below thresholds |
| `should report draw call violation` | Exceeding 100 draw calls triggers violation |
| `should report FPS violation` | FPS below 60 for 3+ frames triggers violation |
| `should report particle count violation` | Exceeding 2000 total particles triggers violation |
| `should report animation count violation` | Exceeding 50 active animations triggers violation |
| `should report mesh instance violation` | Exceeding 200 mesh instances triggers violation |
| `should return violation descriptions` | `getViolations()` returns human-readable strings for each violation |

---

## 13. Dependencies

### 13.1 Area 5 — UI/UX Design

Area 6 references Area 5's design token table (Area 5, Section 4) for all material colors, glow colors, and visual effect colors. Area 6 does not redefine any design tokens — it maps them to BabylonJS material properties.

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

### 13.2 Area 7 — Angular App Architecture

Area 7 owns the `BabylonJSBoundaryContract` (Area 7, Section 2.4). Area 6 implements the scene-side rendering logic:

- **Input signals:** `syncCardMeshes`, `syncMeldZones`, `syncActionButtons`, `transitionScene`, `highlightCard`, `updateDragGhost`
- **Output events:** `onCardClicked`, `onCardDroppedOnMeldZone`, `onDrawPileClicked`, `onActionButtonClicked`, `onShopItemClicked`

Area 6 must not redefine the boundary contract.

### 13.3 Upstream Type Imports

```typescript
// From Area 1 (Game Rules):
import type { Card, Meld, CanastaType, MeldValidationResult } from '../area1-game-rules';

// From Area 5 (UI/UX Design):
import type { DesignToken } from '../area5-ui-ux';

// From Area 7 (Angular App Architecture):
import type { BabylonJSBoundaryContract } from '../area7-angular-architecture';
```

---

## 14. Implementation Order

Implement in the following order to respect dependencies and enable incremental testing:

1. **Type definitions** — Create all interfaces and types in `src/babylonjs/types.ts` (or co-located with their modules). This unblocks all other work.

2. **Performance budget** — Implement `performance-budget.ts` and `performance-monitor.ts`. These are pure logic with no BabylonJS dependency and can be tested immediately.

3. **Easing functions** — Implement `easing-functions.ts`. Pure math, no BabylonJS dependency. Test all 6 functions.

4. **Animation state machine** — Implement `animation-state-machine.ts` and `animation-controller.ts`. Depends on easing functions and types. Test transition table and timing.

5. **Scene graph** — Implement `scene-node-factory.ts` and `scene-graph.ts`. Pure data structures, no BabylonJS rendering. Test hierarchy operations.

6. **Camera & lighting** — Implement `camera-setup.ts` and `lighting-setup.ts`. Requires a BabylonJS scene. Test orthographic properties and light parameters.

7. **Texture atlas** — Implement `texture-atlas.ts`. Test UV coordinate calculation independently of rendering.

8. **Card mesh pipeline** — Implement `card-material-factory.ts` and `card-mesh-pipeline.ts`. Depends on texture atlas. Test material properties and geometry dimensions.

9. **Card mesh manager** — Implement `card-mesh-manager.ts`. Depends on pipeline and scene graph. Test CRUD operations and z-ordering.

10. **Glow layer manager** — Implement `glow-layer-manager.ts`. Depends on card mesh manager. Test emissive color and intensity animation.

11. **Particle configs** — Implement `particle-configs.ts`. Pure data, no BabylonJS dependency. Validate all 5 configs.

12. **Particle system manager** — Implement `particle-system-manager.ts`. Depends on configs and scene. Test activation/deactivation lifecycle.

13. **Scene manager** — Implement `scene-manager.ts`. Orchestrates all subsystems. Test full scene initialization and disposal.

14. **Asset loader** — Implement `asset-manifest.ts` and `asset-loader.ts`. Test preload sequence and fallback strategy.

15. **Boundary implementation** — Implement `scene-update-handlers.ts` and `scene-event-raiser.ts`. Depends on all subsystems. Test that Angular method calls produce correct scene state changes and that scene events are raised correctly.

16. **Integration testing** — End-to-end test of the full pipeline: load assets → build scene → deal cards → meld → seal canasta → verify scene state matches the worked example in design doc Section 4.

---

## 15. Acceptance Criteria

### 15.1 Scene Graph

- [ ] Full hierarchy created: root → camera, lighting, table, meld zones, card meshes, particle systems, UI overlays
- [ ] All node types supported: `root`, `table`, `meldZone`, `cardMesh`, `uiOverlay`, `particleSystem`, `light`, `camera`
- [ ] Node creation assigns unique IDs following the naming convention
- [ ] Parent-child relationships are bidirectional (parent tracks children, child tracks parent)
- [ ] `removeNode` recursively removes all descendants
- [ ] `getNodesByType` returns correct filtered results

### 15.2 Card Mesh Pipeline

- [ ] Shared card geometry: 0.063m × 0.088m plane mesh
- [ ] Card back material: PBR with roughness 0.8, metallic 0.0, shared across all cards
- [ ] Card face materials: PBR with roughness 0.7, metallic 0.0, per-card-type diffuse texture from atlas
- [ ] Glow overlay material: emissive color from design tokens, alpha blend mode
- [ ] Texture atlas: 4096×4096, 16×13 grid, correct UV coordinate calculation
- [ ] Instanced rendering: card faces and backs use instancing (2 draw calls for all cards)

### 15.3 Camera & Lighting

- [ ] Orthographic camera: position {0, 10, 0}, ortho width 2.0, ortho height 1.4
- [ ] Hemispheric ambient light: color from `--color-ambient-bg`, intensity 0.4
- [ ] Directional light: color from `--color-neon-cyan`, intensity 0.6, direction {-5, 10, -5}
- [ ] Point highlight light: color from `--color-selection-glow`, intensity 0.0→1.0 animated, follows selected card

### 15.4 Animation State Machine

- [ ] All 14 states implemented: Idle, Dealing, Melding, Sealing, Discarding, Drawing, Selecting, Deselecting, Dragging, Hovering, Transitioning, ScoreReveal, ShopEntrance, ScreenTransition
- [ ] Transition table enforced: valid transitions succeed, invalid transitions are rejected
- [ ] All timing values correct in milliseconds per the timing table
- [ ] All 6 easing functions produce correct curves (test at t=0, t=0.5, t=1)
- [ ] Staggered dealing: 50ms stagger between cards

### 15.5 Particle Effects

- [ ] All 5 particle system configs defined: seal-burst, wild-glow, frozen-shimmer, hot-flame, selection-pulse
- [ ] Particle systems activate/deactivate correctly
- [ ] Particle systems follow target cards when configured
- [ ] Max particle system count enforced (8)
- [ ] Max total particle count enforced (2000)

### 15.6 Performance Budget

- [ ] `PERFORMANCE_BUDGET` constant has all 10 items with correct values
- [ ] `PerformanceMonitor` tracks all metrics: FPS, draw calls, particles, animations, mesh instances, latency
- [ ] Budget violations are detected and reported
- [ ] Enforcement actions trigger on violation (emission rate reduction, refusal to create, etc.)

### 15.7 Asset Loading

- [ ] Preload phase loads atlas, card back, and normal map sequentially with progress callback
- [ ] Async phase loads particle sprites and font textures in background
- [ ] Fallback: solid-color cards with text labels when atlas fails
- [ ] Fallback: glow-layer-only effects when particle textures fail
- [ ] All fallbacks log warnings with specific failure reasons

### 15.8 BabylonJS Boundary

- [ ] All 6 scene update methods implemented: `syncCardMeshes`, `syncMeldZones`, `syncActionButtons`, `transitionScene`, `highlightCard`, `updateDragGhost`
- [ ] All 5 scene events raised: `onCardClicked`, `onCardDroppedOnMeldZone`, `onDrawPileClicked`, `onActionButtonClicked`, `onShopItemClicked`
- [ ] Boundary contract references Area 7 by name and section (no redefinition)

### 15.9 Unit Tests

- [ ] Scene graph tests: 8 tests passing
- [ ] Card mesh pipeline tests: 7 tests passing
- [ ] Texture atlas tests: 6 tests passing
- [ ] Animation state machine tests: 10 tests passing
- [ ] Particle system tests: 7 tests passing
- [ ] Performance budget tests: 9 tests passing
- [ ] Total: 47 tests, all passing

### 15.10 Worked Example Validation

- [ ] Deal animation: 11 cards dealt with 50ms stagger, easeOutBack, 300ms duration each
- [ ] Meld animation: 7 cards melded to zone 0, easeInOutQuad, 250ms duration each
- [ ] Seal animation: 800ms easeOutElastic, glow intensity 1.0→0.3, 200 gold particles in ring pattern
- [ ] Final scene state matches the verification table in design doc Section 4 Step 4
