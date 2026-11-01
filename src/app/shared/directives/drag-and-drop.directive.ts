import { Directive, HostBinding, HostListener, input, output } from '@angular/core';

export interface CardDropEvent {
  cardId: string;
  targetZoneId: string;
}

@Directive({
  selector: '[appDragAndDrop]',
  standalone: true,
})
export class DragAndDropDirective {
  readonly cardId = input<string | null>(null);
  readonly zoneId = input<string | null>(null);
  readonly cardDropped = output<CardDropEvent>();

  @HostBinding('class.card--dragging')
  protected dragging = false;

  @HostListener('dragstart', ['$event'])
  protected dragStart(event: DragEvent): void {
    const cardId = this.cardId();
    if (!cardId) return;
    this.dragging = true;
    event.dataTransfer?.setData('text/plain', cardId);
    event.dataTransfer?.setData('application/congero-card-id', cardId);
  }

  @HostListener('dragover', ['$event'])
  protected dragOver(event: DragEvent): void {
    if (this.zoneId()) {
      event.preventDefault();
    }
  }

  @HostListener('drop', ['$event'])
  protected drop(event: DragEvent): void {
    const targetZoneId = this.zoneId();
    if (!targetZoneId) return;
    event.preventDefault();
    const cardId =
      event.dataTransfer?.getData('application/congero-card-id') ||
      event.dataTransfer?.getData('text/plain');
    if (cardId) {
      this.cardDropped.emit({ cardId, targetZoneId });
    }
  }

  @HostListener('dragend')
  protected dragEnd(): void {
    this.dragging = false;
  }
}
