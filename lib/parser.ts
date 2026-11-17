export interface ParsedMention {
  brandId: number;
  brandName: string;
  position: number;
  sentiment: "positive" | "neutral" | "negative";
  contextSnippet: string;
}

const POSITIVE_KEYWORDS = [
  "recommend",
  "best",
  "top",
  "great",
  "excellent",
  "leading",
  "popular",
  "#1",
  "number one",
  "outstanding",
  "superior",
  "ideal",
];

const NEGATIVE_KEYWORDS = [
  "avoid",
  "bad",
  "expensive",
  "limited",
  "poor",
  "worst",
  "overpriced",
  "disappointing",
  "problematic",
  "difficult",
  "complex",
  "clunky",
];

function getSentiment(
  text: string,
  mentionIndex: number
): "positive" | "neutral" | "negative" {
  const start = Math.max(0, mentionIndex - 100);
  const end = Math.min(text.length, mentionIndex + 100);
  const surrounding = text.slice(start, end).toLowerCase();

  for (const kw of POSITIVE_KEYWORDS) {
    if (surrounding.includes(kw)) return "positive";
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (surrounding.includes(kw)) return "negative";
  }
  return "neutral";
}

function getContextSnippet(text: string, mentionIndex: number): string {
  // Find the sentence containing the mention
  const sentenceStart = Math.max(
    text.lastIndexOf(".", mentionIndex - 1) + 1,
    text.lastIndexOf("\n", mentionIndex - 1) + 1,
    0
  );
  const nextPeriod = text.indexOf(".", mentionIndex);
  const nextNewline = text.indexOf("\n", mentionIndex);
  let sentenceEnd = text.length;
  if (nextPeriod !== -1 && nextNewline !== -1) {
    sentenceEnd = Math.min(nextPeriod, nextNewline) + 1;
  } else if (nextPeriod !== -1) {
    sentenceEnd = nextPeriod + 1;
  } else if (nextNewline !== -1) {
    sentenceEnd = nextNewline + 1;
  }

  const snippet = text.slice(sentenceStart, sentenceEnd).trim();
  return snippet.length > 200 ? snippet.slice(0, 197) + "..." : snippet;
}

export function parseResponse(
  responseText: string,
  brands: { id: number; name: string }[]
): ParsedMention[] {
  const lowerText = responseText.toLowerCase();

  // Find all brand mention indices
  const brandFirstOccurrences: Array<{
    brandId: number;
    brandName: string;
    index: number;
  }> = [];

  for (const brand of brands) {
    const lowerBrand = brand.name.toLowerCase();
    const idx = lowerText.indexOf(lowerBrand);
    if (idx !== -1) {
      brandFirstOccurrences.push({
        brandId: brand.id,
        brandName: brand.name,
        index: idx,
      });
    }
  }

  // Sort by order of first appearance
  brandFirstOccurrences.sort((a, b) => a.index - b.index);

  const mentions: ParsedMention[] = [];
  for (let i = 0; i < brandFirstOccurrences.length; i++) {
    const { brandId, brandName, index } = brandFirstOccurrences[i];
    mentions.push({
      brandId,
      brandName,
      position: i + 1, // 1-based
      sentiment: getSentiment(responseText, index),
      contextSnippet: getContextSnippet(responseText, index),
    });
  }

  return mentions;
}
