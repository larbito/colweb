/**
 * Type definitions for the coloring page generation pipeline
 */

export interface CharacterAnalysis {
  species: string;
  special_features: string[];
  eye_style: string;
  body_proportions: string;
  pose: string;
  clothing_accessories: string[];
}

export interface LineArtAnalysis {
  outer_line_weight: "thin" | "medium" | "thick";
  inner_line_weight: "thin" | "medium" | "thick";
  style: string;
  shading: "none" | "minimal" | "heavy";
}

export interface SceneAnalysis {
  location: string;
  props: string[];
  background: string[];
  composition: string;
}

export interface ImageAnalysis {
  character: CharacterAnalysis;
  line_art: LineArtAnalysis;
  scene: SceneAnalysis;
  constraints: string[];
  character_signature: string; // For consistency across pages
  style_lock: string; // Reusable style string
}

export interface GeneratedPrompt {
  pageIndex: number;
  title: string;
  mainPrompt: string;
  stylePrompt: string;
  compositionPrompt: string;
  negativePrompt: string;
  fullPrompt: string; // Combined final prompt
  characterSignature: string;
  styleLock: string;
}

export interface ValidationResult {
  isValid: boolean;
  hasColor: boolean;
  hasShading: boolean;
  blackRatio: number;
  grayLevelCount: number;
  failureReasons: string[];
}

export interface GenerationResult {
  pageIndex: number;
  imageBase64: string;
  prompt: GeneratedPrompt;
  validation: ValidationResult;
  retryCount: number;
  debug: {
    model: string;
    size: string;
    generationTime: number;
  };
}

// Scene presets for variation
export const SCENE_PRESETS = [
  { id: "kitchen", label: "Kitchen", props: ["oven", "frying pan", "table", "fruit bowl", "plates"], background: ["window", "clock", "cabinets"] },
  { id: "bedroom", label: "Bedroom", props: ["bed", "pillow", "teddy bear", "lamp", "book"], background: ["window", "curtains", "poster"] },
  { id: "garden", label: "Garden", props: ["flowers", "watering can", "butterfly", "bird", "fence"], background: ["trees", "sun", "clouds", "grass"] },
  { id: "beach", label: "Beach", props: ["bucket", "shovel", "sandcastle", "beach ball", "seashells"], background: ["ocean", "sun", "clouds", "palm tree"] },
  { id: "park", label: "Park", props: ["swing", "ball", "kite", "bench", "flowers"], background: ["trees", "sky", "birds", "pathway"] },
  { id: "bathroom", label: "Bathroom", props: ["bathtub", "rubber duck", "bubbles", "towel", "soap"], background: ["mirror", "tiles", "shelf"] },
  { id: "classroom", label: "Classroom", props: ["desk", "books", "pencils", "backpack", "apple"], background: ["blackboard", "clock", "alphabet poster"] },
  { id: "forest", label: "Forest", props: ["mushrooms", "acorns", "log", "basket", "berries"], background: ["tall trees", "bushes", "sunbeams", "birds"] },
  { id: "birthday", label: "Birthday Party", props: ["cake", "balloons", "presents", "party hat", "confetti"], background: ["banner", "streamers", "table"] },
  { id: "winter", label: "Winter Scene", props: ["snowman", "sled", "mittens", "hot cocoa", "snowflakes"], background: ["snow-covered trees", "mountains", "cozy cabin"] },
];

// Activity presets for variation
export const ACTIVITY_PRESETS = [
  "cooking",
  "reading a book",
  "playing with toys",
  "gardening",
  "painting",
  "baking cookies",
  "having a picnic",
  "playing music",
  "dancing",
  "sleeping",
  "eating breakfast",
  "brushing teeth",
  "taking a bath",
  "riding a bicycle",
  "flying a kite",
];












