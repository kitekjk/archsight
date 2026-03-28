# Phase 1: 정적 렌더링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ResolvedGraph 데이터를 React Flow + dagre로 DDD 레이어 swimlane 다이어그램으로 렌더링한다.

**Architecture:** useGraphLayout 훅이 ResolvedGraph를 dagre로 레이아웃 계산하여 React Flow 노드/엣지 배열로 변환. SpecDiagram이 커스텀 노드(DddLayerNode)/엣지(DddEdge)와 레이어 배경(LayerBackground)을 조합하여 렌더링. 개발용 App.tsx에서 4개 테스트 데이터셋을 선택하여 확인.

**Tech Stack:** React 18, @xyflow/react 12, dagre, TypeScript (strict), vite

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/styles/theme.ts` | ChangeStatus/Layer/Type 색상·라벨 상수 |
| Create | `src/hooks/useGraphLayout.ts` | ResolvedGraph → dagre → React Flow Node[]/Edge[] 변환 |
| Create | `src/components/DddLayerNode.tsx` | 커스텀 노드: 컴팩트 디자인 (타입+이름+subtitle+상태배지) |
| Create | `src/components/DddEdge.tsx` | 커스텀 엣지: EdgeType별 선/화살표 스타일 |
| Create | `src/components/LayerBackground.tsx` | 레이어 swimlane 반투명 배경 |
| Create | `src/components/StatsBar.tsx` | 변경 통계 카드 (상단) |
| Create | `src/components/SpecDiagram.tsx` | 메인 다이어그램 (React Flow 래퍼) |
| Create | `src/App.tsx` | 개발용 진입점 (데이터셋 드롭다운 + SpecDiagram) |
| Create | `index.html` | Vite dev 서버 HTML |
| Create | `vite.config.ts` | Vite 설정 |
| Create | `src/__tests__/useGraphLayout.test.ts` | useGraphLayout 단위 테스트 |

---

### Task 1: 프로젝트 빌드 환경 세팅

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`

- [ ] **Step 1: pnpm install**

Run: `pnpm install`
Expected: node_modules 생성, 모든 의존성 설치 완료

- [ ] **Step 2: vite.config.ts 생성**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 3: index.html 생성**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>archsight</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { width: 100%; height: 100%; background: #0f172a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: src/main.tsx 생성**

```typescript
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: 최소 App.tsx로 dev 서버 동작 확인**

```typescript
// src/App.tsx (임시 — Task 8에서 최종 교체)
export default function App() {
  return <div style={{ padding: 24 }}>archsight — dev server running</div>;
}
```

- [ ] **Step 6: dev 서버 동작 확인**

Run: `pnpm dev`
Expected: 브라우저에서 "archsight — dev server running" 표시

- [ ] **Step 7: 타입 체크 확인**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts index.html src/main.tsx src/App.tsx
git commit -m "chore: setup vite dev server with React entry point"
```

---

### Task 2: 테마 상수 정의

**Files:**
- Create: `src/styles/theme.ts`

- [ ] **Step 1: theme.ts 작성**

```typescript
// src/styles/theme.ts
import type { ChangeStatus, DddLayer, DddComponentType } from "../types/spec-metadata";

/** ChangeStatus → 시각 스타일 */
export const STATUS_COLORS: Record<ChangeStatus, { border: string; bg: string; text: string; badge: string }> = {
  existing:   { border: "#6b7280", bg: "#374151", text: "#9ca3af", badge: "#4b5563" },
  new:        { border: "#22c55e", bg: "#064e3b", text: "#4ade80", badge: "#15803d" },
  modified:   { border: "#f59e0b", bg: "#78350f", text: "#fbbf24", badge: "#b45309" },
  affected:   { border: "#ef4444", bg: "#7f1d1d", text: "#f87171", badge: "#b91c1c" },
  deprecated: { border: "#6b7280", bg: "#1f2937", text: "#6b7280", badge: "#374151" },
};

/** DddLayer → 레이어 색상 */
export const LAYER_COLORS: Record<DddLayer, { accent: string; bg: string }> = {
  presentation:   { accent: "#818cf8", bg: "rgba(99,102,241,0.08)" },
  application:    { accent: "#4ade80", bg: "rgba(34,197,94,0.06)" },
  domain:         { accent: "#fbbf24", bg: "rgba(251,191,36,0.06)" },
  infrastructure: { accent: "#fb7185", bg: "rgba(244,63,94,0.06)" },
};

/** DddComponentType → 표시 라벨 */
export const TYPE_LABELS: Record<DddComponentType, string> = {
  controller: "controller",
  usecase: "usecase",
  command: "command",
  query: "query",
  aggregate: "aggregate",
  entity: "entity",
  value_object: "value object",
  domain_service: "domain service",
  domain_event: "event",
  repository: "repository",
  adapter: "adapter",
  policy: "policy",
};

/** 레이어 순서 (dagre rank) */
export const LAYER_ORDER: Record<DddLayer, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  infrastructure: 3,
};

/** 노드 크기 계산 */
export function estimateNodeSize(label: string, subtitle?: string): { width: number; height: number } {
  const width = Math.max(160, label.length * 9 + 40);
  const height = subtitle ? 76 : 60;
  return { width, height };
}
```

- [ ] **Step 2: 타입 체크 확인**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.ts
git commit -m "feat: add theme constants for status colors, layer colors, and type labels"
```

---

### Task 3: useGraphLayout 훅 — 테스트 먼저

**Files:**
- Create: `src/hooks/useGraphLayout.ts`
- Create: `src/__tests__/useGraphLayout.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/__tests__/useGraphLayout.test.ts
import { describe, it, expect } from "vitest";
import { computeLayout } from "../hooks/useGraphLayout";
import { resolveGraph } from "../core/resolve-graph";
import { orderBoundedContext } from "../examples/order-bc-graph";
import { cancelOrderChangeSet } from "../examples/cancel-order-changeset";

describe("computeLayout", () => {
  it("base graph만 넘기면 모든 노드가 existing이고 위치가 할당된다", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { nodes, edges, layerBounds } = computeLayout(resolved);

    // 노드 수 일치
    expect(nodes).toHaveLength(resolved.nodes.length);
    // 모든 노드에 position이 할당됨
    for (const node of nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
    // 엣지 수 일치
    expect(edges).toHaveLength(resolved.edges.length);
    // 레이어 바운드가 4개 존재
    expect(Object.keys(layerBounds)).toHaveLength(4);
  });

  it("presentation 레이어 노드가 domain 레이어 노드보다 위에 있다 (y값이 작다)", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { nodes } = computeLayout(resolved);

    const ctrlNode = nodes.find((n) => n.id === "order-ctrl");
    const aggNode = nodes.find((n) => n.id === "order-agg");

    expect(ctrlNode).toBeDefined();
    expect(aggNode).toBeDefined();
    expect(ctrlNode!.position.y).toBeLessThan(aggNode!.position.y);
  });

  it("ChangeSet 적용 시 새 노드가 포함된다", () => {
    const resolved = resolveGraph(orderBoundedContext, cancelOrderChangeSet);
    const { nodes } = computeLayout(resolved);

    const cancelUc = nodes.find((n) => n.id === "cancel-order-uc");
    expect(cancelUc).toBeDefined();
    expect(cancelUc!.data.status).toBe("new");
  });

  it("layerBounds의 y 순서가 presentation < application < domain < infrastructure", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { layerBounds } = computeLayout(resolved);

    expect(layerBounds.presentation.minY).toBeLessThan(layerBounds.application.minY);
    expect(layerBounds.application.minY).toBeLessThan(layerBounds.domain.minY);
    expect(layerBounds.domain.minY).toBeLessThan(layerBounds.infrastructure.minY);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `pnpm test -- --run src/__tests__/useGraphLayout.test.ts`
Expected: FAIL — `computeLayout` 함수가 존재하지 않음

- [ ] **Step 3: useGraphLayout.ts 구현**

```typescript
// src/hooks/useGraphLayout.ts
import { useMemo } from "react";
import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { ResolvedGraph, ResolvedNode, ResolvedEdge, DddLayer } from "../types/spec-metadata";
import { LAYER_ORDER, estimateNodeSize } from "../styles/theme";

/** React Flow 노드의 data 타입 */
export interface DddNodeData extends ResolvedNode {
  layerAccent: string;
}

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
  ranksep: 80,
  nodesep: 40,
  edgesep: 20,
  marginx: 40,
  marginy: 40,
};

/**
 * ResolvedGraph → dagre 레이아웃 → React Flow Node[]/Edge[]
 *
 * 순수 함수: React 훅 밖에서도 테스트 가능.
 */
export function computeLayout(resolved: ResolvedGraph): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph(DAGRE_CONFIG);
  g.setDefaultEdgeLabel(() => ({}));

  // 레이어별 rank 강제를 위한 invisible anchor 노드
  const layerIds = resolved.layers
    .sort((a, b) => a.order - b.order)
    .map((l) => l.id);

  for (const layerId of layerIds) {
    const anchorId = `__anchor_${layerId}`;
    g.setNode(anchorId, { width: 0, height: 0 });
  }
  // invisible edge로 레이어 순서 강제
  for (let i = 0; i < layerIds.length - 1; i++) {
    g.setEdge(`__anchor_${layerIds[i]}`, `__anchor_${layerIds[i + 1]}`);
  }

  // 실제 노드 추가 (같은 레이어의 anchor와 같은 rank에)
  for (const node of resolved.nodes) {
    const { width, height } = estimateNodeSize(node.label, node.subtitle);
    g.setNode(node.id, { width, height });
    // anchor와 같은 rank에 두기 위해 invisible edge (weight 0)
    const anchorId = `__anchor_${node.layer}`;
    g.setEdge(anchorId, node.id, { weight: 0, minlen: 0 });
    g.setEdge(node.id, anchorId, { weight: 0, minlen: 0 });
  }

  // 실제 엣지 추가
  for (const edge of resolved.edges) {
    g.setEdge(edge.from, edge.to);
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
  const rfEdges: Edge[] = resolved.edges.map((edge, i) => ({
    id: `e-${edge.from}-${edge.to}-${i}`,
    source: edge.from,
    target: edge.to,
    type: "ddd",
    data: edge,
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
    const maxY = Math.max(...layerNodes.map((n) => n.position.y + (n.height ?? 60))) + PADDING;

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
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `pnpm test -- --run src/__tests__/useGraphLayout.test.ts`
Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGraphLayout.ts src/__tests__/useGraphLayout.test.ts
git commit -m "feat: add useGraphLayout hook with dagre layout and layer ordering"
```

---

### Task 4: DddLayerNode 커스텀 노드

**Files:**
- Create: `src/components/DddLayerNode.tsx`

- [ ] **Step 1: DddLayerNode.tsx 작성**

```typescript
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
        {/* 타입 라벨 + 상태 배지 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span
            style={{
              fontSize: 9,
              color: layerColor.accent,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 600,
            }}
          >
            {typeLabel}
          </span>
          {nodeData.status !== "existing" && (
            <span
              style={{
                fontSize: 8,
                background: statusColor.badge,
                color: statusColor.text,
                padding: "1px 6px",
                borderRadius: 3,
                fontWeight: 600,
              }}
            >
              {nodeData.status}
            </span>
          )}
        </div>

        {/* 이름 */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isDeprecated ? "#6b7280" : "#e2e8f0",
            textDecoration: isDeprecated ? "line-through" : "none",
            lineHeight: 1.3,
          }}
        >
          {nodeData.label}
        </div>

        {/* subtitle */}
        {nodeData.subtitle && (
          <div
            style={{
              fontSize: 10,
              color: "#94a3b8",
              marginTop: 2,
            }}
          >
            {nodeData.subtitle}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export const DddLayerNode = memo(DddLayerNodeInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/DddLayerNode.tsx
git commit -m "feat: add DddLayerNode custom node with compact design"
```

---

### Task 5: DddEdge 커스텀 엣지

**Files:**
- Create: `src/components/DddEdge.tsx`

- [ ] **Step 1: DddEdge.tsx 작성**

```typescript
// src/components/DddEdge.tsx
import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { ResolvedEdge } from "../types/spec-metadata";
import { STATUS_COLORS } from "../styles/theme";

function DddEdgeInner(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const edgeData = data as unknown as ResolvedEdge;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  const edgeType = edgeData?.type ?? "depends_on";
  const status = edgeData?.status ?? "existing";
  const statusColor = STATUS_COLORS[status];

  // 엣지 타입별 스타일
  const isDashed = edgeType === "publishes" || edgeType === "subscribes" || edgeType === "implements";
  const isNew = status === "new";
  const strokeColor = status === "existing" ? "#475569" : statusColor.border;
  const strokeDasharray = isDashed || isNew ? "6 3" : undefined;

  // 라벨: method 또는 label
  const label = edgeData?.method ?? edgeData?.label;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: status === "existing" ? 1 : 1.5,
          strokeDasharray,
        }}
        markerEnd={`url(#marker-${edgeType}-${status})`}
      />
      {label && (
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

/**
 * SVG marker 정의 — SpecDiagram에서 <svg><defs> 안에 삽입
 */
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
              // 다이아몬드
              return (
                <marker key={id} id={id} viewBox="0 0 12 12" refX={12} refY={6} markerWidth={10} markerHeight={10} orient="auto">
                  <path d="M 0 6 L 6 0 L 12 6 L 6 12 Z" fill={color} />
                </marker>
              );
            }
            if (type === "implements") {
              // 빈 삼각
              return (
                <marker key={id} id={id} viewBox="0 0 12 12" refX={12} refY={6} markerWidth={10} markerHeight={10} orient="auto">
                  <path d="M 0 0 L 12 6 L 0 12 Z" fill="none" stroke={color} strokeWidth={1.5} />
                </marker>
              );
            }
            // 기본 삼각 (invokes, publishes, subscribes, depends_on)
            return (
              <marker key={id} id={id} viewBox="0 0 12 12" refX={12} refY={6} markerWidth={8} markerHeight={8} orient="auto">
                <path d="M 0 0 L 12 6 L 0 12 Z" fill={color} />
              </marker>
            );
          })
        )}
      </defs>
    </svg>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/DddEdge.tsx
git commit -m "feat: add DddEdge custom edge with type-specific styles and markers"
```

---

### Task 6: StatsBar 컴포넌트

**Files:**
- Create: `src/components/StatsBar.tsx`

- [ ] **Step 1: StatsBar.tsx 작성**

```typescript
// src/components/StatsBar.tsx
import { memo } from "react";
import type { ResolvedGraph } from "../types/spec-metadata";
import { STATUS_COLORS } from "../styles/theme";

interface StatsBarProps {
  stats: ResolvedGraph["stats"];
  changeSetTitle?: string;
}

function StatsBarInner({ stats, changeSetTitle }: StatsBarProps) {
  const hasChanges = stats.new > 0 || stats.modified > 0 || stats.affected > 0 || stats.deprecated > 0;

  if (!hasChanges) return null;

  const items = [
    { label: "new", count: stats.new, color: STATUS_COLORS.new },
    { label: "modified", count: stats.modified, color: STATUS_COLORS.modified },
    { label: "affected", count: stats.affected, color: STATUS_COLORS.affected },
    { label: "deprecated", count: stats.deprecated, color: STATUS_COLORS.deprecated },
    { label: "existing", count: stats.existing, color: STATUS_COLORS.existing },
  ].filter((item) => item.count > 0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: "rgba(15,23,42,0.9)",
        borderBottom: "1px solid #1e293b",
        fontSize: 12,
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {changeSetTitle && (
        <span style={{ color: "#e2e8f0", fontWeight: 600, marginRight: 8 }}>
          {changeSetTitle}
        </span>
      )}
      {items.map((item) => (
        <span
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: item.color.border,
            }}
          />
          <span style={{ color: item.color.text }}>{item.count}</span>
          <span style={{ color: "#64748b" }}>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export const StatsBar = memo(StatsBarInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/StatsBar.tsx
git commit -m "feat: add StatsBar component for change statistics display"
```

---

### Task 7: LayerBackground 컴포넌트

**Files:**
- Create: `src/components/LayerBackground.tsx`

- [ ] **Step 1: LayerBackground.tsx 작성**

```typescript
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
        const left = x;

        return (
          <div
            key={layerId}
            style={{
              position: "absolute",
              top,
              left: 0,
              right: 0,
              height,
              background: colors.bg,
              borderTop: `1px solid ${colors.accent}22`,
              borderBottom: `1px solid ${colors.accent}22`,
              transition: "top 0.1s, height 0.1s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 4,
                left: left + 8,
                fontSize: 10,
                color: colors.accent,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
                opacity: 0.6,
                whiteSpace: "nowrap",
              }}
            >
              {bounds.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const LayerBackground = memo(LayerBackgroundInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/LayerBackground.tsx
git commit -m "feat: add LayerBackground component for DDD layer swimlanes"
```

---

### Task 8: SpecDiagram 메인 컴포넌트

**Files:**
- Create: `src/components/SpecDiagram.tsx`

- [ ] **Step 1: SpecDiagram.tsx 작성**

```typescript
// src/components/SpecDiagram.tsx
import { useCallback, useMemo } from "react";
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
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/SpecDiagram.tsx
git commit -m "feat: add SpecDiagram main component assembling React Flow diagram"
```

---

### Task 9: App.tsx 개발용 진입점

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: App.tsx를 최종 버전으로 교체**

```typescript
// src/App.tsx
import { useState, useMemo } from "react";
import { resolveGraph } from "./core/resolve-graph";
import { orderBoundedContext } from "./examples/order-bc-graph";
import { cancelOrderChangeSet } from "./examples/cancel-order-changeset";
import { lmsBoundedContext } from "./examples/lms-bc-graph";
import { scmhubBoundedContext } from "./examples/scmhub-bc-graph";
import { SpecDiagram } from "./components/SpecDiagram";

const DATA_OPTIONS = [
  { key: "order", label: "Order BC (base)" },
  { key: "order-cancel", label: "Order BC + Cancel ChangeSet" },
  { key: "lms", label: "LMS BC" },
  { key: "scmhub", label: "SCM Hub BC" },
] as const;

type DataKey = (typeof DATA_OPTIONS)[number]["key"];

function buildResolved(key: DataKey) {
  switch (key) {
    case "order":
      return resolveGraph(orderBoundedContext);
    case "order-cancel":
      return resolveGraph(orderBoundedContext, cancelOrderChangeSet);
    case "lms":
      return resolveGraph(lmsBoundedContext);
    case "scmhub":
      return resolveGraph(scmhubBoundedContext);
  }
}

export default function App() {
  const [selected, setSelected] = useState<DataKey>("order-cancel");
  const resolved = useMemo(() => buildResolved(selected), [selected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 20px",
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>archsight</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as DataKey)}
          style={{
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #334155",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 13,
          }}
        >
          {DATA_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {resolved.context.name} — {resolved.nodes.length} nodes, {resolved.edges.length} edges
        </span>
      </div>

      {/* Diagram */}
      <div style={{ flex: 1 }}>
        <SpecDiagram resolved={resolved} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: dev 서버로 시각 확인**

Run: `pnpm dev`
Expected: 브라우저에서 다이어그램 렌더링 확인. 드롭다운으로 4개 데이터셋 전환 가능.

확인 체크리스트:
- Order BC (base): 모든 노드가 gray border, 상태 배지 없음, StatsBar 숨김
- Order BC + Cancel: green(new), amber(modified), red(affected) 노드 혼재, StatsBar 표시
- LMS BC: 35 노드, 4개 레이어 swimlane 배경, 의존 방향이 위→아래
- SCM Hub BC: domain 레이어에 repository 노드가 보임 (레이어 위반 시각화)

- [ ] **Step 3: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 4: 전체 테스트**

Run: `pnpm test -- --run`
Expected: 모든 테스트 통과

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add dev entry point with dataset selector and SpecDiagram"
```

---

### Task 10: 최종 확인 및 빌드 검증

**Files:** (수정 없음 — 검증만)

- [ ] **Step 1: 프로덕션 빌드**

Run: `pnpm build`
Expected: `dist/` 생성, 에러 없음

- [ ] **Step 2: 전체 테스트 + 타입 체크**

Run: `pnpm type-check && pnpm test -- --run`
Expected: 모두 통과

- [ ] **Step 3: 최종 시각 확인**

Run: `pnpm dev`
Expected: 4개 데이터셋 모두 정상 렌더링

- [ ] **Step 4: Commit (빌드 설정 누락 파일 있으면)**

```bash
git status
# 변경사항이 있으면 커밋
```
