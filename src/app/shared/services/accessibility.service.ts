import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly document = inject(DOCUMENT);
  private liveRegion: HTMLElement | null = null;

  announce(message: string): void {
    const region = this.ensureLiveRegion();
    region.textContent = message;
    window.setTimeout(() => {
      if (region.textContent === message) {
        region.textContent = '';
      }
    }, 3000);
  }

  private ensureLiveRegion(): HTMLElement {
    if (this.liveRegion) return this.liveRegion;
    const region = this.document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    this.document.body.append(region);
    this.liveRegion = region;
    return region;
  }
}
