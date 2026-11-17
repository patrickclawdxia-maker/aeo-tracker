import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AEO Tracker — The SEMrush for the AI Era";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "bold",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            A
          </div>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "28px", fontWeight: "600" }}>
            AEO Tracker
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: "800",
            color: "white",
            lineHeight: 1.05,
            maxWidth: "900px",
            marginBottom: "32px",
            letterSpacing: "-1px",
          }}
        >
          Know where your brand ranks in AI search
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.75)",
            maxWidth: "700px",
            lineHeight: 1.5,
            marginBottom: "48px",
          }}
        >
          Track mentions across ChatGPT, Gemini &amp; Claude. The SEMrush for the AI era.
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["ChatGPT", "Gemini", "Claude"].map((name) => (
            <div
              key={name}
              style={{
                padding: "10px 24px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
                fontSize: "20px",
                fontWeight: "600",
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
