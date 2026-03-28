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
│   │   └── spec-metadata.ts          # 핵심 타입 정의
│   ├── core/
│   │   └── resolve-graph.ts          # base + diff 머지 + 영향도 분석
│   ├── examples/
│   │   ├── order-bc-graph.ts         # Order 모듈 예시
│   │   ├── cancel-order-changeset.ts # 주문 취소 ChangeSet 예시
│   │   ├── lms-bc-graph.ts           # LMS BC 예시 (교과서적 DDD)
│   │   └── scmhub-bc-graph.ts        # SCM Hub BC 예시 (혼합 아키텍처)
│   ├── components/
│   │   ├── SpecDiagram.tsx           # 메인 다이어그램 (React Flow 래퍼)
│   │   ├── DddLayerNode.tsx          # 커스텀 노드 (컴팩트 디자인)
│   │   ├── DddEdge.tsx              # 커스텀 엣지 (타입별 스타일)
│   │   ├── LayerBackground.tsx       # DDD 레이어 swimlane 배경
│   │   ├── StatsBar.tsx              # 변경 통계 카드
│   │   ├── NodeTooltip.tsx           # 호버 툴팁
│   │   ├── DetailPanel.tsx           # 노드 상세 사이드 패널
│   │   └── FilterToolbar.tsx         # ChangeStatus 필터 토글
│   ├── hooks/
│   │   └── useGraphLayout.ts         # dagre 레이아웃 계산
│   ├── styles/
│   │   └── theme.ts                  # 색상/스타일 상수
│   ├── __tests__/
│   │   ├── useGraphLayout.test.ts    # 레이아웃 단위 테스트
│   │   └── interactions.test.ts      # 인터랙션 통합 테스트
│   ├── App.tsx                       # 개발용 진입점
│   ├── main.tsx                      # React 엔트리
│   └── index.ts                      # 패키지 export
├── docs/superpowers/
│   ├── specs/                        # 설계 문서
│   └── plans/                        # 구현 계획
├── .claude/
│   └── skills/
│       └── archsight.md              # Claude Code skill
├── CLAUDE.md                         # 이 파일
├── index.html                        # Vite dev 서버 HTML
├── vite.config.ts                    # Vite 설정
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

### Phase 1: 정적 렌더링 — 완료
- [x] pnpm install + Vite dev 서버 세팅
- [x] 테마 상수 (`src/styles/theme.ts`) — 색상, 라벨, 노드 크기
- [x] useGraphLayout 훅 (`src/hooks/useGraphLayout.ts`) — dagre 레이아웃 + 레이어 정렬
- [x] DddLayerNode 커스텀 노드 — 컴팩트 디자인 (타입+이름+subtitle+상태배지)
- [x] DddEdge 커스텀 엣지 — 타입별 선/화살표 스타일 + SVG 마커
- [x] StatsBar — 변경 통계 카드
- [x] LayerBackground — DDD 레이어 swimlane 배경
- [x] SpecDiagram — 메인 다이어그램 (React Flow 래퍼)
- [x] App.tsx — 개발용 진입점 (4개 데이터셋 드롭다운)

### Phase 2: 인터랙션 — 완료
- [x] 호버 → NodeTooltip (description, operations, changes)
- [x] 싱글클릭 → 1-hop 영향도 하이라이트 (직접 연결된 노드/엣지만 강조)
- [x] 배경 클릭 → 선택 해제
- [x] 인터랙션 통합 테스트

### Phase 3: 사이드 패널 + 필터 — 완료
- [x] DetailPanel — 더블클릭 시 오른쪽 사이드 패널 (모든 상세 정보)
- [x] FilterToolbar — ChangeStatus별 토글 필터
- [x] SpecDiagram 통합 (필터링 + 패널 + 레이아웃)

### 기존 완료
- [x] 메타데이터 타입 정의 (`spec-metadata.ts`)
- [x] resolveGraph 머지 로직 (`resolve-graph.ts`)
- [x] analyzeImpact 영향도 분석 (`resolve-graph.ts`)
- [x] Order 모듈 예시 데이터 (`order-bc-graph.ts`)
- [x] 주문 취소 ChangeSet 예시 (`cancel-order-changeset.ts`)
- [x] LMS BC 테스트 데이터 (`lms-bc-graph.ts`) — 교과서적 DDD 구조
- [x] SCM Hub BC 테스트 데이터 (`scmhub-bc-graph.ts`) — 혼합 아키텍처 시각화

### TODO (우선순위 순)
- [ ] AR 클릭 시 Entity/VO 펼침/접힘
- [ ] Storybook 설정 + 시연용 스토리
- [ ] README.md (오픈소스용)
- [ ] VS Code extension shell (Webview Panel)
- [ ] IntelliJ plugin shell
- [ ] 레거시 스캔: ArchRule 위반 탐지 시각화
- [ ] Gradle analyzer (Spring Boot 코드 → JSON)
- [ ] 스타일 커스터마이징 설정 UI

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
