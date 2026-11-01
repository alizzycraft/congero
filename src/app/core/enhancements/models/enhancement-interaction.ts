import type { EnhancementType } from './enhancement-type';

export interface EnhancementInteraction {
  enhancementA: EnhancementType;
  enhancementB: EnhancementType;
  interactionType: 'synergistic' | 'neutral' | 'conflicting' | 'no_interaction';
  description: string;
  numericEffect: number | null;
}
