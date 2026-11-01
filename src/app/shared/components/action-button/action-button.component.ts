import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ActionButtonState } from '../../models';

@Component({
  selector: 'app-action-button',
  standalone: true,
  templateUrl: './action-button.component.html',
  styleUrl: './action-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonComponent {
  readonly state = input.required<ActionButtonState>();
  readonly actionClicked = output<string>();

  protected click(): void {
    const state = this.state();
    if (state.interactionState === 'enabled') {
      this.actionClicked.emit(state.id);
    }
  }
}
