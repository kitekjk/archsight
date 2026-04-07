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

### 배포 전략 — 단일 VS Code Extension 통합
VS Code extension 하나에 스캐너 + AI 분석 + 뷰어를 통합.
1. **TypeScript 스캐너** — 소스 → 중간 포맷 JSON (사실 추출, 3초)
2. **AI 분석** — 중간 포맷 → BoundedContextGraph (Claude/Codex CLI 호출, 1~2분)
3. **React Viewer** — BoundedContextGraph → 시각화 (Webview Panel)

AI CLI (Claude Code 또는 Codex) 필수 의존성.

### 하이브리드 스캐너 전략
- **스캐너**: "무엇이 있는가" (사실 추출) → 빠르고 정확
- **AI**: "이것이 무엇인가" (DDD 판단) → 느리지만 맥락 이해
- 깨끗한 DDD (lms-demo)에서 어노테이션 없는 순수 도메인 객체도 AI가 Aggregate로 정확히 분류

## Tech stack

- **Types/Core**: TypeScript (strict mode)
- **Frontend**: React 18, React Flow 12
- **Layout**: dagre
- **Scanner**: TypeScript (regex 기반 소스 파싱)
- **Scanner (reference)**: Kotlin (scanner/ — 참고용, 추후 삭제 예정)
- **AI 분석**: Claude Code CLI / Codex CLI
- **Package manager**: pnpm
- **Test**: vitest (core), Storybook (visual)
- **Build**: vite

## Project structure

```
archsight/
├── extension/                        # VS Code extension (통합)
│   ├── src/
│   │   ├── schema/
│   │   │   └── spec-metadata.ts      # 공통 타입 정의 (계약)
│   │   ├── scanner/                  # TypeScript 스캐너
│   │   │   ├── types.ts              # ScanResult, ScannedClass (중간 포맷)
│   │   │   ├── file-collector.ts     # 소스 파일 수집
│   │   │   ├── java-parser.ts        # Java 소스 파싱
│   │   │   ├── kotlin-parser.ts      # Kotlin 소스 파싱
│   │   │   └── index.ts              # scan() 진입점
│   │   └── viewer/                   # React 시각화
│   │       ├── components/           # SpecDiagram, DddLayerNode, etc.
│   │       ├── hooks/                # useGraphLayout
│   │       ├── styles/               # theme.ts
│   │       ├── core/                 # resolve-graph.ts
│   │       ├── examples/             # 테스트 데이터 (수동 + 스캔 + AI분석)
│   │       ├── __tests__/
│   │       ├── App.tsx               # 개발용 진입점
│   │       └── main.tsx              # React 엔트리
│   ├── scripts/
│   │   ├── scan-to-json.ts           # 스캐너 실행 스크립트
│   │   └── ai-analyze.ts            # AI 분석 실행 스크립트
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── index.html
├── scanner/                          # Kotlin CLI (참고용)
├── docs/superpowers/
│   ├── specs/                        # 설계 문서
│   └── plans/                        # 구현 계획
├── .claude/
│   └── skills/
│       └── archsight.md
└── CLAUDE.md
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

### Phase 4: 스캐너 — 완료
- [x] Kotlin CLI 스캐너 (scanner/ — 참고용)
- [x] TypeScript 스캐너 (extension/src/scanner/) — 중간 포맷 추출
- [x] 하이브리드 파이프라인 검증 (TS 스캔 → AI 분석 → viewer 표시)
- [x] FilterToolbar에 레이어/타입 필터 추가
- [x] lms-demo 스캔 + AI 분석 결과 viewer 통합

### 기존 완료
- [x] 메타데이터 타입 정의 (`spec-metadata.ts`)
- [x] resolveGraph 머지 로직 (`resolve-graph.ts`)
- [x] analyzeImpact 영향도 분석 (`resolve-graph.ts`)
- [x] 테스트 데이터 6종: Order BC, Cancel ChangeSet, LMS 수동, LMS 스캔, LMS AI분석, SCM Hub

### TODO (우선순위 순)
- [ ] VS Code extension shell (Webview Panel + 스캐너 + AI CLI 통합)
- [ ] AI CLI 연동 자동화 (Claude/Codex CLI 호출)
- [ ] AR 클릭 시 Entity/VO 펼침/접힘
- [ ] 스타일 커스터마이징 설정 UI
- [ ] README.md (오픈소스용)

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
