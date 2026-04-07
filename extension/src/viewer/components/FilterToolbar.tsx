// src/components/FilterToolbar.tsx
import { memo } from "react";
import type { ChangeStatus, DddLayer, DddComponentType, ResolvedGraph } from "../types/spec-metadata";
import { STATUS_COLORS, LAYER_COLORS, TYPE_LABELS } from "../styles/theme";

interface FilterToolbarProps {
  stats: ResolvedGraph["stats"];
  activeFilters: Set<ChangeStatus>;
  onToggle: (status: ChangeStatus) => void;
  /** 레이어별 노드 수 */
  layerCounts: Record<string, number>;
  activeLayers: Set<DddLayer>;
  onLayerToggle: (layer: DddLayer) => void;
  /** 타입별 노드 수 */
  typeCounts: Record<string, number>;
  activeTypes: Set<DddComponentType>;
  onTypeToggle: (type: DddComponentType) => void;
}

const STATUS_ORDER: ChangeStatus[] = ["new", "modified", "affected", "deprecated", "existing"];
const LAYER_ORDER: DddLayer[] = ["presentation", "application", "domain", "infrastructure"];
const TYPE_ORDER: DddComponentType[] = [
  "controller", "usecase", "aggregate", "domain_service",
  "repository", "adapter", "policy", "domain_event",
  "entity", "value_object", "command", "query",
];

function FilterToolbarInner({
  stats, activeFilters, onToggle,
  layerCounts, activeLayers, onLayerToggle,
  typeCounts, activeTypes, onTypeToggle,
}: FilterToolbarProps) {
  const statusItems = STATUS_ORDER.filter((s) => stats[s] > 0);
  const layerItems = LAYER_ORDER.filter((l) => (layerCounts[l] ?? 0) > 0);
  const typeItems = TYPE_ORDER.filter((t) => (typeCounts[t] ?? 0) > 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 16px",
        background: "rgba(15,23,42,0.7)",
        borderBottom: "1px solid #1e293b",
        fontFamily: "'Segoe UI', sans-serif",
        flexWrap: "wrap",
      }}
    >
      {/* Layer filters */}
      <FilterGroup label="Layer">
        {layerItems.map((layer) => {
          const color = LAYER_COLORS[layer];
          const isActive = activeLayers.has(layer);
          return (
            <ToggleButton
              key={layer}
              label={layer}
              count={layerCounts[layer] ?? 0}
              isActive={isActive}
              activeColor={color.accent}
              activeBg={color.bg}
              onClick={() => onLayerToggle(layer)}
            />
          );
        })}
      </FilterGroup>

      <Separator />

      {/* Type filters */}
      <FilterGroup label="Type">
        {typeItems.map((type) => {
          const isActive = activeTypes.has(type);
          return (
            <ToggleButton
              key={type}
              label={TYPE_LABELS[type]}
              count={typeCounts[type] ?? 0}
              isActive={isActive}
              activeColor="#94a3b8"
              activeBg="rgba(148,163,184,0.1)"
              onClick={() => onTypeToggle(type)}
            />
          );
        })}
      </FilterGroup>

      {/* Status filters (only show when there are changes) */}
      {statusItems.length > 1 && (
        <>
          <Separator />
          <FilterGroup label="Status">
            {statusItems.map((status) => {
              const color = STATUS_COLORS[status];
              const isActive = activeFilters.has(status);
              return (
                <ToggleButton
                  key={status}
                  label={status}
                  count={stats[status]}
                  isActive={isActive}
                  activeColor={color.border}
                  activeBg={color.bg}
                  onClick={() => onToggle(status)}
                />
              );
            })}
          </FilterGroup>
        </>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", marginRight: 2, fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

function Separator() {
  return <div style={{ width: 1, height: 16, background: "#334155", margin: "0 6px" }} />;
}

function ToggleButton({
  label, count, isActive, activeColor, activeBg, onClick,
}: {
  label: string; count: number; isActive: boolean;
  activeColor: string; activeBg: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        borderRadius: 3,
        border: `1px solid ${isActive ? activeColor + "66" : "#334155"}`,
        background: isActive ? activeBg : "transparent",
        color: isActive ? activeColor : "#64748b",
        cursor: "pointer",
        fontSize: 10,
        fontWeight: 500,
        fontFamily: "'Segoe UI', sans-serif",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{ fontSize: 9, opacity: 0.7 }}>{count}</span>
    </button>
  );
}

export const FilterToolbar = memo(FilterToolbarInner);
