// src/components/SpecDiagram.tsx
import { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ResolvedGraph } from "../types/spec-metadata";
import { analyzeImpact } from "../core/resolve-graph";
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

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const impactResult = useMemo(() => {
    if (!selectedNodeId) return null;
    return analyzeImpact(resolved, selectedNodeId);
  }, [resolved, selectedNodeId]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const interactiveNodes = useMemo(() => {
    const hasSelection = selectedNodeId !== null;
    return nodes.map((node) => {
      const isSelected = node.id === selectedNodeId;
      const isImpacted = hasSelection
        ? !isSelected && (impactResult?.impactedNodeIds.has(node.id) ?? false)
        : false;
      const isDimmed = hasSelection && !isSelected && !isImpacted;
      const isExpanded = expandedNodeIds.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          isSelected,
          isImpacted,
          isDimmed,
          isExpanded,
        },
      };
    });
  }, [nodes, selectedNodeId, impactResult, expandedNodeIds]);

  const interactiveEdges = useMemo(() => {
    const hasSelection = selectedNodeId !== null;
    return edges.map((edge) => {
      const key = `${edge.source}→${edge.target}`;
      const isHighlighted = hasSelection && (impactResult?.impactedEdgeKeys.has(key) ?? false);
      const isDimmed = hasSelection && !isHighlighted;
      return {
        ...edge,
        data: {
          ...(edge.data as Record<string, unknown>),
          isHighlighted,
          isDimmed,
        },
      };
    });
  }, [edges, selectedNodeId, impactResult]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <StatsBar stats={resolved.stats} changeSetTitle={resolved.changeSet?.title} />
      <div style={{ flex: 1, position: "relative" }}>
        <EdgeMarkerDefs />
        <ReactFlow
          nodes={interactiveNodes}
          edges={interactiveEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={proOptions}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
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
