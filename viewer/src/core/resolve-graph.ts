import type {
  BoundedContextGraph,
  ChangeSet,
  ResolvedGraph,
  ResolvedNode,
  ResolvedEdge,
  LayerConfig,
  DddLayer,
} from "../types/spec-metadata";

/** 기본 DDD 4레이어 설정 */
const DEFAULT_LAYERS: Required<LayerConfig>[] = [
  { id: "presentation", displayName: "Presentation", order: 0 },
  { id: "application", displayName: "Application", order: 1 },
  { id: "domain", displayName: "Domain", order: 2 },
  { id: "infrastructure", displayName: "Infrastructure", order: 3 },
];

/**
 * BoundedContextGraph + ChangeSet → ResolvedGraph
 *
 * 시각화 컴포넌트가 소비하는 최종 데이터를 생성합니다.
 * ChangeSet이 없으면 모든 노드가 "existing" 상태로 렌더링됩니다.
 */
export function resolveGraph(
  graph: BoundedContextGraph,
  changeSet?: ChangeSet
): ResolvedGraph {
  // 1. 레이어 설정 확정
  const layers: Required<LayerConfig>[] = graph.layers
    ? graph.layers.map((l) => ({
        id: l.id,
        displayName: l.displayName ?? defaultDisplayName(l.id),
        order: l.order,
      }))
    : DEFAULT_LAYERS;

  // 2. 노드 변경 사항을 Map으로 인덱싱
  const nodeChangeMap = new Map(
    changeSet?.nodeChanges.map((nc) => [nc.nodeId, nc]) ?? []
  );

  // 3. Base 노드를 ResolvedNode로 변환
  const resolvedNodes: ResolvedNode[] = graph.nodes.map((node) => {
    const change = nodeChangeMap.get(node.id);
    return {
      ...node,
      status: change?.status ?? "existing",
      changes: change?.changes ?? [],
      reviewPoints: change?.reviewPoints ?? [],
      modifiedMembers: change?.modifiedMembers,
      // ChangeSet에서 노드 속성을 오버라이드하는 경우
      ...(change?.node
        ? {
            label: change.node.label ?? node.label,
            subtitle: change.node.subtitle ?? node.subtitle,
            description: change.node.description ?? node.description,
            operations: change.node.operations ?? node.operations,
            codeMapping: change.node.codeMapping ?? node.codeMapping,
          }
        : {}),
    };
  });

  // 4. ChangeSet의 새 노드(status: "new") 추가
  if (changeSet) {
    for (const nc of changeSet.nodeChanges) {
      if (nc.status === "new" && nc.node) {
        // base graph에 이미 있는지 확인 (중복 방지)
        if (!resolvedNodes.find((n) => n.id === nc.nodeId)) {
          resolvedNodes.push({
            ...nc.node,
            status: "new",
            changes: nc.changes ?? [],
            reviewPoints: nc.reviewPoints ?? [],
            modifiedMembers: nc.modifiedMembers,
          });
        }
      }
    }
  }

  // 5. 엣지 변경 사항을 Set으로 인덱싱
  const edgeChangeMap = new Map(
    changeSet?.edgeChanges.map((ec) => [`${ec.from}→${ec.to}`, ec]) ?? []
  );

  // 6. Base 엣지를 ResolvedEdge로 변환
  const resolvedEdges: ResolvedEdge[] = graph.edges.map((edge) => {
    const key = `${edge.from}→${edge.to}`;
    const change = edgeChangeMap.get(key);
    return {
      ...edge,
      status: change?.status ?? "existing",
    };
  });

  // 7. ChangeSet의 새 엣지 추가
  if (changeSet) {
    for (const ec of changeSet.edgeChanges) {
      const key = `${ec.from}→${ec.to}`;
      if (ec.status === "new" && ec.edge) {
        if (!resolvedEdges.find((e) => `${e.from}→${e.to}` === key)) {
          resolvedEdges.push({
            ...ec.edge,
            status: "new",
          });
        }
      }
    }
  }

  // 8. 통계 계산
  const stats = {
    existing: 0,
    new: 0,
    modified: 0,
    affected: 0,
    deprecated: 0,
  };
  for (const node of resolvedNodes) {
    stats[node.status]++;
  }

  return {
    context: graph.context,
    changeSet: changeSet?.meta,
    layers,
    nodes: resolvedNodes,
    edges: resolvedEdges,
    stats,
  };
}

function defaultDisplayName(layer: DddLayer): string {
  const map: Record<DddLayer, string> = {
    presentation: "Presentation",
    application: "Application",
    domain: "Domain",
    infrastructure: "Infrastructure",
  };
  return map[layer] ?? layer;
}

/**
 * 영향도 분석 — 특정 노드를 선택했을 때 연관된 노드/엣지 목록 반환
 *
 * 방향:
 * - upstream: 이 노드를 호출하는 쪽 (이 노드가 변경되면 영향받는 곳)
 * - downstream: 이 노드가 호출하는 쪽 (이 노드가 의존하는 곳)
 * - both: 양방향
 */
export function analyzeImpact(
  resolved: ResolvedGraph,
  nodeId: string,
  direction: "upstream" | "downstream" | "both" = "both"
): {
  impactedNodeIds: Set<string>;
  impactedEdgeKeys: Set<string>;
} {
  const impactedNodeIds = new Set<string>([nodeId]);
  const impactedEdgeKeys = new Set<string>();

  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const edge of resolved.edges) {
      const key = `${edge.from}→${edge.to}`;

      // downstream: current → target
      if (
        (direction === "downstream" || direction === "both") &&
        edge.from === current &&
        !visited.has(edge.to)
      ) {
        visited.add(edge.to);
        impactedNodeIds.add(edge.to);
        impactedEdgeKeys.add(key);
        queue.push(edge.to);
      }

      // upstream: source → current
      if (
        (direction === "upstream" || direction === "both") &&
        edge.to === current &&
        !visited.has(edge.from)
      ) {
        visited.add(edge.from);
        impactedNodeIds.add(edge.from);
        impactedEdgeKeys.add(key);
        queue.push(edge.from);
      }
    }
  }

  return { impactedNodeIds, impactedEdgeKeys };
}
