"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Polls /api/latest-match and flashes a dismissible banner when a match that
// wasn't there when the page loaded appears (i.e. a capture just landed).
export default function NewMatchBanner() {
  const baseline = useRef<string | null | undefined>(undefined);
  const [fresh, setFresh] = useState<null | {
    id: string;
    map: string;
    mode: string | null;
    source: string;
  }>(null);

  useEffect(() => {
    let stop = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/latest-match", { cache: "no-store" });
        const data = await res.json();
        if (stop) return;
        // First poll establishes the baseline (what already existed on load).
        if (baseline.current === undefined) {
          baseline.current = data.id ?? null;
          return;
        }
        if (data.id && data.id !== baseline.current) {
          baseline.current = data.id;
          setFresh({
            id: data.id,
            map: data.map,
            mode: data.mode,
            source: data.source,
          });
        }
      } catch {
        /* ignore transient errors */
      }
    };

    poll();
    const t = setInterval(poll, 12000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  if (!fresh) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        background: "#1f7a3f",
        color: "white",
        padding: "12px 16px",
        borderRadius: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 360,
      }}
    >
      <span style={{ fontSize: 20 }}>🎯</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>New match captured!</div>
        <div style={{ fontSize: "0.85em", opacity: 0.9 }}>
          {fresh.map}
          {fresh.mode ? ` · ${fresh.mode}` : ""}
        </div>
      </div>
      <Link
        href={`/match/${fresh.id}`}
        style={{ color: "white", fontWeight: 700, textDecoration: "underline" }}
        onClick={() => setFresh(null)}
      >
        View
      </Link>
      <button
        onClick={() => setFresh(null)}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "white",
          fontSize: 18,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
