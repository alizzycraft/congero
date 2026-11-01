import type { EasingFunction } from '../types';

export function evaluateEasing(easing: EasingFunction, t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  switch (easing) {
    case 'linear':
      return clamped;
    case 'easeInOutQuad':
      return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
    }
    case 'easeInCubic':
      return clamped * clamped * clamped;
    case 'easeOutElastic': {
      if (clamped === 0 || clamped === 1) return clamped;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1;
    }
    case 'easeOutBounce':
      return easeOutBounce(clamped);
  }
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}
