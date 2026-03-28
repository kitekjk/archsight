# Phase 1: 정적 렌더링 — 설계 문서

## 목표

ResolvedGraph 데이터를 React Flow + dagre로 시각화하여, DDD 레이어별 swimlane 위에 노드와 엣지를 렌더링한다. 인터랙션 없이 정적 다이어그램만 구현한다.

## 결정 사항 (확정)

| 항목 | 결정 |
|------|------|
| 레이아웃 방향 | 위→아래 (TB). dagre `rankdir: "TB"` |
| 노드 디자인 | 컴팩트: 타입 라벨 + 이름 + subtitle + 상태 배지 |
| 노드 인터랙션 | Phase 1에서는 없음 (Phase 2에서 호버→툴팁, 싱글클릭→영향도, 더블클릭→리치 펼침) |
| 색상 체계 | existing=gray, new=green+dashed, modified=amber, affected=red, deprecated=strikethrough |
| 엣지 스타일 | invokes=실선, publishes/subscribes=점선, implements=점선+삼각, creates=실선+다이아, depends_on=실선 |
| 진입점 | dev 서버에서 테스트 데이터 선택 드롭다운으로 전환 |

## 컴포넌트 구조

```
src/
├── components/
│   ├── SpecDiagram.tsx        # 메인 다이어그램 (React Flow 래퍼)
│   ├── DddLayerNode.tsx       # 커스텀 노드 — 컴팩트 렌더링
│   ├── DddEdge.tsx            # 커스텀 엣지 — 타입별 스타일
│   ├── LayerBackground.tsx    # 레이어 swimlane 배경
│   └── StatsBar.tsx           # 상단 변경 통계 카드
├── hooks/
│   └── useGraphLayout.ts      # dagre 레이아웃 계산
├── styles/
│   └── theme.ts               # 색상/스타일 상수
└── App.tsx                    # 개발용 진입점
```

## 데이터 흐름

```
ResolvedGraph (입력)
  │
  ▼
useGraphLayout(resolved)
  │  - dagre.graphlib.Graph 생성
  │  - 레이어별 rank 제약 (같은 layer → 같은 rank)
  │  - 노드 크기 추정 (label 길이 기반)
  │  - dagre.layout() 실행
  │  - React Flow Node[] / Edge[] 변환
  │
  ▼
SpecDiagram
  │  - <ReactFlow nodes={nodes} edges={edges} />
  │  - nodeTypes: { ddd: DddLayerNode }
  │  - edgeTypes: { ddd: DddEdge }
  │  - <LayerBackground layers={layers} nodePositions={...} />
  │  - <StatsBar stats={resolved.stats} />
  │
  ▼
화면 렌더링
```

## 컴포넌트 상세

### SpecDiagram.tsx

메인 컨테이너. React Flow를 감싸고 커스텀 노드/엣지 타입을 등록한다.

**Props:**
```typescript
interface SpecDiagramProps {
  resolved: ResolvedGraph;
}
```

**동작:**
- `useGraphLayout(resolved)` 호출로 노드/엣지 배열 획득
- React Flow의 `fitView`로 전체 다이어그램이 뷰포트에 맞춰짐
- 배경은 `LayerBackground`로 레이어 영역 표시
- 줌/패닝은 React Flow 기본 동작 사용

### DddLayerNode.tsx

커스텀 노드. 컴팩트 디자인.

**표시 요소:**
- 상단: DDD 타입 라벨 (controller, usecase, aggregate, ...) — 레이어 색상
- 중앙: label (컴포넌트 이름) — bold
- 하단: subtitle (있는 경우)
- 우상단: ChangeStatus 배지 (new, modified, affected, deprecated)
- border: ChangeStatus에 따른 색상 + 스타일 (new=dashed, deprecated=strikethrough 효과)

**크기:**
- 너비: 160px 고정 (label이 긴 경우 180px)
- 높이: subtitle 유무에 따라 60px 또는 76px

**Aggregate Root 구분:**
- aggregate 타입은 border 2px, 나머지는 1px
- entity, value_object는 Phase 1에서 일반 노드로 표시 (Phase 3에서 접힘/펼침)

### DddEdge.tsx

커스텀 엣지. EdgeType에 따른 시각 차이.

| EdgeType | 선 스타일 | 화살표 | 라벨 |
|----------|----------|--------|------|
| invokes | 실선 | 일반 삼각 | method명 (있으면) |
| publishes | 점선 | 일반 삼각 | label (있으면) |
| subscribes | 점선 | 역방향 삼각 | label |
| implements | 점선 | 빈 삼각 | - |
| creates | 실선 | 다이아몬드 | - |
| depends_on | 실선 (연한) | 일반 삼각 | label |

**ChangeStatus 적용:**
- existing 엣지: 연한 gray
- new 엣지: green + dashed (추가)
- modified: amber
- affected: red

### LayerBackground.tsx

레이어 swimlane 배경 영역. React Flow의 커스텀 배경으로 구현.

**동작:**
- dagre 레이아웃 결과에서 각 레이어에 속한 노드들의 y 범위를 계산
- 레이어별로 반투명 배경 사각형 + 레이어 라벨을 렌더링
- 레이어 간 간격은 dagre의 ranksep으로 자연스럽게 확보

**레이어 색상:**
- presentation: indigo 계열 (rgba(99,102,241,0.08))
- application: green 계열 (rgba(34,197,94,0.06))
- domain: amber 계열 (rgba(251,191,36,0.06))
- infrastructure: rose 계열 (rgba(244,63,94,0.06))

### StatsBar.tsx

다이어그램 상단에 표시되는 변경 통계.

**표시:**
- `existing: N` / `new: N` / `modified: N` / `affected: N` / `deprecated: N`
- 각각 해당 색상으로 표시
- ChangeSet이 없으면 (모두 existing) 숨김

### useGraphLayout.ts

ResolvedGraph → React Flow 노드/엣지 배열 변환 훅.

**dagre 설정:**
```typescript
const g = new dagre.graphlib.Graph();
g.setGraph({
  rankdir: "TB",
  ranksep: 80,    // 레이어 간 세로 간격
  nodesep: 40,    // 같은 레이어 내 가로 간격
  edgesep: 20,
  marginx: 40,
  marginy: 40,
});
```

**레이어 rank 제약:**
- 같은 DddLayer의 노드들은 같은 rank에 배치
- presentation=0, application=1, domain=2, infrastructure=3
- dagre의 `rank` 속성으로 제약 (fallback: invisible edge로 순서 강제)

**노드 크기 추정:**
- 너비: `Math.max(160, label.length * 9 + 40)`
- 높이: subtitle이 있으면 76, 없으면 60

### theme.ts

색상/스타일 상수.

```typescript
// ChangeStatus → 색상
export const STATUS_COLORS = {
  existing: { border: "#6b7280", bg: "#374151", text: "#9ca3af" },
  new:      { border: "#22c55e", bg: "#064e3b", text: "#4ade80" },
  modified: { border: "#f59e0b", bg: "#78350f", text: "#fbbf24" },
  affected: { border: "#ef4444", bg: "#7f1d1d", text: "#f87171" },
  deprecated: { border: "#6b7280", bg: "#1f2937", text: "#6b7280" },
};

// DddLayer → 색상
export const LAYER_COLORS = {
  presentation:   { accent: "#818cf8", bg: "rgba(99,102,241,0.08)" },
  application:    { accent: "#4ade80", bg: "rgba(34,197,94,0.06)" },
  domain:         { accent: "#fbbf24", bg: "rgba(251,191,36,0.06)" },
  infrastructure: { accent: "#fb7185", bg: "rgba(244,63,94,0.06)" },
};

// DddComponentType → 아이콘/라벨
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
```

## 개발용 진입점 (App.tsx)

```
┌─────────────────────────────────────────────┐
│ archsight                                    │
│ ┌─────────────────────────────┐              │
│ │ Select: Order BC ▾          │              │
│ └─────────────────────────────┘              │
│   Options:                                   │
│   - Order BC (base only)                     │
│   - Order BC + Cancel ChangeSet              │
│   - LMS BC                                   │
│   - SCM Hub BC                               │
│ ┌───────────────────────────────────────────┐│
│ │                                           ││
│ │     SpecDiagram (React Flow)              ││
│ │                                           ││
│ └───────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## 테스트 전략

- Storybook 스토리: 4개 데이터셋 × SpecDiagram
- 수동 확인: `pnpm dev`로 브라우저에서 시각 확인
- 단위 테스트: useGraphLayout만 (입력 → 출력 노드 수/위치 범위 검증)

## Phase 1 범위 외 (Phase 2~3)

- 호버 툴팁, 싱글클릭 영향도, 더블클릭 리치 펼침 → Phase 2
- 필터 툴바, Entity/VO 접힘/펼침, 사이드 상세 패널 → Phase 3
- IDE extension shell → Phase 4+
