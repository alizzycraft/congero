import type { EnhancementType } from "../models/enhancement-type";
import type { EnhancementInteraction } from "../models/enhancement-interaction";

type InteractionKey = `${EnhancementType}:${EnhancementType}`;

function normalizeKey(a: EnhancementType, b: EnhancementType): InteractionKey {
  return [a, b].sort().join(":") as InteractionKey;
}

const INTERACTION_MAP: Partial<
  Record<
    InteractionKey,
    Omit<EnhancementInteraction, "enhancementA" | "enhancementB">
  >
> = {
  "gilded:pure": {
    interactionType: "synergistic",
    description:
      "Gilded Pure wild counts as 2 size units AND 0 wild count. Most efficient natural canasta builder.",
    numericEffect: null,
  },
  "anchor:gilded": {
    interactionType: "synergistic",
    description:
      "1 Gilded card (size=2) satisfies Anchor 2-card minimum. Place meld with single Gilded card.",
    numericEffect: null,
  },
  "anchor:pure": {
    interactionType: "synergistic",
    description:
      "1 natural + 1 Pure wild = 2-card Anchor meld with 0 effective wilds.",
    numericEffect: null,
  },
  "marked:pure": {
    interactionType: "conflicting",
    description:
      "Wild cards cannot be Marked (Invariant 6). Pure wild excluded from Marked check for red canasta.",
    numericEffect: null,
  },
  "frozen:sticky": {
    interactionType: "synergistic",
    description:
      "Sticky prevents discard, but forced discard triggers Frozen. External override resolves both.",
    numericEffect: null,
  },
};

export function lookupInteraction(
  a: EnhancementType,
  b: EnhancementType,
): EnhancementInteraction {
  const key = normalizeKey(a, b);
  const entry = INTERACTION_MAP[key];
  if (entry) {
    return { enhancementA: a, enhancementB: b, ...entry };
  }
  if (a === b) {
    return {
      enhancementA: a,
      enhancementB: b,
      interactionType: "no_interaction",
      description: `Same-type pair: ${a} + ${b}. No special interaction.`,
      numericEffect: null,
    };
  }
  return {
    enhancementA: a,
    enhancementB: b,
    interactionType: "neutral",
    description: `${a} and ${b} do not affect each other.`,
    numericEffect: null,
  };
}

export function getInteractionMatrix(): Map<
  EnhancementType,
  Map<EnhancementType, EnhancementInteraction>
> {
  const types: EnhancementType[] = [
    "gilded",
    "echo",
    "sticky",
    "marked",
    "pure",
    "hot",
    "frozen",
    "partner",
    "buried",
    "anchor",
  ];
  const matrix = new Map<
    EnhancementType,
    Map<EnhancementType, EnhancementInteraction>
  >();

  for (const a of types) {
    const row = new Map<EnhancementType, EnhancementInteraction>();
    for (const b of types) {
      row.set(b, lookupInteraction(a, b));
    }
    matrix.set(a, row);
  }

  return matrix;
}
