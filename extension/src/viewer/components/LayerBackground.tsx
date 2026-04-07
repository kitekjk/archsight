// src/components/LayerBackground.tsx
import { memo } from "react";
import { useViewport } from "@xyflow/react";
import type { DddLayer } from "../types/spec-metadata";
import type { LayerBounds } from "../hooks/useGraphLayout";
import { LAYER_COLORS } from "../styles/theme";

interface LayerBackgroundProps {
  layerBounds: Record<DddLayer, LayerBounds>;
}

function LayerBackgroundInner({ layerBounds }: LayerBackgroundProps) {
  const { x, y, zoom } = useViewport();

  const layers = (Object.entries(layerBounds) as [DddLayer, LayerBounds][])
    .sort((a, b) => a[1].minY - b[1].minY);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {layers.map(([layerId, bounds]) => {
        const colors = LAYER_COLORS[layerId];
        const top = bounds.minY * zoom + y;
        const height = (bounds.maxY - bounds.minY) * zoom;

        return (
          <div key={layerId} style={{ position: "absolute", top, left: 0, right: 0, height, background: colors.bg, borderTop: `1px solid ${colors.accent}22`, borderBottom: `1px solid ${colors.accent}22` }}>
            <span style={{ position: "absolute", top: 4, left: x + 8, fontSize: 10, color: colors.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6, whiteSpace: "nowrap" }}>
              {bounds.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const LayerBackground = memo(LayerBackgroundInner);
