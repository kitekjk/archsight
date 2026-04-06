import type { ChangeSet } from "../types/spec-metadata";

/**
 * ChangeSet: 주문 취소 기능 추가
 *
 * Order BC base graph 위에 오버레이되어
 * "이번에 뭐가 바뀌는지"를 시각화합니다.
 *
 * 이 ChangeSet을 시각화하면:
 * - Green(new): CancelOrderUseCase, RefundService, OrderCancelledEvent, RefundAdapter
 * - Amber(modified): OrderController, Order aggregate
 * - Red(affected): InventoryService, OrderRepository
 * - Gray(existing): 나머지 전부
 */
export const cancelOrderChangeSet: ChangeSet = {
  meta: {
    id: "cs-order-cancel-001",
    title: "주문 취소 기능 추가",
    boundedContextId: "order",
    specId: "SPEC-ORDER-CANCEL-001",
    author: "Kay",
    createdAt: "2026-03-25T10:00:00+09:00",
    refs: {
      jira: "SCM-1234",
      pr: "https://github.com/example/order-service/pull/567",
    },
    version: "1.0.0",
  },

  summary: "고객이 배송 전 주문을 취소하고 환불받을 수 있는 기능 추가",

  nodeChanges: [
    // ── Modified: 기존 코드에 변경이 가해지는 컴포넌트 ────

    {
      nodeId: "order-ctrl",
      status: "modified",
      changes: ["DELETE /api/orders/{id} 엔드포인트 추가"],
      modifiedMembers: {
        added: ["cancelOrder(@PathVariable id: OrderId): ResponseEntity<Unit>"],
      },
      reviewPoints: [
        {
          message: "취소 권한 체크가 Controller에 없고 UseCase로 위임되는지 확인",
          severity: "critical",
          automatable: true,
          ruleRef: "layer-dependency-rule",
        },
        {
          message: "DELETE 메서드 사용이 적절한지 (실제 삭제가 아닌 상태 변경)",
          severity: "warning",
        },
      ],
    },

    {
      nodeId: "order-agg",
      status: "modified",
      changes: [
        "cancel(reason: CancelReason) 메서드 추가",
        "OrderStatus enum에 CANCELLED 추가",
        "OrderCancelledEvent 발행 로직 추가",
      ],
      modifiedMembers: {
        added: [
          "cancel(reason: CancelReason): Unit",
          "OrderStatus.CANCELLED",
        ],
        changed: ["상태 전이 로직 (canTransitionTo)"],
      },
      reviewPoints: [
        {
          message: "cancel() 내부에 상태 전이 검증 존재하는지 (DELIVERED→CANCELLED 불가)",
          severity: "critical",
          automatable: true,
          ruleRef: "aggregate-invariant",
        },
        {
          message: "cancel() 호출 시 OrderCancelledEvent가 발행되는지",
          severity: "critical",
          automatable: true,
          ruleRef: "domain-event-publishing",
        },
      ],
    },

    // ── New: 새로 추가되는 컴포넌트 ─────────────────────

    {
      nodeId: "cancel-order-uc",
      status: "new",
      node: {
        id: "cancel-order-uc",
        label: "CancelOrderUseCase",
        type: "usecase",
        layer: "application",
        subtitle: "주문 취소",
        description:
          "주문 취소 흐름: 주문 조회 → 상태 검증 → Order.cancel() → 재고 복원 → 환불 처리",
        operations: ["execute(command: CancelOrderCommand): Unit"],
        codeMapping: {
          filePath:
            "src/main/kotlin/com/example/order/application/CancelOrderUseCase.kt",
          className: "CancelOrderUseCase",
          packageName: "com.example.order.application",
          annotations: ["@Service", "@Transactional"],
        },
      },
      changes: [
        "Order.cancel() 호출 후 InventoryService.restoreStock() 실행",
        "RefundService.refund() 실행",
        "실패 시 보상 트랜잭션 처리",
      ],
      reviewPoints: [
        {
          message: "트랜잭션 경계가 UseCase 레벨에 있는지",
          severity: "critical",
          automatable: true,
          ruleRef: "transaction-boundary",
        },
        {
          message:
            "refund 실패 시 Order 상태가 CANCEL_FAILED로 전이되는지 (보상 트랜잭션)",
          severity: "critical",
        },
        {
          message: "동시성 제어 — 같은 주문에 대한 동시 취소 요청 처리",
          severity: "warning",
        },
      ],
    },

    {
      nodeId: "refund-svc",
      status: "new",
      node: {
        id: "refund-svc",
        label: "RefundService",
        type: "domain_service",
        layer: "domain",
        subtitle: "환불 처리",
        description:
          "결제 취소 및 환불 처리. PG사 연동은 Infrastructure의 RefundAdapter에 위임.",
        operations: ["refund(orderId: OrderId, amount: Money): RefundResult"],
        codeMapping: {
          filePath:
            "src/main/kotlin/com/example/order/domain/RefundService.kt",
          className: "RefundService",
          packageName: "com.example.order.domain",
        },
      },
      changes: ["결제 취소/환불 도메인 서비스 신규 생성"],
      reviewPoints: [
        {
          message:
            "RefundService가 인터페이스이고 Infrastructure에 구현체가 있는지",
          severity: "critical",
          automatable: true,
          ruleRef: "layer-dependency-rule",
        },
      ],
    },

    {
      nodeId: "order-cancelled-evt",
      status: "new",
      node: {
        id: "order-cancelled-evt",
        label: "OrderCancelledEvent",
        type: "domain_event",
        layer: "domain",
        subtitle: "주문 취소 이벤트",
        description:
          "Order aggregate에서 발행. 구독자: InventoryService(재고 복원), NotificationService(고객 통지)",
        codeMapping: {
          filePath:
            "src/main/kotlin/com/example/order/domain/events/OrderCancelledEvent.kt",
          className: "OrderCancelledEvent",
          packageName: "com.example.order.domain.events",
        },
      },
      changes: [
        "이벤트 스키마: orderId, cancelReason, cancelledAt, refundAmount",
      ],
      reviewPoints: [
        {
          message:
            "이벤트 스키마에 orderId, cancelReason, cancelledAt 필수 포함",
          severity: "critical",
          automatable: true,
          ruleRef: "event-schema-validation",
        },
        {
          message:
            "이벤트 버저닝 전략 결정 (스키마 진화 시 하위 호환 보장)",
          severity: "warning",
        },
      ],
    },

    {
      nodeId: "refund-adapter",
      status: "new",
      node: {
        id: "refund-adapter",
        label: "RefundAdapter",
        type: "adapter",
        layer: "infrastructure",
        subtitle: "PG사 환불 연동",
        description: "RefundService 인터페이스 구현체. 외부 PG사 API 호출.",
        codeMapping: {
          filePath:
            "src/main/kotlin/com/example/order/infrastructure/RefundAdapter.kt",
          className: "RefundAdapter",
          packageName: "com.example.order.infrastructure",
          annotations: ["@Component"],
        },
      },
      changes: ["PG사 환불 API 연동 구현체 신규 생성"],
      reviewPoints: [
        {
          message: "PG사 API 타임아웃/재시도 설정이 있는지",
          severity: "warning",
        },
        {
          message: "환불 결과를 idempotency key로 중복 방지하는지",
          severity: "critical",
        },
      ],
    },

    // ── Affected: 직접 수정은 아니지만 파급 영향을 받는 컴포넌트 ──

    {
      nodeId: "inventory-svc",
      status: "affected",
      changes: [
        "restoreStock() 호출을 새로 수신하게 됨",
        "OrderCancelledEvent 구독 필요",
      ],
      modifiedMembers: {
        added: ["restoreStock(items: List<OrderLine>): Unit"],
      },
      reviewPoints: [
        {
          message:
            "restoreStock()이 멱등성 보장하는지 — 이벤트 중복 수신 시 재고 이중 복원 방지",
          severity: "critical",
        },
        {
          message:
            "restoreStock()이 InventoryService 인터페이스에 추가되면 InventoryAdapter도 수정 필요",
          severity: "warning",
          automatable: true,
          ruleRef: "interface-implementation-sync",
        },
      ],
    },

    {
      nodeId: "order-repo",
      status: "affected",
      changes: [
        "Order.status 필드 추가로 인한 JPA 엔티티 변경",
        "findByStatus() 쿼리 추가 가능성",
      ],
      reviewPoints: [
        {
          message: "DB 마이그레이션 스크립트(Flyway/Liquibase) 존재 여부",
          severity: "critical",
          automatable: true,
          ruleRef: "db-migration-required",
        },
        {
          message: "status 컬럼 인덱스 전략 확인",
          severity: "warning",
        },
      ],
    },
  ],

  edgeChanges: [
    // 새로운 의존 관계
    { from: "order-ctrl", to: "cancel-order-uc", status: "new", edge: { from: "order-ctrl", to: "cancel-order-uc", type: "invokes", method: "execute" } },
    { from: "cancel-order-uc", to: "order-agg", status: "new", edge: { from: "cancel-order-uc", to: "order-agg", type: "invokes", method: "cancel" } },
    { from: "cancel-order-uc", to: "inventory-svc", status: "new", edge: { from: "cancel-order-uc", to: "inventory-svc", type: "invokes", method: "restoreStock" } },
    { from: "cancel-order-uc", to: "refund-svc", status: "new", edge: { from: "cancel-order-uc", to: "refund-svc", type: "invokes", method: "refund" } },
    { from: "cancel-order-uc", to: "order-repo", status: "new", edge: { from: "cancel-order-uc", to: "order-repo", type: "invokes", method: "save" } },
    { from: "order-agg", to: "order-cancelled-evt", status: "new", edge: { from: "order-agg", to: "order-cancelled-evt", type: "publishes" } },
    { from: "order-cancelled-evt", to: "inventory-svc", status: "new", edge: { from: "order-cancelled-evt", to: "inventory-svc", type: "subscribes" } },
    { from: "refund-adapter", to: "refund-svc", status: "new", edge: { from: "refund-adapter", to: "refund-svc", type: "implements" } },
  ],

  architectureReviewPoints: [
    {
      message: "취소 → 환불 → 재고 복원 흐름에서 부분 실패 시 Saga 패턴이 적용되어 있는지",
      severity: "critical",
    },
    {
      message: "OrderCancelledEvent가 Bounded Context 외부(결제, 알림)로 전파될 때 Anti-Corruption Layer가 있는지",
      severity: "warning",
    },
    {
      message: "취소 사유(CancelReason)가 Value Object로 정의되어 있는지",
      severity: "info",
    },
  ],
};
