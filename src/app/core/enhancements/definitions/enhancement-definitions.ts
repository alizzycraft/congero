import { WILD_CARD_RULES } from "../models/wild-card-rule";
export { WILD_CARD_RULES };

export interface EnhancementDefinition {
  type: string;
  name: string;
  description: string;
  trigger: string;
  effect: string;
  constraints: string[];
}

export const ENHANCEMENT_DEFINITIONS: EnhancementDefinition[] = [
  {
    type: "gilded",
    name: "Gilded",
    description: "Card counts as 2 for meld size.",
    trigger: "Card is placed in a meld",
    effect: "Counts as 2 cards for meld size. Point value NOT doubled.",
    constraints: ["Max 2 Gilded per meld"],
  },
  {
    type: "echo",
    name: "Echo",
    description: "Draw 1 card when melded.",
    trigger: "Card is melded",
    effect: "Draw 1 card.",
    constraints: ["First meld only"],
  },
  {
    type: "sticky",
    name: "Sticky",
    description: "Cannot be discarded.",
    trigger: "Discard attempt",
    effect: "Discard rejected.",
    constraints: ["Can be melded", "Forced discard overrides"],
  },
  {
    type: "marked",
    name: "Marked",
    description: "Red canasta marker.",
    trigger: "Canasta type determination",
    effect: "Carries red marker. All-natural-Marked → red canasta.",
    constraints: ["Natural cards only"],
  },
  {
    type: "pure",
    name: "Pure",
    description: "Wild counts as natural.",
    trigger: "Meld construction",
    effect: "Wild card counts as natural. Retains wild point value.",
    constraints: ["Wild cards only"],
  },
  {
    type: "hot",
    name: "Hot",
    description: "+50 bonus when scored.",
    trigger: "Canasta scored",
    effect: "+50 per Hot card to cardPointTotal.",
    constraints: ["Sealed canasta only"],
  },
  {
    type: "frozen",
    name: "Frozen",
    description: "Freezes discard pile.",
    trigger: "Card is discarded",
    effect: "Discard pile frozen for round.",
    constraints: ["Discard only"],
  },
  {
    type: "partner",
    name: "Partner",
    description: "Partner canasta detection.",
    trigger: "Canasta sealing",
    effect: "Flags meld as partner-eligible.",
    constraints: ["≥1 Partner card per meld"],
  },
  {
    type: "buried",
    name: "Buried",
    description: "Hidden from hand display.",
    trigger: "Card in hand",
    effect: "Hidden until melded.",
    constraints: ["Can be discarded blindly"],
  },
  {
    type: "anchor",
    name: "Anchor",
    description: "Reduces meld minimum to 2.",
    trigger: "Meld validation",
    effect: "Minimum meld size = 2.",
    constraints: ["New meld only"],
  },
];
