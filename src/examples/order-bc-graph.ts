import type { BoundedContextGraph } from "../types/spec-metadata";

/**
 * Order Bounded Context — 기본 그래프
 *
 * 이 파일이 Order 도메인의 "현재 상태" 전체 그림입니다.
 * 변경 사항은 별도의 ChangeSet 파일로 오버레이합니다.
 *
 * 작성: 사람 (초기 설계) → Claude Code (코드 분석으로 동기화)
 */
export const orderBoundedContext: BoundedContextGraph = {
  context: {
    id: "order",
    name: "주문 (Order)",
    description: "고객 주문의 생성, 상태 관리, 이력 조회를 담당하는 Bounded Context",
    team: "SCM Engineering",
    docLinks: {
      hld: "https://confluence.example.com/order-hld",
      erd: "https://confluence.example.com/order-erd",
    },
  },

  // 기본 DDD 4레이어 사용 시 생략 가능. 여기서는 명시적으로 작성.
  layers: [
    { id: "presentation", displayName: "Presentation", order: 0 },
    { id: "application", displayName: "Application", order: 1 },
    { id: "domain", displayName: "Domain", order: 2 },
    { id: "infrastructure", displayName: "Infrastructure", order: 3 },
  ],

  nodes: [
    // ── Presentation Layer ──────────────────────────
    {
      id: "order-ctrl",
      label: "OrderController",
      type: "controller",
      layer: "presentation",
      subtitle: "REST API endpoint",
      operations: [
        "POST /api/orders",
        "GET /api/orders/{id}",
        "GET /api/orders?customerId={id}",
      ],
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/presentation/OrderController.kt",
        className: "OrderController",
        packageName: "com.example.order.presentation",
        annotations: ["@RestController", "@RequestMapping(\"/api/orders\")"],
      },
    },

    // ── Application Layer ───────────────────────────
    {
      id: "create-order-uc",
      label: "CreateOrderUseCase",
      type: "usecase",
      layer: "application",
      subtitle: "주문 생성",
      description: "장바구니 상품을 주문으로 전환. 재고 확인 → 주문 생성 → 이벤트 발행",
      operations: ["execute(command: CreateOrderCommand): OrderId"],
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/application/CreateOrderUseCase.kt",
        className: "CreateOrderUseCase",
        packageName: "com.example.order.application",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "get-order-uc",
      label: "GetOrderUseCase",
      type: "usecase",
      layer: "application",
      subtitle: "주문 조회",
      operations: [
        "getById(orderId: OrderId): OrderDto",
        "getByCustomer(customerId: CustomerId): List<OrderDto>",
      ],
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/application/GetOrderUseCase.kt",
        className: "GetOrderUseCase",
        packageName: "com.example.order.application",
        annotations: ["@Service", "@Transactional(readOnly = true)"],
      },
    },

    // ── Domain Layer ────────────────────────────────
    {
      id: "order-agg",
      label: "Order",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate root",
      description: "주문의 핵심 Aggregate. OrderLine, ShippingInfo를 포함.",
      operations: [
        "create(items, shippingInfo): Order",
        "changeShippingInfo(info): void",
      ],
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/domain/Order.kt",
        className: "Order",
        packageName: "com.example.order.domain",
        annotations: ["@Entity", "@Table(name = \"orders\")"],
      },
    },
    {
      id: "order-line",
      label: "OrderLine",
      type: "entity",
      layer: "domain",
      subtitle: "주문 항목",
      aggregateId: "order-agg",
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/domain/OrderLine.kt",
        className: "OrderLine",
        packageName: "com.example.order.domain",
        annotations: ["@Entity"],
      },
    },
    {
      id: "shipping-info",
      label: "ShippingInfo",
      type: "value_object",
      layer: "domain",
      subtitle: "배송 정보",
      aggregateId: "order-agg",
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/domain/ShippingInfo.kt",
        className: "ShippingInfo",
        packageName: "com.example.order.domain",
        annotations: ["@Embeddable"],
      },
    },
    {
      id: "inventory-svc",
      label: "InventoryService",
      type: "domain_service",
      layer: "domain",
      subtitle: "재고 검증",
      description: "여러 Aggregate에 걸치는 재고 확인 로직. Inventory BC와 연동.",
      operations: ["checkStock(items: List<OrderLine>): Boolean"],
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/domain/InventoryService.kt",
        className: "InventoryService",
        packageName: "com.example.order.domain",
        annotations: [],
      },
    },
    {
      id: "order-created-evt",
      label: "OrderCreatedEvent",
      type: "domain_event",
      layer: "domain",
      subtitle: "주문 생성 이벤트",
      description: "주문 생성 시 발행. 구독자: 재고 차감, 결제 요청, 알림 발송",
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/domain/events/OrderCreatedEvent.kt",
        className: "OrderCreatedEvent",
        packageName: "com.example.order.domain.events",
      },
    },

    // ── Infrastructure Layer ────────────────────────
    {
      id: "order-repo",
      label: "OrderRepository",
      type: "repository",
      layer: "infrastructure",
      subtitle: "주문 저장소",
      operations: [
        "save(order: Order): Order",
        "findById(id: OrderId): Order?",
        "findByCustomerId(id: CustomerId): List<Order>",
      ],
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/infrastructure/JpaOrderRepository.kt",
        className: "JpaOrderRepository",
        packageName: "com.example.order.infrastructure",
        annotations: ["@Repository"],
      },
    },
    {
      id: "inventory-adapter",
      label: "InventoryAdapter",
      type: "adapter",
      layer: "infrastructure",
      subtitle: "재고 API 연동",
      description: "InventoryService 인터페이스의 구현체. Inventory BC REST API 호출.",
      codeMapping: {
        filePath: "src/main/kotlin/com/example/order/infrastructure/InventoryAdapter.kt",
        className: "InventoryAdapter",
        packageName: "com.example.order.infrastructure",
        annotations: ["@Component"],
      },
    },
  ],

  edges: [
    // Presentation → Application
    { from: "order-ctrl", to: "create-order-uc", type: "invokes", method: "execute" },
    { from: "order-ctrl", to: "get-order-uc", type: "invokes", method: "getById" },

    // Application → Domain
    { from: "create-order-uc", to: "order-agg", type: "invokes", method: "create" },
    { from: "create-order-uc", to: "inventory-svc", type: "invokes", method: "checkStock" },
    { from: "get-order-uc", to: "order-repo", type: "invokes", method: "findById" },

    // Application → Infrastructure
    { from: "create-order-uc", to: "order-repo", type: "invokes", method: "save" },

    // Domain 내부
    { from: "order-agg", to: "order-line", type: "creates" },
    { from: "order-agg", to: "shipping-info", type: "creates" },
    { from: "order-agg", to: "order-created-evt", type: "publishes" },

    // Infrastructure → Domain (인터페이스 구현)
    { from: "inventory-adapter", to: "inventory-svc", type: "implements" },
  ],
};
