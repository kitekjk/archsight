# Skill: archsight

## When to use
이 프로젝트의 코드를 수정하거나 새 기능을 추가할 때 참조한다.

## Core principle
archsight는 "아키텍처를 보이게 하는 도구"다. 특정 아키텍처 패턴을 강제하지 않는다.
깔끔한 DDD든, 섞여있는 레거시든 — 있는 그대로 보여주고 문제를 시각적으로 인식하게 한다.

## Key constraints
- 메타데이터 타입은 `src/types/spec-metadata.ts`에 확정. 변경 시 예시(`src/examples/`)와 호환성 확인 필수.
- `resolveGraph()`는 순수 함수. 부수 효과 없이 새 객체 반환.
- React 컴포넌트는 `ResolvedGraph` 타입만 입력으로 받는다. `BoundedContextGraph`나 `ChangeSet`을 직접 참조하지 않는다.
- Entity/VO는 기본 숨김. `aggregateId`로 부모-자식 관계 표현.

## Architecture rules
1. **analyzer → JSON → renderer** 분리 유지. analyzer가 React를 import하거나, renderer가 파일시스템을 읽으면 안 된다.
2. **ChangeStatus 5가지**(existing, new, modified, affected, deprecated) = 색상 1:1 매핑. 새 상태 추가 시 색상 필수 정의.
3. **EdgeType 6가지**(invokes, publishes, subscribes, implements, creates, depends_on) = 화살표 스타일 매핑. publishes/subscribes/implements는 dashed.
4. **ReviewPoint.automatable: true** = CI 자동 검증 가능 규칙.

## Coding patterns
- 노드 ID: kebab-case (`order-ctrl`, `cancel-order-uc`)
- 타입 정의: JSDoc 주석 필수
- React hooks: `use` 접두사 (`useSpecParser`, `useImpactAnalysis`)
- Props: named interface로 정의 (인라인 타입 금지)

## Testing
- `resolveGraph()`, `analyzeImpact()`: vitest 단위 테스트. edge case(순환 참조, 고립 노드, 중복 ID) 커버
- React 컴포넌트: Storybook 스토리 우선, 자동 테스트는 후순위
