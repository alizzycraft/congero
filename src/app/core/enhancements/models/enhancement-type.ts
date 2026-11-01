export type EnhancementType =
  | "gilded"
  | "echo"
  | "sticky"
  | "marked"
  | "pure"
  | "hot"
  | "frozen"
  | "partner"
  | "buried"
  | "anchor";

export interface Enhancement {
  type: EnhancementType;
  instanceId: string;
  appliedViaSeal: boolean;
  duration: "permanent" | "end_of_round";
  configValue: string | null;
}

export const RED_ENHANCEMENT_MARKER_ID: EnhancementType = "marked";
