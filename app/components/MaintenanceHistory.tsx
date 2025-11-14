"use client";
import { useState } from "react";

export type MaintenanceItem = {
  id: string;
  date?: string;
  title?: string;
  description?: string;
  type?: string;
};

export default function MaintenanceHistorySection({
  items,
  defaultOpen = false,
  maxPreview = 3,
}: {
  items: MaintenanceItem[];
  defaultOpen?: boolean;
  maxPreview?: number;
}) {
  const [expanded, setExpanded] = useState<boolean>(defaultOpen); // renamed

  const hasMore = items.length > maxPreview;
  const shown = expanded ? items : items.slice(0, maxPreview);

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Maintenance History</h3>

        {/* Toggle Button — fixed */}
        <button
          onClick={() => setExpanded((s) => !s)}
          aria-expanded={Boolean(expanded)}    // ✔ FORCED BOOLEAN
          aria-controls="maintenance-panel"
          className="text-sm px-2 py-1 rounded border hover:bg-gray-50"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div id="maintenance-panel" className="mt-3">
        {shown.length === 0 && (
          <p className="text-gray-600 text-sm">No maintenance history.</p>
        )}

        <ul className="space-y-3">
          {shown.map((item) => (
            <li
              key={item.id}
              className="border rounded p-3 bg-gray-50 shadow-sm"
            >
              <div className="font-medium text-gray-800">
                {item.title || "Maintenance"}
              </div>
              <div className="text-sm text-gray-600">
                {item.date ? `Date: ${item.date}` : ""}
              </div>
              {item.description && (
                <div className="text-sm mt-1">{item.description}</div>
              )}
            </li>
          ))}
        </ul>

        {/* Show more/less */}
        {hasMore && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded((s) => !s)}
              className="text-sm underline text-blue-600"
            >
              {expanded
                ? "Show less"
                : `Show ${items.length - maxPreview} more`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
