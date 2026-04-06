// src/components/FilterToolbar.tsx
import { memo } from "react";
import type { ChangeStatus, ResolvedGraph } from "../types/spec-metadata";
import { STATUS_COLORS } from "../styles/theme";

interface FilterToolbarProps {
  stats: ResolvedGraph["stats"];
  activeFilters: Set<ChangeStatus>;
  onToggle: (status: ChangeStatus) => void;
}

const STATUS_ORDER: ChangeStatus[] = ["new", "modified", "affected", "deprecated", "existing"];

function FilterToolbarInner({ stats, activeFilters, onToggle }: FilterToolbarProps) {
  const items = STATUS_ORDER.filter((status) => stats[status] > 0);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 16px",
        background: "rgba(15,23,42,0.7)",
        borderBottom: "1px solid #1e293b",
        fontFamily: "'Segoe UI', sans-serif",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 10, color: "#64748b", marginRight: 4 }}>Filter:</span>
      {items.map((status) => {
        const color = STATUS_COLORS[status];
        const isActive = activeFilters.has(status);
        return (
          <button
            key={status}
            onClick={() => onToggle(status)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 4,
              border: `1px solid ${isActive ? color.border : "#334155"}`,
              background: isActive ? `${color.bg}` : "transparent",
              color: isActive ? color.text : "#64748b",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Segoe UI', sans-serif",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isActive ? color.border : "#4b5563",
                flexShrink: 0,
              }}
            />
            <span>{status}</span>
            <span
              style={{
                fontSize: 10,
                color: isActive ? color.text : "#475569",
                marginLeft: 2,
              }}
            >
              {stats[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const FilterToolbar = memo(FilterToolbarInner);
