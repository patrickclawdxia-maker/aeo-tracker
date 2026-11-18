export interface ParsedMention {
  brandId: number;
  brandName: string;
  matchedAs: string; // what was actually found in the text
  position: number;
  sentiment: "positive" | "neutral" | "negative";
  contextSnippet: string;
  fuzzyMatch: boolean; // was this a fuzzy (not exact) match?
}

const POSITIVE_KEYWORDS = [
  "recommend", "best", "top", "great", "excellent", "leading", "popular",
  "#1", "number one", "outstanding", "superior", "ideal",
];
const NEGATIVE_KEYWORDS = [
  "avoid", "bad", "expensive", "limited", "poor", "worst", "overpriced",
  "disappointing", "problematic", "difficult", "complex", "clunky",
];

// ── Levenshtein distance (iterative, O(m*n)) ────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

// Max edit distance allowed for a brand name of given length
function fuzzyTolerance(nameLen: number): number {
  if (nameLen <= 4) return 0;   // short names: exact only (e.g. "Uber")
  if (nameLen <= 7) return 1;   // medium: 1 typo (e.g. "ChatGPT")
  if (nameLen <= 12) return 2;  // longer: 2 typos (e.g. "Salesforce")
  return 3;                     // very long: 3 typos
}

// Slide a window of `windowLen` chars across `text` looking for a fuzzy match
function findFuzzy(
  lowerText: string,
  lowerTarget: string
): { index: number; matched: string } | null {
  const tlen = lowerTarget.length;
  const tolerance = fuzzyTolerance(tlen);
  if (tolerance === 0) return null; // handled by exact match

  // Scan windows ±1 of target length to handle insertions/deletions
  for (let wlen = tlen - 1; wlen <= tlen + 1; wlen++) {
    for (let i = 0; i <= lowerText.length - wlen; i++) {
      const window = lowerText.slice(i, i + wlen);
      // Skip if first char doesn't match — cheap pre-filter
      if (window[0] !== lowerTarget[0]) continue;
      const dist = levenshtein(window, lowerTarget);
      if (dist > 0 && dist <= tolerance) {
        return { index: i, matched: window };
      }
    }
  }
  return null;
}

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
  brands: { id: number; name: string; aliases?: string[] }[]
): ParsedMention[] {
  const lowerText = responseText.toLowerCase();

  const brandFirstOccurrences: Array<{
    brandId: number;
    brandName: string;
    matchedAs: string;
    index: number;
    fuzzyMatch: boolean;
  }> = [];

  for (const brand of brands) {
    // Build list of terms to search: canonical name + all aliases
    const terms: string[] = [brand.name, ...(brand.aliases ?? [])];
    let bestMatch: { index: number; matchedAs: string; fuzzyMatch: boolean } | null = null;

    for (const term of terms) {
      if (!term.trim()) continue;
      const lowerTerm = term.toLowerCase();

      // 1. Exact match
      const exactIdx = lowerText.indexOf(lowerTerm);
      if (exactIdx !== -1) {
        if (!bestMatch || exactIdx < bestMatch.index) {
          bestMatch = { index: exactIdx, matchedAs: term, fuzzyMatch: false };
        }
        continue; // exact wins, no need to try fuzzy for this term
      }

      // 2. Fuzzy match
      const fuzzy = findFuzzy(lowerText, lowerTerm);
      if (fuzzy && (!bestMatch || fuzzy.index < bestMatch.index)) {
        bestMatch = { index: fuzzy.index, matchedAs: `${term} (~${fuzzy.matched})`, fuzzyMatch: true };
      }
    }

    if (bestMatch) {
      brandFirstOccurrences.push({
        brandId: brand.id,
        brandName: brand.name,
        matchedAs: bestMatch.matchedAs,
        index: bestMatch.index,
        fuzzyMatch: bestMatch.fuzzyMatch,
      });
    }
  }

  brandFirstOccurrences.sort((a, b) => a.index - b.index);

  return brandFirstOccurrences.map((b, i) => ({
    brandId: b.brandId,
    brandName: b.brandName,
    matchedAs: b.matchedAs,
    position: i + 1,
    sentiment: getSentiment(responseText, b.index),
    contextSnippet: getContextSnippet(responseText, b.index),
    fuzzyMatch: b.fuzzyMatch,
  }));
}
