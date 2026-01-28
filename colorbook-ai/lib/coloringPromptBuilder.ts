/**
 * Professional Coloring Page Prompt Builder
 * 
 * Generates high-quality prompts for kids coloring book pages
 * with strict style consistency and professional output quality.
 */

import type { ImageAnalysis, GeneratedPrompt } from "./coloringPageTypes";
import { SCENE_PRESETS, ACTIVITY_PRESETS } from "./coloringPageTypes";

/**
 * Build a complete coloring page prompt from analysis
 */
export function buildColoringPrompt(
  analysis: ImageAnalysis,
  pageIndex: number,
  sceneOverride?: string,
  activityOverride?: string
): GeneratedPrompt {
  // Get scene info - use override or pick from presets
  const scene = sceneOverride 
    ? SCENE_PRESETS.find(s => s.id === sceneOverride) || { id: sceneOverride, label: sceneOverride, props: analysis.scene.props, background: analysis.scene.background }
    : (pageIndex === 1 ? { id: "original", label: analysis.scene.location, props: analysis.scene.props, background: analysis.scene.background } : getRandomScene(pageIndex));
  
  // Get activity - use override or pick random
  const activity = activityOverride || (pageIndex === 1 ? analysis.character.pose : getRandomActivity(pageIndex));
  
  // Build the title
  const title = buildTitle(analysis, scene.label, activity);
  
  // Build main prompt (subject + action + setting)
  const mainPrompt = buildMainPrompt(analysis, scene, activity);
  
  // Build style prompt (line art specifications)
  const stylePrompt = buildStylePrompt(analysis);
  
  // Build composition prompt (layout and spacing)
  const compositionPrompt = buildCompositionPrompt(analysis, scene);
  
  // Build negative prompt (CRITICAL for quality)
  const negativePrompt = buildNegativePrompt();
  
  // Combine into full prompt optimized for DALL-E
  const fullPrompt = buildFullPrompt(mainPrompt, stylePrompt, compositionPrompt, analysis.style_lock);
  
  return {
    pageIndex,
    title,
    mainPrompt,
    stylePrompt,
    compositionPrompt,
    negativePrompt,
    fullPrompt,
    characterSignature: analysis.character_signature,
    styleLock: analysis.style_lock,
  };
}

/**
 * Build multiple prompts with consistent character
 */
export function buildMultiplePrompts(
  analysis: ImageAnalysis,
  count: number,
  scenes?: string[]
): GeneratedPrompt[] {
  const prompts: GeneratedPrompt[] = [];
  
  for (let i = 1; i <= count; i++) {
    const sceneOverride = scenes?.[i - 1];
    prompts.push(buildColoringPrompt(analysis, i, sceneOverride));
  }
  
  return prompts;
}

function buildTitle(analysis: ImageAnalysis, scene: string, activity: string): string {
  const character = analysis.character.species;
  const feature = analysis.character.special_features[0];
  
  if (feature) {
    return `${character} with ${feature} - ${activity} in ${scene}`;
  }
  return `${character} - ${activity} in ${scene}`;
}

function buildMainPrompt(
  analysis: ImageAnalysis,
  scene: { id: string; label: string; props: string[]; background: string[] },
  activity: string
): string {
  const { character } = analysis;
  
  // Build character description
  let charDesc = `A cute ${character.species}`;
  
  if (character.special_features.length > 0) {
    charDesc += ` with ${character.special_features.join(" and ")}`;
  }
  
  if (character.clothing_accessories.length > 0) {
    charDesc += `, wearing ${character.clothing_accessories.join(" and ")}`;
  }
  
  // Build action
  const actionDesc = `, ${activity}`;
  
  // Build setting
  const settingDesc = ` in a ${scene.label.toLowerCase()}`;
  
  // Build props
  const propsDesc = scene.props.length > 0 
    ? `. Surrounded by ${scene.props.slice(0, 4).join(", ")}`
    : "";
  
  return charDesc + actionDesc + settingDesc + propsDesc + ".";
}

function buildStylePrompt(analysis: ImageAnalysis): string {
  const { line_art, character } = analysis;
  
  const parts = [
    "Professional children's coloring book page",
    "clean black and white line art",
    "smooth vector-like outlines",
    `${line_art.outer_line_weight} outer contour lines`,
    `${line_art.inner_line_weight} inner detail lines`,
    `${character.eye_style}`,
    `${character.body_proportions} proportions`,
    "no shading whatsoever",
    "pure white background",
    "crisp clean lines ready for coloring",
  ];
  
  return parts.join(", ") + ".";
}

function buildCompositionPrompt(
  analysis: ImageAnalysis,
  scene: { id: string; label: string; props: string[]; background: string[] }
): string {
  const bgElements = scene.background.slice(0, 3).join(", ");
  
  const parts = [
    "Character centered in frame",
    "large simple shapes",
    "big empty areas perfect for coloring with crayons",
    "balanced composition",
    bgElements ? `simple background with ${bgElements}` : "minimal clean background",
    "child-friendly proportions",
    "print-ready quality",
    "high contrast between lines and white space",
  ];
  
  return parts.join(", ") + ".";
}

function buildNegativePrompt(): string {
  return [
    "color",
    "colored",
    "grayscale",
    "gray",
    "shading",
    "shadows",
    "gradients",
    "cross-hatching",
    "hatching",
    "stippling",
    "sketchy lines",
    "rough lines",
    "messy",
    "realistic",
    "photograph",
    "3D render",
    "watercolor",
    "painting",
    "text",
    "words",
    "letters",
    "watermark",
    "signature",
    "logo",
    "border",
    "frame",
    "busy background",
    "cluttered",
    "complex patterns",
    "tiny details",
    "fine details",
    "texture",
    "noise",
  ].join(", ");
}

function buildFullPrompt(
  mainPrompt: string,
  stylePrompt: string,
  compositionPrompt: string,
  styleLock: string
): string {
  // Structure optimized for DALL-E 3
  const fullPrompt = `${mainPrompt}

${stylePrompt}

${compositionPrompt}

CRITICAL STYLE REQUIREMENTS: ${styleLock}

OUTPUT MUST BE: Pure black lines on pure white background. Absolutely NO color, NO gray, NO shading of any kind. Every shape must be closed with clean outlines suitable for children to color with crayons or markers. This is a professional coloring book page.`;

  // Ensure under DALL-E limit (4000 chars)
  if (fullPrompt.length > 3800) {
    return truncatePrompt(fullPrompt, 3800);
  }
  
  return fullPrompt;
}

function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) return prompt;
  
  // Keep the critical style requirements at the end
  const criticalPart = "\n\nCRITICAL STYLE REQUIREMENTS: Pure black lines on pure white background. NO color, NO shading. Professional coloring book page.";
  const availableLength = maxLength - criticalPart.length;
  
  return prompt.substring(0, availableLength) + criticalPart;
}

function getRandomScene(seed: number): { id: string; label: string; props: string[]; background: string[] } {
  const index = (seed * 7) % SCENE_PRESETS.length;
  return SCENE_PRESETS[index];
}

function getRandomActivity(seed: number): string {
  const index = (seed * 11) % ACTIVITY_PRESETS.length;
  return ACTIVITY_PRESETS[index];
}

/**
 * Build a prompt specifically for DALL-E 3 with maximum B&W enforcement
 */
export function buildDalle3Prompt(generatedPrompt: GeneratedPrompt): string {
  return `Kids coloring book page illustration:

${generatedPrompt.mainPrompt}

STYLE: ${generatedPrompt.stylePrompt}

COMPOSITION: ${generatedPrompt.compositionPrompt}

ABSOLUTE REQUIREMENTS:
- Pure BLACK lines (#000000) on pure WHITE background (#FFFFFF) ONLY
- Thick clean outlines (4-6pt weight) for outer contours
- Medium lines (2-3pt weight) for inner details  
- All shapes CLOSED and ready for coloring
- NO color whatsoever - not even subtle tints
- NO gray tones - not even light gray
- NO shading, shadows, or gradients
- NO cross-hatching or stippling
- NO sketchy or rough lines
- NO text, watermarks, or signatures
- Child-friendly, cute, appealing design
- Print-ready at 300 DPI

This MUST look like a professional children's coloring book page that can be printed and colored with crayons.`;
}

