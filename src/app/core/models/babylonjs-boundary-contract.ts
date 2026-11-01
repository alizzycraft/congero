export interface BabylonJSBoundaryContract {
  inputSignals: readonly string[];
  outputEvents: readonly string[];
}

export const BABYLONJS_BOUNDARY_CONTRACT: BabylonJSBoundaryContract = {
  inputSignals: [
    'card-visual-states',
    'meld-visual-states',
    'selected-card-id',
    'drag-state',
    'current-screen',
    'action-button-states',
  ],
  outputEvents: [
    'cardClicked',
    'cardDroppedOnMeldZone',
    'drawPileClicked',
    'actionButtonClicked',
    'shopItemClicked',
  ],
};
