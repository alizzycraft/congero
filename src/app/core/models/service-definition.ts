export type DsfrRole = 'STATE' | 'TRANSFORM' | 'ORCHESTRATION' | 'EFFECT';

export interface ServiceDefinition {
  name: string;
  roles: readonly DsfrRole[];
  ownedSignals: readonly string[];
  entryPoints: readonly string[];
  dependencies: readonly string[];
}
