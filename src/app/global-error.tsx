"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("root boundary caught", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf7f0",
          color: "#1c1917",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0, color: "#004532" }}>
            Al Fitrah Pre School
          </h1>
          <p style={{ marginTop: "1rem", lineHeight: 1.6, color: "rgba(28,25,23,0.7)" }}>
            The site hit an unexpected error. Please try again, or call us on{" "}
            <a href="tel:+919986500718" style={{ color: "#065f46", fontWeight: 600 }}>
              +91 99865 00718
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1.75rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              backgroundColor: "#065f46",
              color: "#faf7f0",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
