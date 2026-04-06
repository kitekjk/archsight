// src/components/NodeTooltip.tsx
import { memo } from "react";
import type { ResolvedNode } from "../types/spec-metadata";
import { STATUS_COLORS, LAYER_COLORS } from "../styles/theme";

interface NodeTooltipProps {
  node: ResolvedNode;
  x: number;
  y: number;
}

function NodeTooltipInner({ node, x, y }: NodeTooltipProps) {
  const statusColor = STATUS_COLORS[node.status];
  const layerColor = LAYER_COLORS[node.layer];

  return (
    <div
      style={{
        position: "fixed",
        left: x + 12,
        top: y + 12,
        background: "#1e293b",
        border: `1px solid ${layerColor.accent}44`,
        borderRadius: 8,
        padding: "10px 14px",
        maxWidth: 320,
        fontSize: 12,
        fontFamily: "'Segoe UI', sans-serif",
        color: "#e2e8f0",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: layerColor.accent, fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>
          {node.type.replace("_", " ")}
        </span>
        {node.status !== "existing" && (
          <span style={{ fontSize: 10, color: statusColor.text, fontWeight: 600 }}>{node.status}</span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{node.label}</div>
      {node.description && (
        <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{node.description}</div>
      )}
      {node.operations && node.operations.length > 0 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 6, marginTop: 4 }}>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Operations</div>
          {node.operations.slice(0, 4).map((op, i) => (
            <div key={i} style={{ fontSize: 10, color: "#cbd5e1", fontFamily: "monospace", lineHeight: 1.6 }}>{op}</div>
          ))}
          {node.operations.length > 4 && (
            <div style={{ fontSize: 10, color: "#64748b" }}>+{node.operations.length - 4} more</div>
          )}
        </div>
      )}
      {node.changes.length > 0 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 6, marginTop: 4 }}>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Changes</div>
          {node.changes.map((ch, i) => (
            <div key={i} style={{ fontSize: 10, color: statusColor.text, lineHeight: 1.5 }}>• {ch}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export const NodeTooltip = memo(NodeTooltipInner);
