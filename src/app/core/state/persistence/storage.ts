export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function storageKeyForRun(runId: string): string {
  return `congero:run:${runId}`;
}

export function getDefaultStorage(): StoragePort | null {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

export function writeLocalStorage(key: string, value: string, storage: StoragePort | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readLocalStorage(key: string, storage: StoragePort | null = getDefaultStorage()): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function readIndexedDbStub(_key: string): string | null {
  return null;
}
