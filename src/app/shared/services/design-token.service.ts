import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import type { DesignTokenCategory } from '../models';

@Injectable({ providedIn: 'root' })
export class DesignTokenService {
  private readonly document = inject(DOCUMENT);

  getToken(category: DesignTokenCategory, name: string): string {
    const styles = this.document.defaultView?.getComputedStyle(this.document.documentElement);
    return styles?.getPropertyValue(`--congero-${category}-${name}`).trim() ?? '';
  }

  getColor(name: string): string {
    return this.getToken('color', name);
  }

  getSpacing(name: string): string {
    return this.getToken('spacing', name);
  }

  getPanel(name: string): string {
    return this.getToken('panel', name);
  }
}
