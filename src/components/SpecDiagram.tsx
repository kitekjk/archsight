// src/components/SpecDiagram.tsx
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ResolvedGraph } from "../types/spec-metadata";
import { useGraphLayout } from "../hooks/useGraphLayout";
import { DddLayerNode } from "./DddLayerNode";
import { DddEdge, EdgeMarkerDefs } from "./DddEdge";
import { LayerBackground } from "./LayerBackground";
import { StatsBar } from "./StatsBar";

interface SpecDiagramProps {
  resolved: ResolvedGraph;
}

const nodeTypes: NodeTypes = { ddd: DddLayerNode };
const edgeTypes: EdgeTypes = { ddd: DddEdge };

export function SpecDiagram({ resolved }: SpecDiagramProps) {
  const { nodes, edges, layerBounds } = useGraphLayout(resolved);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <StatsBar stats={resolved.stats} changeSetTitle={resolved.changeSet?.title} />
      <div style={{ flex: 1, position: "relative" }}>
        <EdgeMarkerDefs />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={proOptions}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <LayerBackground layerBounds={layerBounds} />
          <Background color="#1e293b" gap={20} size={1} />
          <Controls
            showInteractive={false}
            style={{ background: "#1e293b", borderColor: "#334155" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
