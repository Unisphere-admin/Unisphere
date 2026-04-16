"use client";

// Global error boundary - catches errors inside the root layout itself.
// Must include its own <html> and <body> tags.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      // e.g. Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#fff" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={32} color="#ef4444" />
          </div>

          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 8px" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", maxWidth: 360, margin: "0 auto" }}>
              A critical error occurred loading the page. Please refresh or try again shortly.
            </p>
          </div>

          {process.env.NODE_ENV === "development" && (
            <pre
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: "0.75rem",
                color: "#dc2626",
                maxWidth: 500,
                overflowX: "auto",
                textAlign: "left",
              }}
            >
              {error.message}
            </pre>
          )}

          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: "#128ca0",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
