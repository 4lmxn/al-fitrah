import { ImageResponse } from "next/og";

// iOS "Add to Home Screen" icon. Without it, Safari crops a shrunk screenshot
// of the page; this ships a branded emerald tile with a gold monogram instead.
// Auto-wired by Next as <link rel="apple-touch-icon"> — no manifest needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #004532 0%, #065f46 100%)",
          color: "#e3c97c",
          fontSize: 96,
          fontWeight: 700,
          fontFamily: "serif",
          letterSpacing: -4,
        }}
      >
        AF
      </div>
    ),
    { ...size },
  );
}
