export interface WildCardRule {
  rank: '2' | 'JOKER';
  isWild: boolean;
  maxPerMeld: number | null;
  pointValue: number;
  canBePurified: boolean;
}

export const WILD_CARD_RULES: Record<'2' | 'JOKER', WildCardRule> = {
  '2': { rank: '2', isWild: true, maxPerMeld: null, pointValue: 20, canBePurified: true },
  'JOKER': { rank: 'JOKER', isWild: true, maxPerMeld: null, pointValue: 50, canBePurified: true },
};
