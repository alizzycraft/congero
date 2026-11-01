import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject } from '@angular/core';
import { SceneBridgeService } from '../../../core/services/scene-bridge.service';
import { SceneManager } from '@rendering/index';

@Component({
  selector: 'app-babylon-scene',
  standalone: true,
  templateUrl: './babylon-scene.component.html',
  styleUrl: './babylon-scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BabylonSceneComponent implements AfterViewInit, OnDestroy {
  readonly bridge = inject(SceneBridgeService);

  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  protected readonly objectCount = computed(() => this.bridge.snapshot().cardMeshes.length);
  private readonly sceneManager = new SceneManager();
  private initialized = false;

  constructor() {
    effect(() => {
      const snapshot = this.bridge.snapshot();
      if (this.initialized) {
        this.sceneManager.update(snapshot);
      }
    });
  }

  ngAfterViewInit(): void {
    this.sceneManager.initialize(this.canvasRef.nativeElement);
    this.initialized = true;
    this.sceneManager.update(this.bridge.snapshot());
    window.addEventListener('resize', this.resize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resize);
    this.sceneManager.dispose();
  }

  private readonly resize = (): void => this.sceneManager.resize();
}
