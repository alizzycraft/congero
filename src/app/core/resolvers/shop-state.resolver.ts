import { Injectable } from '@angular/core';
import type { Resolve } from '@angular/router';
import { ShopStateService } from '../services/shop-state.service';

@Injectable({ providedIn: 'root' })
export class ShopStateResolver implements Resolve<boolean> {
  constructor(private readonly shopState: ShopStateService) {}

  resolve(): boolean {
    if (this.shopState.shopState() === null) {
      this.shopState.generateCurrentShop();
    }
    return true;
  }
}
