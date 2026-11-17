export function SentimentBadge({
  sentiment,
}: {
  sentiment: "positive" | "neutral" | "negative" | string;
}) {
  if (sentiment === "positive") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-800">
        ✓ Positive
      </span>
    );
  }
  if (sentiment === "negative") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-800">
        ✗ Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
      – Neutral
    </span>
  );
}

export function getDominantSentiment(breakdown: {
  positive: number;
  neutral: number;
  negative: number;
}): "positive" | "neutral" | "negative" {
  const { positive, neutral, negative } = breakdown;
  if (positive >= neutral && positive >= negative) return "positive";
  if (negative > positive && negative > neutral) return "negative";
  return "neutral";
}
