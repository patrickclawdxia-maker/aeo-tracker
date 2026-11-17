export function SentimentBadge({
  sentiment,
}: {
  sentiment: "positive" | "neutral" | "negative" | string;
}) {
  if (sentiment === "positive") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        ✓ Positive
      </span>
    );
  }
  if (sentiment === "negative") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        ✗ Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
