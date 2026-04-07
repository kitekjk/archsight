import { useMemo } from "react";
import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { ResolvedGraph, ResolvedNode, DddLayer } from "../types/spec-metadata";
import { estimateNodeSize } from "../styles/theme";

/**
 * React Flow 노드의 data 타입
 *
 * @xyflow/react Node<T> requires T extends Record<string, unknown>.
 * We intersect with Record<string, unknown> to satisfy the constraint while
 * preserving the strongly-typed fields for internal use.
 */
export type DddNodeData = ResolvedNode & {
  layerAccent: string;
} & Record<string, unknown>;

/** 레이어별 y 범위 */
export interface LayerBounds {
  minY: number;
  maxY: number;
  displayName: string;
}

/** computeLayout 결과 */
export interface LayoutResult {
  nodes: Node<DddNodeData>[];
  edges: Edge[];
  layerBounds: Record<DddLayer, LayerBounds>;
}

const DAGRE_CONFIG = {
  rankdir: "TB" as const,
  ranksep: 60,
  nodesep: 40,
  edgesep: 20,
  marginx: 40,
  marginy: 40,
};

/**
 * ResolvedGraph → dagre 레이아웃 → React Flow Node[]/Edge[]
 *
 * Layer ordering strategy:
 * - Invisible anchor nodes form a chain: anchor_p → anchor_a → anchor_d → anchor_i
 * - Each anchor connects to its layer's nodes with anchor→node edges (one-directional)
 * - Forward cross-layer edges use minlen = layer distance to prevent rank collapse
 * - Reverse cross-layer edges (e.g. infra→domain "implements") are skipped to prevent
 *   infrastructure nodes from being pulled up into domain rank
 */
export function computeLayout(resolved: ResolvedGraph): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph(DAGRE_CONFIG);
  g.setDefaultEdgeLabel(() => ({}));

  // Build a layer order map from resolved.layers
  const layerOrderMap = new Map<string, number>(
    resolved.layers.map((l) => [l.id, l.order]),
  );

  // Sort layers by order
  const layerIds = resolved.layers
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((l) => l.id);

  // Add invisible anchor nodes + chain
  for (const layerId of layerIds) {
    g.setNode(`__anchor_${layerId}`, { width: 0, height: 0 });
  }
  for (let i = 0; i < layerIds.length - 1; i++) {
    g.setEdge(`__anchor_${layerIds[i]}`, `__anchor_${layerIds[i + 1]}`, {
      minlen: 1,
      weight: 10,
    });
  }

  // Build node→layer map for edge minlen computation
  const nodeLayerMap = new Map<string, number>(
    resolved.nodes.map((n) => [n.id, layerOrderMap.get(n.layer) ?? 0]),
  );

  // Add real nodes with anchor→node edges (one-directional)
  for (const node of resolved.nodes) {
    const { width, height } = estimateNodeSize(node.label, node.subtitle);
    g.setNode(node.id, { width, height });
    const anchorId = `__anchor_${node.layer}`;
    // weight를 높여서 같은 레이어의 anchor에 강하게 묶음
    g.setEdge(anchorId, node.id, { weight: 10, minlen: 0 });
    g.setEdge(node.id, anchorId, { weight: 10, minlen: 0 });
  }

  // Add real edges — only forward-direction (same or higher layer order)
  // Reverse edges (e.g. "implements" from infra→domain) would pull infra nodes up
  for (const edge of resolved.edges) {
    const fromOrder = nodeLayerMap.get(edge.from) ?? 0;
    const toOrder = nodeLayerMap.get(edge.to) ?? 0;
    if (fromOrder <= toOrder) {
      const layerDiff = Math.max(1, toOrder - fromOrder);
      g.setEdge(edge.from, edge.to, { weight: 1, minlen: layerDiff });
    }
    // Skip reverse cross-layer edges to preserve anchor-enforced layer ordering
  }

  dagre.layout(g);

  // React Flow Node[] 변환
  const rfNodes: Node<DddNodeData>[] = resolved.nodes.map((node) => {
    const pos = g.node(node.id);
    const { width, height } = estimateNodeSize(node.label, node.subtitle);
    return {
      id: node.id,
      type: "ddd",
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
      data: {
        ...node,
        layerAccent: "",
      },
      width,
      height,
    };
  });

  // React Flow Edge[] 변환
  // Edge data must extend Record<string, unknown> — cast via unknown to satisfy constraint
  const rfEdges: Edge[] = resolved.edges.map((edge, i) => ({
    id: `e-${edge.from}-${edge.to}-${i}`,
    source: edge.from,
    target: edge.to,
    type: "ddd",
    data: edge as unknown as Record<string, unknown>,
  }));

  // 레이어별 y 범위 계산
  const layerBounds = computeLayerBounds(resolved, rfNodes);

  return { nodes: rfNodes, edges: rfEdges, layerBounds };
}

function computeLayerBounds(
  resolved: ResolvedGraph,
  rfNodes: Node<DddNodeData>[],
): Record<DddLayer, LayerBounds> {
  const bounds: Record<string, LayerBounds> = {};
  const nodeMap = new Map(rfNodes.map((n) => [n.id, n]));
  const PADDING = 30;

  for (const layer of resolved.layers) {
    const layerNodes = resolved.nodes
      .filter((n) => n.layer === layer.id)
      .map((n) => nodeMap.get(n.id))
      .filter((n): n is Node<DddNodeData> => n != null);

    if (layerNodes.length === 0) continue;

    const minY = Math.min(...layerNodes.map((n) => n.position.y)) - PADDING;
    const maxY =
      Math.max(...layerNodes.map((n) => n.position.y + (n.height ?? 60))) +
      PADDING;

    bounds[layer.id] = {
      minY,
      maxY,
      displayName: layer.displayName,
    };
  }

  return bounds as Record<DddLayer, LayerBounds>;
}

/**
 * React 훅 래퍼: resolved가 바뀔 때만 재계산
 */
export function useGraphLayout(resolved: ResolvedGraph): LayoutResult {
  return useMemo(() => computeLayout(resolved), [resolved]);
}
