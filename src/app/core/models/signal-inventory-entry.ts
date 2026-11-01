import type { DsfrRole } from './service-definition';

export interface SignalInventoryEntry {
  name: string;
  owner: string;
  role: DsfrRole;
  writable: boolean;
  derivedFrom: readonly string[];
}
