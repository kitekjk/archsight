# archsight

> 코드베이스의 아키텍처를 시각화하고, 문제를 보이게 하는 도구.

## What is archsight

archsight는 코드베이스의 구조를 시각적으로 보여주고, 아키텍처 위반/변경 영향도를 직관적으로 인식하게 해주는 도구다.

- **레거시 분석**: 섞여있는 코드베이스를 스캔해서 "지금 어떻게 엉켜있는지"를 보여준다
- **변경 영향도**: "이 코드를 수정하면 어디에 영향이 가는지"를 시각적으로 추적한다
- **아키텍처 검수**: AI가 생성한 코드가 설계를 준수하는지 시각적으로 확인한다

DDD, Hexagonal, Layered, 또는 아키텍처 패턴이 없는 프로젝트 — 모두 지원한다.

## Architecture decisions (확정)

### Two-Layer 메타데이터 구조
- `BoundedContextGraph` = Base layer (모듈 전체의 현재 상태)
- `ChangeSet` = Diff layer (변경 오버레이)
- `resolveGraph(base, diff)` → `ResolvedGraph` (렌더링용 머지 결과)
- 하나의 모듈에 여러 ChangeSet을 만들어서 비교 가능

### 메타데이터 작성 모드 (3가지 모두 지원)
1. 사람이 직접 작성 — required 필드만으로 최소 동작
2. AI가 Spec에서 자동 생성 — 전체 필드 채움
3. 코드 분석으로 자동 추출 — Spring Boot 어노테이션 + DI 파싱

### 메타데이터 포맷
- TypeScript 타입으로 정의 → JSON으로 직렬화
- 타입 정의: `src/types/spec-metadata.ts`

### 시각화 기술
- React + SVG (React Flow 교체 가능 구조)
- dagre 레이아웃 엔진으로 노드 자동 배치
- Entity/VO는 Aggregate Root 클릭 시에만 펼침 (접힌 상태 기본)

### 변경 상태 색상 체계
- gray: existing (변경 없음)
- green + dashed border: new (새로 추가)
- amber: modified (기존 코드 수정)
- red: affected (파급 영향)
- strikethrough: deprecated (제거 예정)

### 배포 전략 — 분리 구조
1. **CLI analyzer** (Kotlin) — Gradle task로 코드 스캔 → JSON 출력
2. **Webview renderer** (React) — JSON → 시각화
3. **IDE shell** — 얇은 래퍼 (IntelliJ / VS Code 교체 가능)

## Tech stack

- **Types/Core**: TypeScript (strict mode)
- **Frontend**: React 18 + SVG → React Flow 12 전환 예정
- **Layout**: dagre
- **Code analyzer**: Kotlin + Spring (Gradle task) — 추후
- **Package manager**: pnpm
- **Test**: vitest (core), Storybook (visual)
- **Build**: vite

## Project structure

```
archsight/
├── src/
│   ├── types/
│   │   └── spec-metadata.ts          # 핵심 타입 정의 (확정)
│   ├── core/
│   │   └── resolve-graph.ts          # base + diff 머지 + 영향도 분석 (확정)
│   ├── examples/
│   │   ├── order-bc-graph.ts         # Order 모듈 예시 (확정)
│   │   └── cancel-order-changeset.ts # 주문 취소 ChangeSet 예시 (확정)
│   ├── components/                   # TODO: React 컴포넌트
│   │   ├── SpecDiagram.tsx           # 메인 다이어그램 (React Flow)
│   │   ├── DddLayerNode.tsx          # 커스텀 노드
│   │   ├── ChangeStatusBadge.tsx     # 변경 상태 배지
│   │   ├── FilterToolbar.tsx         # 필터/모드 툴바
│   │   ├── DetailPanel.tsx           # 노드 상세 (review points)
│   │   └── ImpactHighlight.tsx       # 영향도 하이라이트
│   ├── hooks/                        # TODO: React hooks
│   │   ├── useSpecParser.ts          # JSON → ResolvedGraph
│   │   ├── useImpactAnalysis.ts      # 그래프 순회 영향도
│   │   └── useChangeFilter.ts        # 필터 + 하이라이트 상태
│   └── index.ts                      # 패키지 export
├── .claude/
│   └── skills/
│       └── archsight.md              # Claude Code skill
├── CLAUDE.md                         # 이 파일
├── package.json
└── tsconfig.json
```

## Coding conventions

- TypeScript strict mode, no `any`
- 함수형 컴포넌트 + hooks
- 타입 정의에 JSDoc 주석 (타입이 곧 문서)
- kebab-case 파일명, PascalCase 컴포넌트, camelCase 함수/변수
- 노드 ID는 kebab-case: `order-ctrl`, `cancel-order-uc`

## Current status

### 완료
- [x] 메타데이터 타입 정의 (`spec-metadata.ts`)
- [x] resolveGraph 머지 로직 (`resolve-graph.ts`)
- [x] analyzeImpact 영향도 분석 (`resolve-graph.ts`)
- [x] Order 모듈 예시 데이터 (`order-bc-graph.ts`)
- [x] 주문 취소 ChangeSet 예시 (`cancel-order-changeset.ts`)
- [x] 프로토타입 시연 (React artifact 검증 완료)

### TODO (우선순위 순)
- [ ] pnpm install + 프로젝트 빌드 확인
- [ ] React Flow 기반 SpecDiagram 컴포넌트
- [ ] dagre 레이아웃 엔진 연동
- [ ] AR 클릭 시 Entity/VO 펼침/접힘
- [ ] 필터 (new/modified/affected/existing) + Impact analysis 모드
- [ ] 노드 클릭 시 상세 패널 (changes, modifiedMembers, reviewPoints)
- [ ] Storybook 설정 + 시연용 스토리
- [ ] README.md (오픈소스용)
- [ ] 레거시 스캔: ArchRule 위반 탐지 시각화
- [ ] Gradle analyzer (Spring Boot 코드 → JSON)
- [ ] VS Code extension / IntelliJ plugin shell

## Key type reference

```typescript
// 최소 노드
{ id: "order", label: "Order", type: "aggregate", layer: "domain" }

// 변경 상태
type ChangeStatus = "existing" | "new" | "modified" | "affected" | "deprecated"

// 핵심 함수
resolveGraph(base: BoundedContextGraph, diff?: ChangeSet): ResolvedGraph
analyzeImpact(resolved: ResolvedGraph, nodeId: string): { impactedNodeIds, impactedEdgeKeys }
```
