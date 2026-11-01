export interface InvariantViolation {
  invariant: number;
  message: string;
}

export interface InvariantResult {
  valid: boolean;
  violations: InvariantViolation[];
}

export type InvariantCheck = (state: import('../models').RunState) => InvariantViolation | null;
