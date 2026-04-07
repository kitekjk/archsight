// src/components/DddEdge.tsx
import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { ResolvedEdge } from "../types/spec-metadata";
import { STATUS_COLORS } from "../styles/theme";

function DddEdgeInner(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const edgeData = data as unknown as ResolvedEdge & { isHighlighted?: boolean; isDimmed?: boolean };

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const edgeType = edgeData?.type ?? "depends_on";
  const status = edgeData?.status ?? "existing";
  const statusColor = STATUS_COLORS[status];

  const isHighlighted = edgeData?.isHighlighted ?? false;
  const isDimmed = edgeData?.isDimmed ?? false;

  const isDashed = edgeType === "publishes" || edgeType === "subscribes" || edgeType === "implements";
  const isNew = status === "new";

  const strokeColor = isHighlighted
    ? "#ef4444"
    : status === "existing"
    ? "#475569"
    : statusColor.border;

  const strokeWidth = isHighlighted ? 2.5 : status === "existing" ? 1 : 1.5;
  const strokeDasharray = isDashed || isNew ? "6 3" : undefined;
  const opacity = isDimmed ? 0.15 : 1;

  const label = edgeData?.method ?? edgeData?.label;
  const showLabel = label && !isDimmed;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity,
          transition: "opacity 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease",
        }}
        markerEnd={`url(#marker-${edgeType}-${status})`}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 9,
              color: "#94a3b8",
              background: "#0f172a",
              padding: "1px 4px",
              borderRadius: 2,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              opacity,
              transition: "opacity 0.15s ease",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DddEdge = memo(DddEdgeInner);

/** SVG marker definitions */
export function EdgeMarkerDefs() {
  const markerTypes = ["invokes", "publishes", "subscribes", "depends_on", "implements", "creates"] as const;
  const statuses = ["existing", "new", "modified", "affected", "deprecated"] as const;

  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        {markerTypes.flatMap((type) =>
          statuses.map((status) => {
            const color = status === "existing" ? "#475569" : STATUS_COLORS[status].border;
            const id = `marker-${type}-${status}`;

            if (type === "creates") {
              return <marker key={id} id={id} viewBox="0 0 12 12" refX={12} refY={6} markerWidth={10} markerHeight={10} orient="auto"><path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill={color} /></marker>;
            }
            if (type === "implements") {
              return <marker key={id} id={id} viewBox="0 0 12 12" refX={12} refY={6} markerWidth={10} markerHeight={10} orient="auto"><path d="M 0 0 L 12 6 L 0 12 Z" fill="none" stroke={color} strokeWidth={1.5} /></marker>;
            }
            return <marker key={id} id={id} viewBox="0 0 12 12" refX={12} refY={6} markerWidth={8} markerHeight={8} orient="auto"><path d="M 0 0 L 12 6 L 0 12 Z" fill={color} /></marker>;
          })
        )}
      </defs>
    </svg>
  );
}
