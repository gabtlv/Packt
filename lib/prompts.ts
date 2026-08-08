/**
 * The self-prompt catalogue. A member answers any two of these plus a fun fact.
 *
 * Keys are stored on the card (not the question text) so wording can be reworded
 * later without rewriting existing cards.
 */
export const PROMPTS = [
  { key: "building", label: "What are you building this summer?", placeholder: "A transit app that only tells you when to run for the bus." },
  { key: "superpower", label: "If you had one debugging superpower, what would it be?", placeholder: "Seeing which console.log actually ran." },
  { key: "hometown", label: "Where's home for you?", placeholder: "Montréal, where winter is a personality trait." },
  { key: "obsession", label: "What are you currently obsessed with?", placeholder: "Fermentation. There are eleven jars in my room." },
  { key: "first_code", label: "What was the first thing you ever coded?", placeholder: "A Neopets layout with far too many marquee tags." },
  { key: "snack", label: "Your go-to hackathon fuel?", placeholder: "Rice, egg, chilli oil. Unbeatable at 3am." },
  { key: "hot_take", label: "Give us a tech hot take.", placeholder: "Most dashboards would be better as a single number." },
  { key: "weekend", label: "Perfect Saturday, no laptop allowed?", placeholder: "Sea swim, then a very long breakfast." },
] as const;

export type PromptKey = (typeof PROMPTS)[number]["key"];

export const PROMPT_KEYS = PROMPTS.map((p) => p.key) as readonly PromptKey[];

const PROMPT_BY_KEY = new Map(PROMPTS.map((p) => [p.key as string, p]));

/**
 * Question text for a stored key. Falls back to the raw key so a card whose
 * prompt was retired still renders something sensible rather than blank.
 */
export function promptLabel(key: string): string {
  return PROMPT_BY_KEY.get(key)?.label ?? key;
}
