import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ActionButtonComponent } from '../action-button/action-button.component';
import type { ActionButtonState } from '../../models';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [ActionButtonComponent],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  readonly title = input.required<string>();
  readonly body = input.required<string>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly confirmState: ActionButtonState = {
    id: 'confirm',
    label: 'Confirm',
    iconId: 'ok',
    interactionState: 'enabled',
    shortcut: 'Enter',
    ariaLabel: 'Confirm',
  };

  protected readonly cancelState: ActionButtonState = {
    id: 'cancel',
    label: 'Cancel',
    iconId: 'x',
    interactionState: 'enabled',
    shortcut: 'Escape',
    ariaLabel: 'Cancel',
  };

  protected handleAction(actionId: string): void {
    if (actionId === 'confirm') this.confirmed.emit();
    if (actionId === 'cancel') this.cancelled.emit();
  }
}
