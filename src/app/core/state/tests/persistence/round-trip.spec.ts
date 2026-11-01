import { describe, expect, it } from 'vitest';
import { autoSave, createInitialRunState, deserializeRunState, loadRunState, serializeRunState } from '../../index';
import type { StoragePort } from '../../index';

class MemoryStorage implements StoragePort {
  private readonly records = new Map<string, string>();

  getItem(key: string): string | null {
    return this.records.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.records.set(key, value);
  }

  removeItem(key: string): void {
    this.records.delete(key);
  }
}

describe('Area 8 persistence', () => {
  it('round-trips serialized run state', () => {
    const state = createInitialRunState('run-round-trip', 1000);
    const serialized = serializeRunState(state);

    expect(deserializeRunState(serialized)).toEqual(state);
  });

  it('saves and loads from local storage port synchronously', () => {
    const storage = new MemoryStorage();
    const state = createInitialRunState('run-save', 1000);

    const save = autoSave(state, 'MANUAL_SAVE', storage, 2000);
    const load = loadRunState('run-save', storage);

    expect(save.success).toBe(true);
    expect(save.savedState?.saveCount).toBe(1);
    expect(load.success).toBe(true);
    expect(load.state?.lastSavedAt).toBe(2000);
  });
});
