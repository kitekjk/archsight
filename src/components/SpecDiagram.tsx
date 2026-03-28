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

import type { ResolvedGraph, ChangeStatus } from "../types/spec-metadata";
import { analyzeImpact } from "../core/resolve-graph";
import { useGraphLayout } from "../hooks/useGraphLayout";
import { DddLayerNode } from "./DddLayerNode";
import { DddEdge, EdgeMarkerDefs } from "./DddEdge";
import { LayerBackground } from "./LayerBackground";
import { StatsBar } from "./StatsBar";
import { DetailPanel } from "./DetailPanel";
import { FilterToolbar } from "./FilterToolbar";

interface SpecDiagramProps {
  resolved: ResolvedGraph;
}

const nodeTypes: NodeTypes = { ddd: DddLayerNode };
const edgeTypes: EdgeTypes = { ddd: DddEdge };

const ALL_STATUSES: ChangeStatus[] = ["existing", "new", "modified", "affected", "deprecated"];

export function SpecDiagram({ resolved }: SpecDiagramProps) {
  const { nodes, edges, layerBounds } = useGraphLayout(resolved);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<ChangeStatus>>(new Set(ALL_STATUSES));

  // 직접 연결된 1-hop만 하이라이트 (전체 BFS는 너무 넓어서 의미 없음)
  const impactResult = useMemo(() => {
    if (!selectedNodeId) return null;
    const impactedNodeIds = new Set<string>([selectedNodeId]);
    const impactedEdgeKeys = new Set<string>();
    for (const edge of resolved.edges) {
      const key = `${edge.from}→${edge.to}`;
      if (edge.from === selectedNodeId) {
        impactedNodeIds.add(edge.to);
        impactedEdgeKeys.add(key);
      }
      if (edge.to === selectedNodeId) {
        impactedNodeIds.add(edge.from);
        impactedEdgeKeys.add(key);
      }
    }
    return { impactedNodeIds, impactedEdgeKeys };
  }, [resolved, selectedNodeId]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    setDetailNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onDetailClose = useCallback(() => {
    setDetailNodeId(null);
  }, []);

  const onFilterToggle = useCallback((status: ChangeStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Filtered nodes/edges based on activeFilters
  const visibleNodeIds = useMemo(() => {
    return new Set(
      nodes
        .filter((node) => {
          const resolvedNode = resolved.nodes.find((n) => n.id === node.id);
          const status: ChangeStatus = resolvedNode?.status ?? "existing";
          return activeFilters.has(status);
        })
        .map((n) => n.id)
    );
  }, [nodes, resolved.nodes, activeFilters]);

  const filteredNodes = useMemo(
    () => nodes.filter((node) => visibleNodeIds.has(node.id)),
    [nodes, visibleNodeIds]
  );

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
      ),
    [edges, visibleNodeIds]
  );

  const interactiveNodes = useMemo(() => {
    const hasSelection = selectedNodeId !== null;
    return filteredNodes.map((node) => {
      const isSelected = node.id === selectedNodeId;
      const isImpacted = hasSelection
        ? !isSelected && (impactResult?.impactedNodeIds.has(node.id) ?? false)
        : false;
      const isDimmed = hasSelection && !isSelected && !isImpacted;
      return {
        ...node,
        data: {
          ...node.data,
          isSelected,
          isImpacted,
          isDimmed,
        },
      };
    });
  }, [filteredNodes, selectedNodeId, impactResult]);

  const interactiveEdges = useMemo(() => {
    const hasSelection = selectedNodeId !== null;
    return filteredEdges.map((edge) => {
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
  }, [filteredEdges, selectedNodeId, impactResult]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const detailNode = detailNodeId
    ? resolved.nodes.find((n) => n.id === detailNodeId) ?? null
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <StatsBar stats={resolved.stats} changeSetTitle={resolved.changeSet?.title} />
      <FilterToolbar
        stats={resolved.stats}
        activeFilters={activeFilters}
        onToggle={onFilterToggle}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden" }}>
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
            zoomOnDoubleClick={false}
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
        {detailNode && <DetailPanel node={detailNode} onClose={onDetailClose} />}
      </div>
    </div>
  );
}
