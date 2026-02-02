/**
 * promptScoring.ts - Validates prompt quality and theme adherence
 * 
 * Prevents generic/off-theme prompts from being used
 */

export interface PromptScore {
  overallScore: number; // 0-10
  themeMatchScore: number; // 0-10
  noveltyScore: number; // 0-10
  compositionScore: number; // 0-10
  passes: boolean; // true if overallScore >= 7
  issues: string[];
}

/**
 * Score a single prompt for quality
 */
export function scorePrompt(params: {
  prompt: string;
  promptTitle: string;
  coreTheme: string;
  mustHave: string[];
  mustAvoid: string[];
  usedLocations: Set<string>;
  usedProps: Set<string>;
}): PromptScore {
  const { prompt, promptTitle, coreTheme, mustHave, mustAvoid, usedLocations, usedProps } = params;
  
  const promptLower = `${prompt} ${promptTitle}`.toLowerCase();
  const issues: string[] = [];
  
  // Theme match score (0-10)
  let themeMatchScore = 10;
  const themeLower = coreTheme.toLowerCase();
  const themeWords = themeLower.split(/\s+/).filter(w => w.length > 3);
  
  // Check if prompt contains theme words
  let themeWordMatches = 0;
  for (const word of themeWords) {
    if (promptLower.includes(word)) {
      themeWordMatches++;
    }
  }
  
  if (themeWordMatches === 0) {
    themeMatchScore = 0;
    issues.push(`No theme words found (theme: ${coreTheme})`);
  } else if (themeWordMatches < themeWords.length / 2) {
    themeMatchScore = 5;
    issues.push("Weak theme match");
  }
  
  // Check for mustHave elements
  let mustHaveMatches = 0;
  for (const element of mustHave.slice(0, 5)) {
    if (promptLower.includes(element.toLowerCase())) {
      mustHaveMatches++;
    }
  }
  
  if (mustHave.length > 0 && mustHaveMatches === 0) {
    themeMatchScore = Math.min(themeMatchScore, 3);
    issues.push("Missing required elements");
  }
  
  // Check for forbidden elements
  for (const forbidden of mustAvoid.slice(0, 5)) {
    if (promptLower.includes(forbidden.toLowerCase())) {
      themeMatchScore = 0;
      issues.push(`Contains forbidden: ${forbidden}`);
      break;
    }
  }
  
  // Novelty score (0-10) - penalize repetition
  let noveltyScore = 10;
  
  // Extract location words from prompt
  const locationKeywords = ["bedroom", "kitchen", "bathroom", "classroom", "park", "garden", "beach", "forest"];
  for (const loc of locationKeywords) {
    if (promptLower.includes(loc) && usedLocations.has(loc)) {
      noveltyScore -= 3;
      issues.push(`Location "${loc}" repeated`);
    }
  }
  
  // Check for generic repeated props
  const genericProps = ["rock", "ball", "toy car", "leaf", "pebble", "stick"];
  for (const prop of genericProps) {
    if (promptLower.includes(prop) && usedProps.has(prop)) {
      noveltyScore -= 2;
      issues.push(`Generic prop "${prop}" repeated`);
    }
  }
  
  noveltyScore = Math.max(0, noveltyScore);
  
  // Composition score (0-10) - check for composition keywords
  let compositionScore = 5; // Neutral default
  
  const compositionKeywords = [
    "centered", "fills", "frame", "close-up", "wide", "zoomed",
    "foreground", "background", "bottom edge", "ground"
  ];
  
  let compositionMatches = 0;
  for (const keyword of compositionKeywords) {
    if (promptLower.includes(keyword)) {
      compositionMatches++;
    }
  }
  
  if (compositionMatches >= 3) compositionScore = 10;
  else if (compositionMatches >= 2) compositionScore = 7;
  else if (compositionMatches >= 1) compositionScore = 5;
  else compositionScore = 3;
  
  // Overall score (weighted average)
  const overallScore = (
    themeMatchScore * 0.5 + // 50% weight on theme match
    noveltyScore * 0.3 +     // 30% weight on novelty
    compositionScore * 0.2   // 20% weight on composition
  );
  
  const passes = overallScore >= 7;
  
  return {
    overallScore,
    themeMatchScore,
    noveltyScore,
    compositionScore,
    passes,
    issues,
  };
}

/**
 * Score a batch of prompts and identify issues
 */
export function scoreBatchPrompts(params: {
  prompts: Array<{ title: string; prompt: string }>;
  coreTheme: string;
  mustHave: string[];
  mustAvoid: string[];
}): {
  scores: PromptScore[];
  averageScore: number;
  passedCount: number;
  failedIndices: number[];
  overallPasses: boolean;
} {
  const { prompts, coreTheme, mustHave, mustAvoid } = params;
  
  const usedLocations = new Set<string>();
  const usedProps = new Set<string>();
  
  const scores = prompts.map((p, idx) => {
    const score = scorePrompt({
      prompt: p.prompt,
      promptTitle: p.title,
      coreTheme,
      mustHave,
      mustAvoid,
      usedLocations,
      usedProps,
    });
    
    // Track used elements for next iterations
    const promptLower = p.prompt.toLowerCase();
    const locationKeywords = ["bedroom", "kitchen", "bathroom", "classroom", "park", "garden", "beach", "forest"];
    for (const loc of locationKeywords) {
      if (promptLower.includes(loc)) usedLocations.add(loc);
    }
    
    const propKeywords = ["rock", "ball", "toy car", "leaf", "pebble", "stick", "flower", "tree"];
    for (const prop of propKeywords) {
      if (promptLower.includes(prop)) usedProps.add(prop);
    }
    
    return score;
  });
  
  const averageScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length;
  const passedCount = scores.filter(s => s.passes).length;
  const failedIndices = scores.map((s, idx) => s.passes ? -1 : idx).filter(i => i >= 0);
  const overallPasses = passedCount >= prompts.length * 0.8; // At least 80% must pass
  
  return {
    scores,
    averageScore,
    passedCount,
    failedIndices,
    overallPasses,
  };
}

