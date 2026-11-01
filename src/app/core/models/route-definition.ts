export interface RouteDefinition {
  path: string;
  component: string;
  guards: readonly string[];
  resolvers: readonly string[];
}
