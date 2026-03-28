# Phase 2: 인터랙션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 호버 툴팁, 싱글클릭 영향도 하이라이트, 더블클릭 리치 노드 펼침을 구현하여 다이어그램에 인터랙션을 추가한다.

**Architecture:** SpecDiagram에 상태 관리(selectedNodeId, expandedNodeIds)를 추가하고, DddLayerNode/DddEdge가 이 상태에 반응하여 하이라이트/펼침을 표현. analyzeImpact()를 연동하여 싱글클릭 시 영향 범위를 시각화.

**Tech Stack:** React 18, @xyflow/react 12, 기존 analyzeImpact() 함수

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/components/NodeTooltip.tsx` | 호버 시 보여줄 툴팁 (description, operations) |
| Modify | `src/components/DddLayerNode.tsx` | 호버/클릭/더블클릭 이벤트 핸들링 + 리치 펼침 모드 |
| Modify | `src/components/DddEdge.tsx` | 영향도 하이라이트 상태 반영 |
| Modify | `src/components/SpecDiagram.tsx` | 상태 관리 (selected, expanded, impact) + 이벤트 라우팅 |
| Create | `src/__tests__/interactions.test.ts` | analyzeImpact 연동 테스트 |

---

### Task 1: SpecDiagram 상태 관리 추가

**Files:**
- Modify: `src/components/SpecDiagram.tsx`

- [ ] **Step 1: SpecDiagram에 인터랙션 상태 추가**

SpecDiagram.tsx에 다음 상태와 콜백을 추가한다:

```typescript
// src/components/SpecDiagram.tsx 상단에 추가
import { useState, useCallback, useMemo } from "react";
import { analyzeImpact } from "../core/resolve-graph";
```

컴포넌트 내부에 상태 추가:

```typescript
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

// 싱글클릭 → 영향도 분석
const impactResult = useMemo(() => {
  if (!selectedNodeId) return null;
  return analyzeImpact(resolved, selectedNodeId);
}, [resolved, selectedNodeId]);

// 노드 싱글클릭 핸들러
const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string }) => {
  setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
}, []);

// 노드 더블클릭 핸들러
const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: { id: string }) => {
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

// 배경 클릭 → 선택 해제
const onPaneClick = useCallback(() => {
  setSelectedNodeId(null);
}, []);
```

useGraphLayout 호출 이후, 노드/엣지에 인터랙션 데이터를 주입:

```typescript
// 기존 nodes/edges에 인터랙션 상태 주입
const interactiveNodes = useMemo(() =>
  nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isSelected: node.id === selectedNodeId,
      isImpacted: impactResult?.impactedNodeIds.has(node.id) ?? false,
      isExpanded: expandedNodeIds.has(node.id),
      isDimmed: selectedNodeId != null
        && node.id !== selectedNodeId
        && !(impactResult?.impactedNodeIds.has(node.id) ?? false),
    },
  })),
  [nodes, selectedNodeId, impactResult, expandedNodeIds]
);

const interactiveEdges = useMemo(() =>
  edges.map((edge) => {
    const edgeKey = `${edge.source}→${edge.target}`;
    return {
      ...edge,
      data: {
        ...edge.data,
        isHighlighted: impactResult?.impactedEdgeKeys.has(edgeKey) ?? false,
        isDimmed: selectedNodeId != null
          && !(impactResult?.impactedEdgeKeys.has(edgeKey) ?? false),
      },
    };
  }),
  [edges, selectedNodeId, impactResult]
);
```

ReactFlow에 이벤트 핸들러와 interactiveNodes/interactiveEdges를 연결:

```typescript
<ReactFlow
  nodes={interactiveNodes}
  edges={interactiveEdges}
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}
  onNodeClick={onNodeClick}
  onNodeDoubleClick={onNodeDoubleClick}
  onPaneClick={onPaneClick}
  fitView
  fitViewOptions={{ padding: 0.2 }}
  minZoom={0.1}
  maxZoom={2}
  proOptions={proOptions}
  nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={true}
>
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`
Expected: 에러 없이 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/SpecDiagram.tsx
git commit -m "feat: add interaction state management to SpecDiagram"
```

---

### Task 2: NodeTooltip 컴포넌트

**Files:**
- Create: `src/components/NodeTooltip.tsx`

- [ ] **Step 1: NodeTooltip.tsx 작성**

```typescript
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
      {/* 타입 + 상태 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: layerColor.accent, fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>
          {node.type.replace("_", " ")}
        </span>
        {node.status !== "existing" && (
          <span style={{ fontSize: 10, color: statusColor.text, fontWeight: 600 }}>
            {node.status}
          </span>
        )}
      </div>

      {/* 이름 */}
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {node.label}
      </div>

      {/* 설명 */}
      {node.description && (
        <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>
          {node.description}
        </div>
      )}

      {/* 오퍼레이션 */}
      {node.operations && node.operations.length > 0 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 6, marginTop: 4 }}>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Operations</div>
          {node.operations.slice(0, 4).map((op, i) => (
            <div key={i} style={{ fontSize: 10, color: "#cbd5e1", fontFamily: "monospace", lineHeight: 1.6 }}>
              {op}
            </div>
          ))}
          {node.operations.length > 4 && (
            <div style={{ fontSize: 10, color: "#64748b" }}>+{node.operations.length - 4} more</div>
          )}
        </div>
      )}

      {/* 변경 사항 */}
      {node.changes.length > 0 && (
        <div style={{ borderTop: "1px solid #334155", paddingTop: 6, marginTop: 4 }}>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Changes</div>
          {node.changes.map((ch, i) => (
            <div key={i} style={{ fontSize: 10, color: statusColor.text, lineHeight: 1.5 }}>
              • {ch}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const NodeTooltip = memo(NodeTooltipInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/NodeTooltip.tsx
git commit -m "feat: add NodeTooltip component for hover information display"
```

---

### Task 3: DddLayerNode에 인터랙션 시각 효과 추가

**Files:**
- Modify: `src/components/DddLayerNode.tsx`

- [ ] **Step 1: DddLayerNode 수정 — 호버/선택/영향도/펼침 시각 효과**

DddLayerNode.tsx를 수정하여:
1. `isSelected`, `isImpacted`, `isDimmed`, `isExpanded` 데이터를 읽음
2. 호버 시 마우스 좌표를 추적하여 NodeTooltip 표시
3. 선택된 노드는 밝은 glow 효과
4. 영향 받는 노드는 border 강조
5. dimmed 노드는 opacity 감소
6. 더블클릭으로 expanded 상태면 리치 모드 표시 (modifiedMembers, reviewPoints 카운트)

```typescript
// src/components/DddLayerNode.tsx
import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DddNodeData } from "../hooks/useGraphLayout";
import { STATUS_COLORS, LAYER_COLORS, TYPE_LABELS } from "../styles/theme";
import { NodeTooltip } from "./NodeTooltip";

function DddLayerNodeInner({ data }: NodeProps) {
  const nodeData = data as unknown as DddNodeData & {
    isSelected?: boolean;
    isImpacted?: boolean;
    isDimmed?: boolean;
    isExpanded?: boolean;
  };
  const statusColor = STATUS_COLORS[nodeData.status];
  const layerColor = LAYER_COLORS[nodeData.layer];
  const typeLabel = TYPE_LABELS[nodeData.type];
  const isAggregate = nodeData.type === "aggregate";
  const isNew = nodeData.status === "new";
  const isDeprecated = nodeData.status === "deprecated";

  // 호버 상태
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const onMouseEnter = useCallback((e: React.MouseEvent) => {
    setHoverPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setHoverPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  // 시각 효과
  const opacity = nodeData.isDimmed ? 0.3 : 1;
  const boxShadow = nodeData.isSelected
    ? `0 0 12px ${statusColor.border}66`
    : nodeData.isImpacted
      ? `0 0 8px ${STATUS_COLORS.affected.border}44`
      : "none";
  const borderColor = nodeData.isImpacted && !nodeData.isSelected
    ? STATUS_COLORS.affected.border
    : statusColor.border;
  const borderWidth = nodeData.isSelected || nodeData.isImpacted
    ? 2
    : isAggregate ? 2 : 1;

  // 리치 모드 데이터
  const hasModifiedMembers = nodeData.modifiedMembers &&
    ((nodeData.modifiedMembers.added?.length ?? 0) +
     (nodeData.modifiedMembers.changed?.length ?? 0) +
     (nodeData.modifiedMembers.removed?.length ?? 0)) > 0;
  const reviewCount = nodeData.reviewPoints?.length ?? 0;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          background: "#1e293b",
          border: `${borderWidth}px ${isNew ? "dashed" : "solid"} ${borderColor}`,
          borderRadius: 6,
          padding: "8px 12px",
          minWidth: 140,
          fontFamily: "'Segoe UI', sans-serif",
          position: "relative",
          opacity,
          boxShadow,
          transition: "opacity 0.2s, box-shadow 0.2s, border-color 0.2s",
          cursor: "pointer",
        }}
      >
        {/* 타입 라벨 + 상태 배지 */}
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

        {/* 이름 */}
        <div style={{ fontSize: 12, fontWeight: 700, color: isDeprecated ? "#6b7280" : "#e2e8f0", textDecoration: isDeprecated ? "line-through" : "none", lineHeight: 1.3 }}>
          {nodeData.label}
        </div>

        {/* subtitle */}
        {nodeData.subtitle && (
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            {nodeData.subtitle}
          </div>
        )}

        {/* 리치 모드 (더블클릭 펼침) */}
        {nodeData.isExpanded && (hasModifiedMembers || reviewCount > 0) && (
          <div style={{ borderTop: "1px solid #334155", paddingTop: 6, marginTop: 6, fontSize: 9 }}>
            {nodeData.modifiedMembers?.added?.map((m, i) => (
              <div key={`a-${i}`} style={{ color: STATUS_COLORS.new.text }}>+ {m}</div>
            ))}
            {nodeData.modifiedMembers?.changed?.map((m, i) => (
              <div key={`c-${i}`} style={{ color: STATUS_COLORS.modified.text }}>~ {m}</div>
            ))}
            {nodeData.modifiedMembers?.removed?.map((m, i) => (
              <div key={`r-${i}`} style={{ color: STATUS_COLORS.affected.text, textDecoration: "line-through" }}>- {m}</div>
            ))}
            {reviewCount > 0 && (
              <div style={{ color: "#fb7185", marginTop: 4 }}>
                ⚠ {reviewCount} review point{reviewCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

      {/* 툴팁 */}
      {hoverPos && !nodeData.isExpanded && (
        <NodeTooltip node={nodeData} x={hoverPos.x} y={hoverPos.y} />
      )}
    </>
  );
}

export const DddLayerNode = memo(DddLayerNodeInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/DddLayerNode.tsx
git commit -m "feat: add hover tooltip, selection glow, impact highlight, and rich expand to DddLayerNode"
```

---

### Task 4: DddEdge 영향도 하이라이트

**Files:**
- Modify: `src/components/DddEdge.tsx`

- [ ] **Step 1: DddEdge 수정 — 영향도 하이라이트/dimmed 반영**

DddEdge.tsx의 DddEdgeInner 함수를 수정:

```typescript
function DddEdgeInner(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const edgeData = data as unknown as ResolvedEdge & {
    isHighlighted?: boolean;
    isDimmed?: boolean;
  };

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const edgeType = edgeData?.type ?? "depends_on";
  const status = edgeData?.status ?? "existing";
  const statusColor = STATUS_COLORS[status];

  const isDashed = edgeType === "publishes" || edgeType === "subscribes" || edgeType === "implements";
  const isNew = status === "new";

  // 영향도 하이라이트 적용
  const isHighlighted = edgeData?.isHighlighted ?? false;
  const isDimmed = edgeData?.isDimmed ?? false;

  const strokeColor = isHighlighted
    ? STATUS_COLORS.affected.border
    : status === "existing" ? "#475569" : statusColor.border;
  const strokeWidth = isHighlighted ? 2.5 : status === "existing" ? 1 : 1.5;
  const strokeDasharray = isDashed || isNew ? "6 3" : undefined;
  const opacity = isDimmed ? 0.15 : 1;

  const label = edgeData?.method ?? edgeData?.label;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity,
          transition: "opacity 0.2s, stroke 0.2s, stroke-width 0.2s",
        }}
        markerEnd={`url(#marker-${edgeType}-${status})`}
      />
      {label && !isDimmed && (
        <EdgeLabelRenderer>
          <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, fontSize: 9, color: "#94a3b8", background: "#0f172a", padding: "1px 4px", borderRadius: 2, pointerEvents: "none", whiteSpace: "nowrap", opacity }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/DddEdge.tsx
git commit -m "feat: add impact highlight and dimming to DddEdge"
```

---

### Task 5: 통합 테스트 + 최종 검증

**Files:**
- Create: `src/__tests__/interactions.test.ts`

- [ ] **Step 1: 인터랙션 연동 테스트**

```typescript
// src/__tests__/interactions.test.ts
import { describe, it, expect } from "vitest";
import { resolveGraph, analyzeImpact } from "../core/resolve-graph";
import { computeLayout } from "../hooks/useGraphLayout";
import { orderBoundedContext } from "../examples/order-bc-graph";
import { cancelOrderChangeSet } from "../examples/cancel-order-changeset";

describe("interaction: impact analysis with layout", () => {
  it("order-ctrl 선택 시 연결된 노드가 impactedNodeIds에 포함된다", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const impact = analyzeImpact(resolved, "order-ctrl");

    expect(impact.impactedNodeIds.has("order-ctrl")).toBe(true);
    expect(impact.impactedNodeIds.has("create-order-uc")).toBe(true);
    expect(impact.impactedNodeIds.has("get-order-uc")).toBe(true);
  });

  it("ChangeSet 적용 후 cancel-order-uc 선택 시 영향 범위가 올바르다", () => {
    const resolved = resolveGraph(orderBoundedContext, cancelOrderChangeSet);
    const impact = analyzeImpact(resolved, "cancel-order-uc");

    expect(impact.impactedNodeIds.has("cancel-order-uc")).toBe(true);
    expect(impact.impactedNodeIds.has("order-agg")).toBe(true);
    expect(impact.impactedNodeIds.has("order-repo")).toBe(true);
  });

  it("layout 결과의 노드에 인터랙션 데이터를 주입할 수 있다", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { nodes } = computeLayout(resolved);
    const impact = analyzeImpact(resolved, "order-ctrl");

    const enriched = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isSelected: node.id === "order-ctrl",
        isImpacted: impact.impactedNodeIds.has(node.id),
        isDimmed: node.id !== "order-ctrl" && !impact.impactedNodeIds.has(node.id),
      },
    }));

    const selected = enriched.find((n) => n.id === "order-ctrl");
    expect(selected?.data.isSelected).toBe(true);
    expect(selected?.data.isDimmed).toBe(false);

    // 영향받는 노드
    const impacted = enriched.find((n) => n.id === "create-order-uc");
    expect(impacted?.data.isImpacted).toBe(true);
    expect(impacted?.data.isDimmed).toBe(false);

    // 영향 없는 노드
    const dimmed = enriched.find((n) => n.id === "inventory-adapter");
    expect(dimmed?.data.isDimmed).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm test -- --run`
Expected: 모든 테스트 통과 (기존 4개 + 새 3개 = 7개)

- [ ] **Step 3: 전체 검증**

Run: `pnpm type-check && pnpm build`
Expected: 모두 통과

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/interactions.test.ts
git commit -m "test: add interaction integration tests for impact analysis"
```
