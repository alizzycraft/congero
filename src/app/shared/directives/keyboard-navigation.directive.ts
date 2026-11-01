import { Directive, HostListener, output } from '@angular/core';

export type KeyboardNavigationAction =
  | 'previous-card'
  | 'next-card'
  | 'previous-zone'
  | 'next-zone'
  | 'toggle-selection'
  | 'meld'
  | 'discard'
  | 'go-out'
  | 'draw'
  | 'cancel'
  | 'read-hand'
  | `meld-zone-${1 | 2 | 3 | 4 | 5}`;

@Directive({
  selector: '[appKeyboardNavigation]',
  standalone: true,
})
export class KeyboardNavigationDirective {
  readonly navigationAction = output<KeyboardNavigationAction>();

  @HostListener('keydown', ['$event'])
  protected keyDown(event: KeyboardEvent): void {
    const action = this.actionFor(event);
    if (!action) return;
    event.preventDefault();
    this.navigationAction.emit(action);
  }

  private actionFor(event: KeyboardEvent): KeyboardNavigationAction | null {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft') return 'previous-card';
    if (key === 'arrowright') return 'next-card';
    if (key === 'arrowup') return 'previous-zone';
    if (key === 'arrowdown') return 'next-zone';
    if (key === 'enter' || key === ' ') return 'toggle-selection';
    if (key === 'm') return 'meld';
    if (key === 'd') return 'discard';
    if (key === 'g') return 'go-out';
    if (key === 'w') return 'draw';
    if (key === 'escape') return 'cancel';
    if (key === 'h') return 'read-hand';
    if (['1', '2', '3', '4', '5'].includes(key)) {
      return `meld-zone-${key as '1' | '2' | '3' | '4' | '5'}`;
    }
    return null;
  }
}
