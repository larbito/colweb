// MVP-grade guardrail: warn/block obvious copyrighted characters.
// This is intentionally simple. We'll improve later with better moderation tooling.

const COPYRIGHTED_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(mickey|minnie|donald duck|goofy)\b/i, label: 'Disney characters' },
  { re: /\b(pokemon|pikachu|charizard)\b/i, label: 'Pokémon' },
  { re: /\b(marvel|spider-?man|iron man|avengers)\b/i, label: 'Marvel characters' },
  { re: /\b(hello kitty|sanrio)\b/i, label: 'Sanrio characters' },
];

export function detectCopyrightedContent(input: string): { blocked: boolean; reason?: string } {
  const match = COPYRIGHTED_PATTERNS.find((p) => p.re.test(input));
  if (!match) return { blocked: false };
  return {
    blocked: true,
    reason:
      `Your input seems to reference ${match.label}. ` +
      `For the MVP we block obvious copyrighted characters. Please use an original character/theme.`,
  };
}


