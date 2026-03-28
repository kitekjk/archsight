// src/components/DddLayerNode.tsx
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DddNodeData } from "../hooks/useGraphLayout";
import { STATUS_COLORS, LAYER_COLORS, TYPE_LABELS } from "../styles/theme";

function DddLayerNodeInner({ data }: NodeProps) {
  const nodeData = data as unknown as DddNodeData;
  const statusColor = STATUS_COLORS[nodeData.status];
  const layerColor = LAYER_COLORS[nodeData.layer];
  const typeLabel = TYPE_LABELS[nodeData.type];
  const isAggregate = nodeData.type === "aggregate";
  const isNew = nodeData.status === "new";
  const isDeprecated = nodeData.status === "deprecated";

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          background: "#1e293b",
          border: `${isAggregate ? 2 : 1}px ${isNew ? "dashed" : "solid"} ${statusColor.border}`,
          borderRadius: 6,
          padding: "8px 12px",
          minWidth: 140,
          fontFamily: "'Segoe UI', sans-serif",
          position: "relative",
        }}
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
    </>
  );
}

export const DddLayerNode = memo(DddLayerNodeInner);
