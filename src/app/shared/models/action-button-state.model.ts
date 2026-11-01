export type ActionButtonInteractionState = 'enabled' | 'disabled' | 'loading';

export interface ActionButtonState {
  id: string;
  label: string;
  iconId: string;
  interactionState: ActionButtonInteractionState;
  shortcut: string | null;
  ariaLabel: string;
}
