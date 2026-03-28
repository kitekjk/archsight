// src/components/DddLayerNode.tsx
import { memo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {tooltipPos && createPortal(
        <NodeTooltip node={nodeData as unknown as ResolvedNode} x={tooltipPos.x} y={tooltipPos.y} />,
        document.body
      )}
    </>
  );
}

export const DddLayerNode = memo(DddLayerNodeInner);
