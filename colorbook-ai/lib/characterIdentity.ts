/**
 * characterIdentity.ts
 * 
 * STRICT Character Identity System for Storybook Mode
 * 
 * This module ensures the SAME character appears on EVERY page:
 * - Character Identity Profile: locked visual traits
 * - Character Identity Contract: prompt block that enforces identity
 * - Vision-based validator: verifies generated images match the character
 */

// Generate unique ID without external dependency
function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================================
// CHARACTER IDENTITY PROFILE
// ============================================================

/**
 * Character Identity Profile - MANDATORY for storybook mode
 * This is a strict contract that defines the character's visual identity.
 * Once created, it MUST NOT change during the book generation.
 */
export interface CharacterIdentityProfile {
  // Unique identifier
  characterId: string;
  
  // Species/Type - LOCKED (e.g., "baby unicorn", "little panda", "young dragon")
  species: string;
  
  // Detailed face description - LOCKED
  faceShape: string;         // e.g., "round with soft cheeks"
  eyeStyle: string;          // e.g., "large oval eyes with small pupils, white highlight"
  noseStyle: string;         // e.g., "tiny button nose"
  mouthStyle: string;        // e.g., "small curved smile"
  
  // Head features - LOCKED
  earStyle: string;          // e.g., "rounded ears on top of head"
  hornStyle?: string;        // e.g., "single spiral horn with 3 stripes"
  hairTuft?: string;         // e.g., "small curly tuft on forehead"
  
  // Body description - LOCKED  
  proportions: string;       // e.g., "chibi style: large head (40% of body), small body"
  bodyShape: string;         // e.g., "round belly, short limbs"
  tailStyle?: string;        // e.g., "fluffy tail with white tip"
  wingStyle?: string;        // e.g., "small feathered wings"
  
  // Markings - LOCKED (critical for pandas, etc.)
  markings: string;          // e.g., "NO filled patches - all markings as outlines only"
  
  // Default outfit - can be changed per scene if specified
  defaultOutfit?: string;
  
  // Traits that MUST NEVER change (for validation)
  doNotChange: string[];
  
  // Optional name for the character
  name?: string;
}

/**
 * Create a new Character Identity Profile from a description
 */
export function createCharacterIdentityProfile(
  description: {
    species: string;
    faceDescription?: string;
    headFeatures?: string;
    bodyDescription?: string;
    markings?: string;
    outfit?: string;
    name?: string;
  }
): CharacterIdentityProfile {
  // Parse face details
  const faceDetails = parseFaceDetails(description.faceDescription || "");
  const headDetails = parseHeadDetails(description.headFeatures || "");
  const bodyDetails = parseBodyDetails(description.bodyDescription || "");
  
  const profile: CharacterIdentityProfile = {
    characterId: generateId(),
    species: description.species,
    faceShape: faceDetails.faceShape || "round, soft features",
    eyeStyle: faceDetails.eyeStyle || "large, expressive eyes",
    noseStyle: faceDetails.noseStyle || "small button nose",
    mouthStyle: faceDetails.mouthStyle || "friendly smile",
    earStyle: headDetails.earStyle || "matching species typical ears",
    hornStyle: headDetails.hornStyle,
    hairTuft: headDetails.hairTuft,
    proportions: bodyDetails.proportions || "cute chibi proportions with large head",
    bodyShape: bodyDetails.bodyShape || "soft, rounded body",
    tailStyle: bodyDetails.tailStyle,
    wingStyle: bodyDetails.wingStyle,
    markings: description.markings || "NO filled black areas - all markings as OUTLINE shapes only",
    defaultOutfit: description.outfit,
    name: description.name,
    doNotChange: [
      "species",
      "face shape",
      "eye style",
      "ear shape",
      "head-to-body ratio",
      "any distinctive features (horn, wings, tail)",
      "markings style (outlines only)",
    ],
  };
  
  return profile;
}

// Helper functions to parse descriptions
function parseFaceDetails(description: string): { faceShape?: string; eyeStyle?: string; noseStyle?: string; mouthStyle?: string } {
  return {
    faceShape: description.includes("face") ? description : undefined,
    eyeStyle: description.includes("eye") ? description : undefined,
    noseStyle: description.includes("nose") ? description : undefined,
    mouthStyle: description.includes("mouth") || description.includes("smile") ? description : undefined,
  };
}

function parseHeadDetails(description: string): { earStyle?: string; hornStyle?: string; hairTuft?: string } {
  return {
    earStyle: description.includes("ear") ? description : undefined,
    hornStyle: description.includes("horn") ? description : undefined,
    hairTuft: description.includes("hair") || description.includes("tuft") ? description : undefined,
  };
}

function parseBodyDetails(description: string): { proportions?: string; bodyShape?: string; tailStyle?: string; wingStyle?: string } {
  return {
    proportions: description.includes("proportion") || description.includes("chibi") ? description : undefined,
    bodyShape: description.includes("body") ? description : undefined,
    tailStyle: description.includes("tail") ? description : undefined,
    wingStyle: description.includes("wing") ? description : undefined,
  };
}

// ============================================================
// CHARACTER IDENTITY CONTRACT (PROMPT BLOCK)
// ============================================================

/**
 * Build the Character Identity Contract block to inject into EVERY prompt.
 * This is extremely explicit and repetitive to ensure the AI follows it.
 */
export function buildCharacterIdentityContract(profile: CharacterIdentityProfile): string {
  const charName = profile.name ? ` named "${profile.name}"` : "";
  
  return `
=== CHARACTER IDENTITY CONTRACT (MUST MATCH EXACTLY ON EVERY PAGE) ===

The main character is ALWAYS the same ${profile.species}${charName}.

DO NOT CHANGE THE SPECIES. DO NOT CHANGE THE FACE. DO NOT ADD NEW MARKINGS.
If you draw any other animal (panda/raccoon/bear/cat/etc.), that is WRONG.
Generate ONLY the specified ${profile.species}.

FACE (MUST MATCH):
- Face shape: ${profile.faceShape}
- Eyes: ${profile.eyeStyle}
- Nose: ${profile.noseStyle}
- Mouth: ${profile.mouthStyle}

HEAD (MUST MATCH):
- Ears: ${profile.earStyle}
${profile.hornStyle ? `- Horn: ${profile.hornStyle} (EXACT shape, size, position)` : "- No horn"}
${profile.hairTuft ? `- Hair/Tuft: ${profile.hairTuft}` : ""}

BODY (MUST MATCH):
- Proportions: ${profile.proportions}
- Body shape: ${profile.bodyShape}
${profile.tailStyle ? `- Tail: ${profile.tailStyle}` : ""}
${profile.wingStyle ? `- Wings: ${profile.wingStyle}` : ""}

MARKINGS: ${profile.markings}

WHAT CAN CHANGE: pose, action, expression, environment, props
WHAT CANNOT CHANGE: species, face design, body proportions, distinctive features

WARNING: The character must be INSTANTLY RECOGNIZABLE as the SAME individual.
Any deviation from this identity contract is a failure.`;
}

/**
 * Build a stronger retry reinforcement for character identity
 */
export function buildCharacterRetryReinforcement(profile: CharacterIdentityProfile): string {
  return `
CRITICAL: You MUST draw the EXACT SAME ${profile.species} character.
DO NOT substitute with panda, raccoon, bear, or any other animal.
DO NOT change the face design or body proportions.
Match the identity contract EXACTLY: ${profile.species} with ${profile.faceShape}, ${profile.eyeStyle}, ${profile.proportions}.
This is the SAME character from previous pages - draw it IDENTICALLY.`;
}

// ============================================================
// OUTLINE-ONLY CONTRACT (PROMPT BLOCK)
// ============================================================

/**
 * Build the Outline-Only Contract block for prompts.
 * This is the strictest version to prevent any black fills.
 */
export function buildOutlineOnlyContract(): string {
  return `
=== OUTLINE-ONLY CONTRACT (NO EXCEPTIONS) ===

This is a COLORING PAGE. OUTLINES ONLY. NO FILLS.

RULES:
1. OUTLINES ONLY - pure black lines on pure white background
2. NO solid black fills ANYWHERE - not even tiny areas
3. NO grayscale, NO shading, NO gradients, NO gray pixels
4. ALL interior regions must remain WHITE/UNFILLED
5. NO filled shapes - every shape is an OUTLINE only

DARK PATCHES (panda eye patches, raccoon mask, dark ears, etc.):
- Draw as OUTLINE SHAPES ONLY (like a boundary line)
- Interior of patches must remain WHITE
- Do NOT fill them with black
- Do NOT use gray

EYES:
- Draw as hollow circles with white centers
- Do NOT fill pupils with solid black
- Use small outline circles instead

The output must be PURE LINE ART suitable for coloring with crayons.
Any filled black regions or gray areas are WRONG.`;
}

// ============================================================
// VISION-BASED VALIDATION
// ============================================================

/**
 * Result of character validation using vision model
 */
export interface CharacterValidationResult {
  valid: boolean;
  detectedSpecies: string;
  matchesSpecies: boolean;
  matchesFace: boolean;
  matchesProportions: boolean;
  hasUnexpectedMarkings: boolean;
  confidence: number;
  notes: string;
}

/**
 * Result of outline validation using vision model
 */
export interface OutlineValidationResult {
  valid: boolean;
  hasBlackFills: boolean;
  hasGrayscale: boolean;
  hasUnwantedBorder: boolean;
  fillLocations: string[];
  confidence: number;
  notes: string;
}

/**
 * Combined validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  characterValidation?: CharacterValidationResult;
  outlineValidation: OutlineValidationResult;
  retryReinforcement?: string;
}

/**
 * Build the system prompt for character validation using vision
 */
export function buildCharacterValidationPrompt(profile: CharacterIdentityProfile): string {
  return `You are a strict QA validator for coloring book images.

Analyze this image and determine if the main character matches the required identity.

REQUIRED CHARACTER:
- Species: ${profile.species}
- Face: ${profile.faceShape}, ${profile.eyeStyle}
- Ears: ${profile.earStyle}
${profile.hornStyle ? `- Horn: ${profile.hornStyle}` : "- No horn"}
- Proportions: ${profile.proportions}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "detectedSpecies": "what animal/creature is shown",
  "matchesSpecies": true/false,
  "matchesFace": true/false,
  "matchesProportions": true/false,
  "hasUnexpectedMarkings": true/false,
  "confidence": 0.0-1.0,
  "notes": "brief explanation"
}

Be STRICT:
- If the species is different (e.g., expected unicorn but got panda), matchesSpecies = false
- If face features differ significantly, matchesFace = false
- If there are filled black patches not in the profile, hasUnexpectedMarkings = true`;
}

/**
 * Build the system prompt for outline validation using vision
 */
export function buildOutlineValidationPrompt(): string {
  return `You are a strict QA validator for coloring book images.

Analyze this image and check if it follows coloring page rules:
1. OUTLINES ONLY - no solid black fills
2. NO grayscale or shading
3. NO borders or frames around the image

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "hasBlackFills": true/false,
  "hasGrayscale": true/false,
  "hasUnwantedBorder": true/false,
  "fillLocations": ["list of areas with fills, e.g., 'eye patches', 'ears'"],
  "confidence": 0.0-1.0,
  "notes": "brief explanation"
}

Be STRICT:
- Any solid black area larger than a thin line is a "fill"
- Panda patches, raccoon masks, dark ears should be outlines ONLY
- Gray shading anywhere = hasGrayscale true
- Rectangle around the image = hasUnwantedBorder true`;
}

/**
 * Parse character validation response from vision model
 */
export function parseCharacterValidationResponse(response: string, profile: CharacterIdentityProfile): CharacterValidationResult {
  try {
    // Clean response
    const cleaned = response
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
    
    const data = JSON.parse(cleaned);
    
    const valid = data.matchesSpecies === true && 
                  data.matchesFace !== false && 
                  data.hasUnexpectedMarkings !== true;
    
    return {
      valid,
      detectedSpecies: data.detectedSpecies || "unknown",
      matchesSpecies: data.matchesSpecies === true,
      matchesFace: data.matchesFace !== false,
      matchesProportions: data.matchesProportions !== false,
      hasUnexpectedMarkings: data.hasUnexpectedMarkings === true,
      confidence: data.confidence || 0.5,
      notes: data.notes || "",
    };
  } catch {
    // If parsing fails, assume invalid for safety
    return {
      valid: false,
      detectedSpecies: "parse_error",
      matchesSpecies: false,
      matchesFace: false,
      matchesProportions: false,
      hasUnexpectedMarkings: true,
      confidence: 0,
      notes: "Failed to parse validation response",
    };
  }
}

/**
 * Parse outline validation response from vision model
 */
export function parseOutlineValidationResponse(response: string): OutlineValidationResult {
  try {
    // Clean response
    const cleaned = response
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
    
    const data = JSON.parse(cleaned);
    
    const valid = data.hasBlackFills !== true && 
                  data.hasGrayscale !== true;
    
    return {
      valid,
      hasBlackFills: data.hasBlackFills === true,
      hasGrayscale: data.hasGrayscale === true,
      hasUnwantedBorder: data.hasUnwantedBorder === true,
      fillLocations: data.fillLocations || [],
      confidence: data.confidence || 0.5,
      notes: data.notes || "",
    };
  } catch {
    // If parsing fails, assume invalid for safety
    return {
      valid: false,
      hasBlackFills: true,
      hasGrayscale: true,
      hasUnwantedBorder: false,
      fillLocations: ["parse_error"],
      confidence: 0,
      notes: "Failed to parse validation response",
    };
  }
}

/**
 * Build retry reinforcement based on validation failures
 */
export function buildValidationRetryReinforcement(
  characterResult?: CharacterValidationResult,
  outlineResult?: OutlineValidationResult,
  profile?: CharacterIdentityProfile
): string {
  const parts: string[] = [];
  
  // Character issues
  if (characterResult && !characterResult.valid && profile) {
    if (!characterResult.matchesSpecies) {
      parts.push(`CRITICAL: You drew a ${characterResult.detectedSpecies} but you MUST draw a ${profile.species}. DO NOT substitute species.`);
    }
    if (!characterResult.matchesFace) {
      parts.push(`CRITICAL: The face design is wrong. Match EXACTLY: ${profile.faceShape}, ${profile.eyeStyle}.`);
    }
    if (characterResult.hasUnexpectedMarkings) {
      parts.push(`CRITICAL: Remove unexpected markings. ${profile.markings}`);
    }
  }
  
  // Outline issues
  if (outlineResult && !outlineResult.valid) {
    if (outlineResult.hasBlackFills) {
      const locations = outlineResult.fillLocations.join(", ");
      parts.push(`CRITICAL: Remove ALL black fills (found in: ${locations}). Convert to OUTLINES ONLY. Interior must be WHITE.`);
    }
    if (outlineResult.hasGrayscale) {
      parts.push(`CRITICAL: Remove ALL gray/shading. Use ONLY pure black lines on pure white. ZERO gray pixels.`);
    }
  }
  
  if (parts.length === 0) {
    return "";
  }
  
  return "\n\n" + parts.join("\n");
}

