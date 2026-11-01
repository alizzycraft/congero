export type DesignTokenCategory = 'color' | 'typography' | 'spacing' | 'panel' | 'bg';

export interface DesignToken {
  category: DesignTokenCategory;
  name: string;
  cssVariable: string;
  value: string;
}
