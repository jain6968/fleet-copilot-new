"use client";
import * as React from "react";

export type MaintenanceItem = {
  id: string;
  date?: string | null;        // ISO string or already formatted
  title?: string | null;       // e.g., "Battery cooling fan replacement"
  description?: string | null; // free text
  type?: string | null;        // Preventive | Corrective | Inspection | Diagnostic
  mileage?: number | null;
  workOrderId?: string | null;
  performedBy?: string | null;
  cost?: number | null;
  parts?: string[] | null;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  // Handles "2024-11-12" or "2024-11-12T00:00:00Z"
  const dt = new Date(d);
  return Number.isNaN(dt.valueOf())
    ? d
    : dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtMoneyGBP(v?: number | null) {
  if (v == null) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP" }).format(v);
  } catch {
    return `£${v}`;
  }
}

export default function MaintenanceHistorySection({
  items = [],
  defaultOpen = true,
  maxPreview = 3
}: {
  items?: MaintenanceItem[];
  defaultOpen?: boolean;
  maxPreview?: number;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const hasMore = items.length > maxPreview;
  const shown = open ? items : items.slice(0, maxPreview);

  return (
    <section className="border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-base font-semibold">Maintenance History ({items.length})</h3>
        <button
          onClick={() => setOpen((s) => !s)}
          className="text-sm px-2 py-1 rounded border hover:bg-gray-50"
          aria-expanded={open}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 mt-3">No maintenance history.</div>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {shown.map((m) => {
              const money = fmtMoneyGBP(m.cost);
              return (
                <li
                  key={m.id || `${m.title}-${m.date}`}
                  className="border-b last:border-b-0 pb-3"
                >
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-700">
                    <span className="font-medium">{fmtDate(m.date)}</span>
                    <span className="text-gray-400">•</span>
                    <span className="font-medium">{m.type || "Maintenance"}</span>
                    {m.mileage != null && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>{m.mileage.toLocaleString()} mi</span>
                      </>
                    )}
                    {m.workOrderId && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>WO #{m.workOrderId}</span>
                      </>
                    )}
                    {m.performedBy && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>{m.performedBy}</span>
                      </>
                    )}
                    {money && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>{money}</span>
                      </>
                    )}
                  </div>

                  {m.title && (
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {m.title}
                    </div>
                  )}

                  {m.description && (
                    <div className="mt-1 text-sm text-gray-600">
                      {m.description}
                    </div>
                  )}

                  {Array.isArray(m.parts) && m.parts.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Parts: {m.parts.join(", ")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="mt-3">
              <button
                onClick={() => setOpen((s) => !s)}
                className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
              >
                {open ? "Show less" : `Show ${items.length - maxPreview} more`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
