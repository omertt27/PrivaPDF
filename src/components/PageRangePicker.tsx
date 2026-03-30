"use client";
// PageRangePicker.tsx — lets users select a subset of pages to convert

import { useState, useEffect } from "react";

interface PageRangePickerProps {
  totalPages: number;
  value: { from: number; to: number } | null;
  onChange: (r: { from: number; to: number } | null) => void;
}

export function PageRangePicker({ totalPages, value, onChange }: PageRangePickerProps) {
  const [enabled, setEnabled] = useState(false);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(totalPages || 1);

  // Sync to prop when totalPages becomes known
  useEffect(() => {
    setTo(totalPages || 1);
  }, [totalPages]);

  // Propagate to parent
  useEffect(() => {
    if (!enabled) {
      onChange(null);
    } else {
      const f = Math.max(1, Math.min(from, totalPages));
      const t = Math.max(f, Math.min(to, totalPages));
      onChange({ from: f, to: t });
    }
  }, [enabled, from, to, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps

  if (totalPages === 0) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
            Select page range
          </span>
        </label>
        {!enabled && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {totalPages} {totalPages === 1 ? "page" : "pages"} total
          </span>
        )}
      </div>

      {enabled && (
        <div style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "var(--cream)",
          borderRadius: 10,
          border: "1px solid var(--border)",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Pages</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            style={inputStyle}
          />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>to</span>
          <input
            type="number"
            min={from}
            max={totalPages}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            style={inputStyle}
          />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            of {totalPages} total
          </span>
          {value && (
            <span style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--accent)",
              fontWeight: 500,
              background: "var(--accent-light)",
              padding: "2px 10px",
              borderRadius: 20,
            }}>
              {value.to - value.from + 1} pages selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: 64,
  padding: "6px 10px",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "var(--sans)",
  background: "var(--paper)",
  color: "var(--ink)",
  textAlign: "center",
  outline: "none",
};
