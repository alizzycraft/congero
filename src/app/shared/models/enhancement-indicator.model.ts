import type { EnhancementType } from '@core/enhancements';

export interface EnhancementVisualIndicator {
  type: EnhancementType;
  glowColorToken: string;
  iconId: string;
  label: string;
}

export const ENHANCEMENT_VISUALS: Record<EnhancementType, Omit<EnhancementVisualIndicator, 'type'>> = {
  gilded: { glowColorToken: 'color-enhancementGilded', iconId: 'enhancement-gilded', label: 'Gilded' },
  echo: { glowColorToken: 'color-enhancementEcho', iconId: 'enhancement-echo', label: 'Echo' },
  sticky: { glowColorToken: 'color-enhancementSticky', iconId: 'enhancement-sticky', label: 'Sticky' },
  marked: { glowColorToken: 'color-enhancementMarked', iconId: 'enhancement-marked', label: 'Marked' },
  pure: { glowColorToken: 'color-enhancementPure', iconId: 'enhancement-pure', label: 'Pure' },
  hot: { glowColorToken: 'color-enhancementHot', iconId: 'enhancement-hot', label: 'Hot' },
  frozen: { glowColorToken: 'color-enhancementFrozen', iconId: 'enhancement-frozen', label: 'Frozen' },
  partner: { glowColorToken: 'color-enhancementPartner', iconId: 'enhancement-partner', label: 'Partner' },
  buried: { glowColorToken: 'color-enhancementBuried', iconId: 'enhancement-buried', label: 'Buried' },
  anchor: { glowColorToken: 'color-enhancementAnchor', iconId: 'enhancement-anchor', label: 'Anchor' },
};
