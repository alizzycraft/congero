import {
  ArcRotateCamera,
  Camera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type { MeldZoneRenderObject } from '@shared/models';
import type { SceneUpdateSnapshot } from '../boundary/scene-update-handlers';
import type { CardMesh, Vector3Like } from '../types';

export class SceneManager {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private readonly cardMeshes = new Map<string, Mesh>();
  private readonly meldZoneMeshes = new Map<string, Mesh>();

  initialize(canvas: HTMLCanvasElement): void {
    this.dispose();
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.05, 0.08, 1);

    const camera = new ArcRotateCamera(
      'camera-main',
      -Math.PI / 2,
      Math.PI / 3,
      8,
      Vector3.Zero(),
      this.scene,
    );
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -6;
    camera.orthoRight = 6;
    camera.orthoTop = 3.5;
    camera.orthoBottom = -3.5;
    camera.attachControl(canvas, true);

    new HemisphericLight('light-ambient', new Vector3(0, 1, 0), this.scene);
    const table = MeshBuilder.CreateBox(
      'table-surface',
      { width: 11, height: 0.08, depth: 6.5 },
      this.scene,
    );
    const material = new StandardMaterial('material-table-surface', this.scene);
    material.diffuseColor = new Color3(0.06, 0.09, 0.13);
    material.emissiveColor = new Color3(0, 0.08, 0.1);
    table.material = material;

    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });
  }

  update(snapshot: SceneUpdateSnapshot): void {
    if (!this.scene) return;
    this.syncCardMeshes(snapshot.cardMeshes);
    this.syncMeldZones(snapshot.meldZones);
  }

  resize(): void {
    this.engine?.resize();
  }

  dispose(): void {
    this.cardMeshes.clear();
    this.meldZoneMeshes.clear();
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
  }

  private syncCardMeshes(cardMeshes: readonly CardMesh[]): void {
    const activeIds = new Set(cardMeshes.map((card) => card.cardId));
    for (const [cardId, mesh] of this.cardMeshes) {
      if (!activeIds.has(cardId)) {
        mesh.dispose();
        this.cardMeshes.delete(cardId);
      }
    }

    for (const card of cardMeshes) {
      const mesh = this.cardMeshes.get(card.cardId) ?? this.createCardMesh(card);
      this.cardMeshes.set(card.cardId, mesh);
      this.applyCardMeshState(mesh, card);
    }
  }

  private syncMeldZones(zones: readonly MeldZoneRenderObject[]): void {
    const activeIds = new Set(zones.map((zone) => zone.id));
    for (const [zoneId, mesh] of this.meldZoneMeshes) {
      if (!activeIds.has(zoneId)) {
        mesh.dispose();
        this.meldZoneMeshes.delete(zoneId);
      }
    }

    for (const zone of zones) {
      const mesh = this.meldZoneMeshes.get(zone.id) ?? this.createMeldZoneMesh(zone);
      this.meldZoneMeshes.set(zone.id, mesh);
      this.applyTransform(mesh, zone.transform.position, zone.transform.rotation, zone.transform.scale);
      mesh.isVisible = zone.visible;
    }
  }

  private createCardMesh(card: CardMesh): Mesh {
    if (!this.scene) throw new Error('SceneManager must be initialized before creating card meshes.');
    const mesh = MeshBuilder.CreateBox(card.faceMeshId, { width: 0.48, height: 0.03, depth: 0.68 }, this.scene);
    mesh.material = new StandardMaterial(`material-${card.cardId}`, this.scene);
    return mesh;
  }

  private createMeldZoneMesh(zone: MeldZoneRenderObject): Mesh {
    if (!this.scene) throw new Error('SceneManager must be initialized before creating meld zone meshes.');
    const mesh = MeshBuilder.CreateBox(zone.sceneNodeId, { width: 1.7, height: 0.02, depth: 0.9 }, this.scene);
    const material = new StandardMaterial(`material-${zone.id}`, this.scene);
    material.diffuseColor = new Color3(0.02, 0.22, 0.26);
    material.emissiveColor = new Color3(0, 0.12, 0.15);
    material.alpha = 0.72;
    mesh.material = material;
    return mesh;
  }

  private applyCardMeshState(mesh: Mesh, card: CardMesh): void {
    this.applyTransform(mesh, card.position, card.rotation, card.scale);
    mesh.isVisible = true;
    mesh.position.y += 0.05 + card.zOrder * 0.002;

    const material = mesh.material instanceof StandardMaterial ? mesh.material : null;
    if (!material) return;

    const color = this.cardColor(card);
    const glow = Math.max(0, Math.min(1, card.glowIntensity));
    material.diffuseColor = color;
    material.emissiveColor = new Color3(color.r * glow * 0.55, color.g * glow * 0.55, color.b * glow * 0.55);
  }

  private applyTransform(mesh: Mesh, position: Vector3Like, rotation: Vector3Like, scale: Vector3Like): void {
    mesh.position = new Vector3(position.x, position.y, position.z);
    mesh.rotation = new Vector3(rotation.x, rotation.y, rotation.z);
    mesh.scaling = new Vector3(scale.x, scale.y, scale.z);
  }

  private cardColor(card: CardMesh): Color3 {
    if (!card.isFaceUp) return new Color3(0.08, 0.11, 0.16);
    if (card.visualState === 'selected' || card.visualState === 'dragging') return new Color3(0.08, 0.75, 0.95);
    if (card.visualState === 'wild') return new Color3(0.36, 0.22, 0.82);
    if (card.visualState === 'enhanced') return new Color3(0.95, 0.58, 0.2);
    if (card.visualState === 'unplayable') return new Color3(0.2, 0.22, 0.27);
    return new Color3(0.9, 0.88, 0.8);
  }
}
