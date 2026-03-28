# archsight

> See your architecture. Spot the problems.

archsight는 코드베이스의 아키텍처를 시각화하고, 변경 영향도를 분석하며, 아키텍처 위반을 직관적으로 인식하게 해주는 도구입니다.

## Why archsight

- **레거시 분석**: 섞여있는 코드를 스캔해서 의존 관계를 시각화하고 위반을 잡아냅니다
- **변경 영향도**: 코드 수정 시 어디에 영향이 가는지 한눈에 파악합니다
- **AI 코드 검수**: AI가 생성한 코드가 설계를 준수하는지 시각적으로 확인합니다

DDD, Hexagonal, Layered, 또는 아키텍처 패턴이 없는 프로젝트 — 모두 지원합니다.

## How it works

```
코드 (또는 Spec) → JSON 메타데이터 → 시각화
```

1. **Base graph**: 모듈 전체의 현재 구조를 정의합니다
2. **ChangeSet**: 변경 사항을 오버레이합니다 (new / modified / affected)
3. **Render**: 머지된 결과를 React Flow로 시각화합니다

## Quick start

```bash
pnpm install
pnpm dev  # Storybook 실행
```

## 메타데이터 예시

노드 하나를 정의하는 최소 코드:

```typescript
{ id: "order", label: "Order", type: "aggregate", layer: "domain" }
```

변경 상태를 오버레이하는 ChangeSet:

```typescript
{
  nodeId: "order",
  status: "modified",
  changes: ["cancel() 메서드 추가"],
  reviewPoints: [{ message: "상태 전이 검증 필요", severity: "critical" }]
}
```

## License

MIT
