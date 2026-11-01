import type { RunState } from '../models';

export function serializeRunState(state: RunState): string {
  return JSON.stringify(state);
}

export function deserializeRunState(serialized: string): RunState {
  return JSON.parse(serialized) as RunState;
}
