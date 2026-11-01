import { Directive, ElementRef, HostListener, inject } from '@angular/core';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('keydown.tab', ['$event'])
  protected trapTab(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const focusable = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (keyboardEvent.shiftKey && document.activeElement === first) {
      keyboardEvent.preventDefault();
      last.focus();
    } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }
}
