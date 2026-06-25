import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = "Al Fitrah Pre School — Where young hearts and minds grow with faith";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card. Generated at build/request time so every shared
// link (WhatsApp, Facebook, X) renders a rich preview instead of a bare URL.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #004532 0%, #065f46 60%, #0a7a5a 100%)",
          color: "#faf7f0",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#e3c97c",
            marginBottom: 28,
          }}
        >
          Admissions open · 2026–27
        </div>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
          {site.name}
        </div>
        <div style={{ fontSize: 40, color: "#faf7f0", opacity: 0.85, marginTop: 28, maxWidth: 880 }}>
          {site.tagline}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 56,
            fontSize: 28,
            color: "#faf7f0",
            opacity: 0.8,
          }}
        >
          <span>Oxford Early Learning</span>
          <span style={{ color: "#c9a227" }}>·</span>
          <span>Noor-ul-Bayan</span>
          <span style={{ color: "#c9a227" }}>·</span>
          <span>Sarjapura, Bengaluru</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
