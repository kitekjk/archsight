// src/components/StatsBar.tsx
import { memo } from "react";
import type { ResolvedGraph } from "../types/spec-metadata";
import { STATUS_COLORS } from "../styles/theme";

interface StatsBarProps {
  stats: ResolvedGraph["stats"];
  changeSetTitle?: string;
}

function StatsBarInner({ stats, changeSetTitle }: StatsBarProps) {
  const hasChanges = stats.new > 0 || stats.modified > 0 || stats.affected > 0 || stats.deprecated > 0;
  if (!hasChanges) return null;

  const items = [
    { label: "new", count: stats.new, color: STATUS_COLORS.new },
    { label: "modified", count: stats.modified, color: STATUS_COLORS.modified },
    { label: "affected", count: stats.affected, color: STATUS_COLORS.affected },
    { label: "deprecated", count: stats.deprecated, color: STATUS_COLORS.deprecated },
    { label: "existing", count: stats.existing, color: STATUS_COLORS.existing },
  ].filter((item) => item.count > 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "rgba(15,23,42,0.9)", borderBottom: "1px solid #1e293b", fontSize: 12, fontFamily: "'Segoe UI', sans-serif" }}>
      {changeSetTitle && <span style={{ color: "#e2e8f0", fontWeight: 600, marginRight: 8 }}>{changeSetTitle}</span>}
      {items.map((item) => (
        <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color.border }} />
          <span style={{ color: item.color.text }}>{item.count}</span>
          <span style={{ color: "#64748b" }}>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export const StatsBar = memo(StatsBarInner);
