# Phase 3: 사이드 패널 + 필터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 더블클릭 시 사이드 패널에 노드 상세 표시 + 필터 툴바로 ChangeStatus별 노드 표시/숨김 제어.

**Architecture:** SpecDiagram이 detailNodeId 상태를 관리. 더블클릭 시 DetailPanel이 오른쪽에 슬라이드 표시. FilterToolbar가 상단에 ChangeStatus 토글 버튼을 제공하여 노드/엣지 필터링.

**Tech Stack:** React 18, @xyflow/react 12, 기존 컴포넌트

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/components/DetailPanel.tsx` | 노드 상세 사이드 패널 |
| Create | `src/components/FilterToolbar.tsx` | ChangeStatus 필터 토글 |
| Modify | `src/components/SpecDiagram.tsx` | detailNodeId 상태 + 필터 상태 + 레이아웃 조정 |
| Modify | `src/components/DddLayerNode.tsx` | 펼침 관련 코드 제거 (사이드 패널로 교체) |

---

### Task 1: DetailPanel 컴포넌트

**Files:**
- Create: `src/components/DetailPanel.tsx`

- [ ] **Step 1: DetailPanel.tsx 작성**

노드의 전체 상세를 보여주는 오른쪽 사이드 패널. 내용:
- 헤더: 타입 + 이름 + 상태 배지
- description
- operations 전체 목록
- changes
- modifiedMembers (added/changed/removed)
- reviewPoints (severity별 색상)
- codeMapping (파일 경로, 클래스명)
- 닫기 버튼

```typescript
// src/components/DetailPanel.tsx
import { memo } from "react";
import type { ResolvedNode } from "../types/spec-metadata";
import { STATUS_COLORS, LAYER_COLORS, TYPE_LABELS } from "../styles/theme";

interface DetailPanelProps {
  node: ResolvedNode;
  onClose: () => void;
}

function DetailPanelInner({ node, onClose }: DetailPanelProps) {
  const statusColor = STATUS_COLORS[node.status];
  const layerColor = LAYER_COLORS[node.layer];

  return (
    <div
      style={{
        width: 340,
        height: "100%",
        background: "#1e293b",
        borderLeft: "1px solid #334155",
        overflow: "auto",
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: 12,
        color: "#e2e8f0",
        flexShrink: 0,
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: layerColor.accent, textTransform: "uppercase", fontWeight: 600 }}>
              {TYPE_LABELS[node.type]}
            </span>
            {node.status !== "existing" && (
              <span style={{ fontSize: 9, background: statusColor.badge, color: statusColor.text, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                {node.status}
              </span>
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{node.label}</div>
          {node.subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{node.subtitle}</div>}
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Description */}
        {node.description && (
          <Section title="Description">
            <div style={{ color: "#cbd5e1", lineHeight: 1.6 }}>{node.description}</div>
          </Section>
        )}

        {/* Operations */}
        {node.operations && node.operations.length > 0 && (
          <Section title="Operations">
            {node.operations.map((op, i) => (
              <div key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "#cbd5e1", lineHeight: 1.8, wordBreak: "break-all" }}>{op}</div>
            ))}
          </Section>
        )}

        {/* Changes */}
        {node.changes.length > 0 && (
          <Section title="Changes">
            {node.changes.map((ch, i) => (
              <div key={i} style={{ color: statusColor.text, lineHeight: 1.6 }}>• {ch}</div>
            ))}
          </Section>
        )}

        {/* Modified Members */}
        {node.modifiedMembers && (
          <Section title="Modified Members">
            {node.modifiedMembers.added?.map((m, i) => (
              <div key={`a-${i}`} style={{ fontFamily: "monospace", fontSize: 11, color: STATUS_COLORS.new.text, lineHeight: 1.6 }}>+ {m}</div>
            ))}
            {node.modifiedMembers.changed?.map((m, i) => (
              <div key={`c-${i}`} style={{ fontFamily: "monospace", fontSize: 11, color: STATUS_COLORS.modified.text, lineHeight: 1.6 }}>~ {m}</div>
            ))}
            {node.modifiedMembers.removed?.map((m, i) => (
              <div key={`r-${i}`} style={{ fontFamily: "monospace", fontSize: 11, color: STATUS_COLORS.affected.text, lineHeight: 1.6, textDecoration: "line-through" }}>- {m}</div>
            ))}
          </Section>
        )}

        {/* Review Points */}
        {node.reviewPoints.length > 0 && (
          <Section title={`Review Points (${node.reviewPoints.length})`}>
            {node.reviewPoints.map((rp, i) => {
              const sevColor = rp.severity === "critical" ? "#f87171" : rp.severity === "warning" ? "#fbbf24" : "#94a3b8";
              return (
                <div key={i} style={{ marginBottom: 8, lineHeight: 1.5 }}>
                  <span style={{ fontSize: 9, color: sevColor, textTransform: "uppercase", fontWeight: 600 }}>
                    {rp.severity ?? "info"}
                  </span>
                  <div style={{ color: "#cbd5e1", marginTop: 2 }}>{rp.message}</div>
                  {rp.ruleRef && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Rule: {rp.ruleRef}</div>}
                </div>
              );
            })}
          </Section>
        )}

        {/* Code Mapping */}
        {node.codeMapping && (
          <Section title="Code Mapping">
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8", lineHeight: 1.8, wordBreak: "break-all" }}>
              <div>{node.codeMapping.filePath}</div>
              <div style={{ color: "#cbd5e1" }}>{node.codeMapping.className}</div>
              {node.codeMapping.packageName && <div>{node.codeMapping.packageName}</div>}
              {node.codeMapping.annotations && node.codeMapping.annotations.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {node.codeMapping.annotations.map((a, i) => (
                    <span key={i} style={{ background: "#0f172a", padding: "1px 5px", borderRadius: 3, marginRight: 4, fontSize: 9 }}>{a}</span>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export const DetailPanel = memo(DetailPanelInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/DetailPanel.tsx
git commit -m "feat: add DetailPanel component for node detail side panel"
```

---

### Task 2: FilterToolbar 컴포넌트

**Files:**
- Create: `src/components/FilterToolbar.tsx`

- [ ] **Step 1: FilterToolbar.tsx 작성**

ChangeStatus별 토글 버튼. 활성화된 상태의 노드만 표시.

```typescript
// src/components/FilterToolbar.tsx
import { memo } from "react";
import type { ChangeStatus, ResolvedGraph } from "../types/spec-metadata";
import { STATUS_COLORS } from "../styles/theme";

interface FilterToolbarProps {
  stats: ResolvedGraph["stats"];
  activeFilters: Set<ChangeStatus>;
  onToggle: (status: ChangeStatus) => void;
}

const FILTER_ORDER: ChangeStatus[] = ["new", "modified", "affected", "deprecated", "existing"];

function FilterToolbarInner({ stats, activeFilters, onToggle }: FilterToolbarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "#0f172a", borderBottom: "1px solid #1e293b", fontSize: 11, fontFamily: "'Segoe UI', sans-serif" }}>
      <span style={{ color: "#64748b", fontSize: 10, marginRight: 4 }}>Filter:</span>
      {FILTER_ORDER.map((status) => {
        const count = stats[status];
        if (count === 0) return null;
        const color = STATUS_COLORS[status];
        const isActive = activeFilters.has(status);
        return (
          <button
            key={status}
            onClick={() => onToggle(status)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 4,
              border: `1px solid ${isActive ? color.border : "#334155"}`,
              background: isActive ? `${color.border}22` : "transparent",
              color: isActive ? color.text : "#64748b",
              cursor: "pointer",
              fontSize: 11,
              transition: "all 0.15s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? color.border : "#475569" }} />
            {count} {status}
          </button>
        );
      })}
    </div>
  );
}

export const FilterToolbar = memo(FilterToolbarInner);
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterToolbar.tsx
git commit -m "feat: add FilterToolbar component for change status filtering"
```

---

### Task 3: SpecDiagram 통합 — 사이드 패널 + 필터

**Files:**
- Modify: `src/components/SpecDiagram.tsx`

- [ ] **Step 1: SpecDiagram에 detailNodeId + 필터 상태 추가**

변경 사항:
1. Import DetailPanel, FilterToolbar
2. `detailNodeId` 상태 추가 (더블클릭 시 세팅)
3. `activeFilters` 상태 추가 (기본: 모든 상태 활성)
4. 더블클릭 핸들러: detailNodeId 토글
5. 필터: activeFilters에 없는 상태의 노드/엣지를 숨김
6. 레이아웃: 사이드 패널이 열리면 다이어그램 영역이 줄어듦 (flex)

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/SpecDiagram.tsx
git commit -m "feat: integrate DetailPanel and FilterToolbar into SpecDiagram"
```

---

### Task 4: DddLayerNode 정리 — 펼침 코드 제거

**Files:**
- Modify: `src/components/DddLayerNode.tsx`

- [ ] **Step 1: 노드 내부 펼침(expanded) 관련 코드 제거**

DddLayerNode에서 제거할 것:
- `isExpanded` 읽기
- `modifiedMembers`, `reviewPoints` 읽기 및 표시
- `zIndex: isExpanded ? 10 : undefined`
- `showTooltip`의 `!isExpanded` 조건 (항상 호버 시 툴팁 표시)

- [ ] **Step 2: 타입 체크**

Run: `pnpm type-check`

- [ ] **Step 3: Commit**

```bash
git add src/components/DddLayerNode.tsx
git commit -m "refactor: remove inline expand from DddLayerNode (replaced by DetailPanel)"
```

---

### Task 5: 최종 검증

- [ ] **Step 1: 전체 테스트**

Run: `pnpm test -- --run`
Expected: 모든 테스트 통과

- [ ] **Step 2: 타입 체크 + 빌드**

Run: `pnpm type-check && pnpm build`
Expected: 모두 통과

- [ ] **Step 3: Commit (누락 파일 있으면)**

```bash
git status
```
