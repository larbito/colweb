/**
 * Curated seed keywords for trend discovery.
 * These are STABLE base terms - we search for related rising queries.
 */
export const TREND_SEEDS = [
  // Core coloring book terms
  "coloring book",
  "kids coloring",
  "adult coloring book",
  "coloring pages",
  
  // Popular themes
  "kawaii coloring",
  "cute animals coloring",
  "unicorn coloring",
  "dinosaur coloring",
  "princess coloring",
  "fairy coloring",
  "mermaid coloring",
  "dragon coloring",
  
  // Animals
  "cat coloring book",
  "dog coloring book",
  "horse coloring book",
  "bunny coloring",
  "butterfly coloring",
  "ocean animals coloring",
  "farm animals coloring",
  "forest animals coloring",
  
  // Seasonal
  "christmas coloring",
  "halloween coloring",
  "easter coloring",
  "valentine coloring",
  "thanksgiving coloring",
  
  // Educational
  "alphabet coloring",
  "numbers coloring",
  "educational coloring",
  
  // Themes
  "nature coloring",
  "flowers coloring",
  "garden coloring",
  "space coloring",
  "vehicles coloring",
  "construction coloring",
  "sports coloring",
  
  // Style-specific
  "mandala coloring",
  "zentangle coloring",
  "geometric coloring",
  "whimsical coloring",
];

/**
 * Blocked terms - anything resembling copyrighted/trademarked content
 */
export const BLOCKED_TERMS = [
  // Disney
  "disney", "mickey", "minnie", "frozen", "elsa", "anna", "moana", "encanto",
  "lion king", "simba", "ariel", "little mermaid", "cinderella", "snow white",
  "tangled", "rapunzel", "aladdin", "jasmine", "mulan", "pocahontas",
  "toy story", "woody", "buzz", "pixar", "finding nemo", "dory",
  
  // Warner Bros
  "looney tunes", "bugs bunny", "batman", "superman", "wonder woman",
  "dc comics", "harry potter", "hogwarts", "scooby doo",
  
  // Nintendo
  "pokemon", "pikachu", "mario", "luigi", "zelda", "link", "kirby",
  "nintendo", "animal crossing",
  
  // Other franchises
  "marvel", "avengers", "spiderman", "spider-man", "hulk", "iron man",
  "paw patrol", "peppa pig", "cocomelon", "bluey", "sesame street",
  "barbie", "my little pony", "mlp", "transformers", "hello kitty",
  "sanrio", "spongebob", "dora", "nickelodeon", "cartoon network",
  "dreamworks", "shrek", "minions", "despicable me",
  "star wars", "baby yoda", "mandalorian", "jedi",
  "sonic", "sega", "minecraft", "roblox", "fortnite",
  "lego", "hot wheels", "mattel", "hasbro",
  "teletubbies", "thomas the tank", "thomas train",
  "winnie the pooh", "tigger", "eeyore",
  "care bears", "strawberry shortcake",
];

/**
 * Check if a keyword contains blocked terms
 */
export function isBlockedKeyword(keyword: string): boolean {
  const lower = keyword.toLowerCase();
  return BLOCKED_TERMS.some((term) => lower.includes(term));
}

/**
 * Clean and normalize a keyword
 */
export function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

