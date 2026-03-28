// src/components/DddLayerNode.tsx
import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DddNodeData } from "../hooks/useGraphLayout";
import { STATUS_COLORS, LAYER_COLORS, TYPE_LABELS } from "../styles/theme";
import { NodeTooltip } from "./NodeTooltip";
import type { ResolvedNode } from "../types/spec-metadata";

function DddLayerNodeInner({ data }: NodeProps) {
  const nodeData = data as unknown as DddNodeData;
  const statusColor = STATUS_COLORS[nodeData.status];
  const layerColor = LAYER_COLORS[nodeData.layer];
  const typeLabel = TYPE_LABELS[nodeData.type];
  const isAggregate = nodeData.type === "aggregate";
  const isNew = nodeData.status === "new";
  const isDeprecated = nodeData.status === "deprecated";

  const isSelected = nodeData.isSelected as boolean | undefined;
  const isImpacted = nodeData.isImpacted as boolean | undefined;
  const isDimmed = nodeData.isDimmed as boolean | undefined;
  const isExpanded = nodeData.isExpanded as boolean | undefined;

  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipPos(null);
  }, []);

  // Build border color: impacted = red, selected = statusColor.border (brighter), else normal
  const borderColor = isImpacted
    ? "#ef4444"
    : isSelected
    ? statusColor.border
    : statusColor.border;

  const borderWidth = isAggregate || isSelected || isImpacted ? 2 : 1;

  const boxShadow = isSelected
    ? `0 0 0 3px ${statusColor.border}66, 0 0 12px ${statusColor.border}44`
    : undefined;

  const opacity = isDimmed ? 0.3 : 1;

  const modifiedMembers = nodeData.modifiedMembers as ResolvedNode["modifiedMembers"] | undefined;
  const reviewPoints = nodeData.reviewPoints as ResolvedNode["reviewPoints"] | undefined;
  const criticalReviews = reviewPoints?.filter((rp) => rp.severity === "critical").length ?? 0;
  const totalReviews = reviewPoints?.length ?? 0;

  const showTooltip = tooltipPos !== null && !isExpanded;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          background: "#1e293b",
          border: `${borderWidth}px ${isNew ? "dashed" : "solid"} ${borderColor}`,
          borderRadius: 6,
          padding: "8px 12px",
          minWidth: 140,
          fontFamily: "'Segoe UI', sans-serif",
          position: "relative",
          boxShadow,
          opacity,
          cursor: "pointer",
          transition: "opacity 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: layerColor.accent, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            {typeLabel}
          </span>
          {nodeData.status !== "existing" && (
            <span style={{ fontSize: 8, background: statusColor.badge, color: statusColor.text, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
              {nodeData.status}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: isDeprecated ? "#6b7280" : "#e2e8f0", textDecoration: isDeprecated ? "line-through" : "none", lineHeight: 1.3 }}>
          {nodeData.label}
        </div>
        {nodeData.subtitle && (
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            {nodeData.subtitle}
          </div>
        )}

        {/* Expanded: modifiedMembers + reviewPoints */}
        {isExpanded && (
          <div style={{ marginTop: 8, borderTop: "1px solid #334155", paddingTop: 6 }}>
            {modifiedMembers && (
              <>
                {modifiedMembers.added && modifiedMembers.added.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 8, color: "#4ade80", textTransform: "uppercase", marginBottom: 2 }}>Added</div>
                    {modifiedMembers.added.map((m, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#4ade80", fontFamily: "monospace", lineHeight: 1.5 }}>+ {m}</div>
                    ))}
                  </div>
                )}
                {modifiedMembers.changed && modifiedMembers.changed.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 8, color: "#fbbf24", textTransform: "uppercase", marginBottom: 2 }}>Changed</div>
                    {modifiedMembers.changed.map((m, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#fbbf24", fontFamily: "monospace", lineHeight: 1.5 }}>~ {m}</div>
                    ))}
                  </div>
                )}
                {modifiedMembers.removed && modifiedMembers.removed.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 8, color: "#f87171", textTransform: "uppercase", marginBottom: 2 }}>Removed</div>
                    {modifiedMembers.removed.map((m, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#f87171", fontFamily: "monospace", lineHeight: 1.5, textDecoration: "line-through" }}>- {m}</div>
                    ))}
                  </div>
                )}
              </>
            )}
            {totalReviews > 0 && (
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, color: criticalReviews > 0 ? "#f87171" : "#94a3b8" }}>
                  {criticalReviews > 0 ? `${criticalReviews} critical` : ""}{criticalReviews > 0 && totalReviews > criticalReviews ? ", " : ""}
                  {totalReviews - criticalReviews > 0 ? `${totalReviews - criticalReviews} review${totalReviews - criticalReviews > 1 ? "s" : ""}` : ""}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {showTooltip && tooltipPos && (
        <NodeTooltip node={nodeData as unknown as ResolvedNode} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </>
  );
}

export const DddLayerNode = memo(DddLayerNodeInner);
