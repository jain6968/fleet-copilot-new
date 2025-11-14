"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    // Run only in the browser
    if (typeof window === "undefined") return;

    const hasCookie = document.cookie.includes("fleet_auth=yes");
    const hasLocal = localStorage.getItem("fleet_auth") === "yes";

    if (hasCookie || hasLocal) {
      setIsAuthed(true);
      setCheckedAuth(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  // While checking auth, render nothing (or a loader if you want)
  if (!checkedAuth) return null;

  // If somehow not authed after check, don't show main UI
  if (!isAuthed) return null;

  // ✅ PASTE YOUR EXISTING DASHBOARD UI HERE
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <button
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-controls="evidence-panel"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <h3 style={{ margin: 0 }}>
          Evidence ({evidences?.length ?? 0})
        </h3>
        <span
          style={{
            transition: "transform 150ms",
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
      </button>

      {/* Collapsible body */}
      <div
        id="evidence-panel"
        style={{ marginTop: 10, display: open ? "block" : "block" }}
      >
        {/* When collapsed and there are more, show only a preview list */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {shown?.map((e) => (
            <EvidenceRow key={e.id || Math.random()} ev={e} />
          ))}
        </ul>

        {/* “Show more / less” control (optional, clearer than header toggle) */}
        {hasMore && (
          <div style={{ display: "flex", gap: 8 }}>
            {!open ? (
              <button
                onClick={() => setOpen(true)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fafafa",
                }}
              >
                Show {evidences.length - maxPreview} more
              </button>
            ) : (
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fafafa",
                }}
              >
                Show less
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
