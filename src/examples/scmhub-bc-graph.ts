import type { BoundedContextGraph } from "../types/spec-metadata";

/**
 * SCM Hub Inbound — 아키텍처가 섞인 실제 프로젝트 그래프
 *
 * 현실 세계의 혼합 아키텍처를 "있는 그대로" 보여주는 예시.
 * DDD를 시도했지만 인프라가 도메인에 스며들고,
 * 서비스가 비대해지고, 모듈 간 경계가 흐릿해진 상태.
 *
 * 소스: scm-hub-be 프로젝트 (Java 21 + Spring Boot)
 * 특징:
 * - core 모듈에 도메인 + 리포지토리 + QueryDSL 혼재
 * - InboundServiceImpl이 20+개 의존성 보유
 * - inbound ↔ transaction 양방향 의존
 * - 이벤트 기반(stock)과 직접 호출(inventory, outbound)이 공존
 *
 * 아키텍처 문제 시각화 포인트:
 * 1. "domain" 레이어에 repository 노드 → 레이어 위반
 * 2. inbound-svc에서 사방으로 뻗는 의존선 → 비대한 서비스
 * 3. inbound ↔ transaction 양방향 화살표 → 순환 의존
 * 4. master 패키지로 향하는 다수의 직접 의존 → 마스터 데이터 커플링
 */
export const scmhubBoundedContext: BoundedContextGraph = {
  context: {
    id: "scmhub-inbound",
    name: "SCM Hub (입고)",
    description:
      "물류 입고 흐름을 중심으로 재고, 출고, ASN, SAP, 마스터 데이터가 " +
      "얽혀있는 실제 프로덕션 코드. 7개 모듈(api-app, core, common, " +
      "batch-app, consumer-app, gateway-api-app, web-app), Java 4,230 파일 규모.",
    team: "SCM Engineering",
    docLinks: {
      repo: "https://github.com/example/scm-hub-be",
    },
  },

  nodes: [
    // ══════════════════════════════════════════════
    // Presentation Layer — API Controllers (api-app 모듈)
    // ══════════════════════════════════════════════

    {
      id: "inbound-ctrl",
      label: "InboundController",
      type: "controller",
      layer: "presentation",
      subtitle: "입고 API",
      operations: [
        "GET /api2/v1/storages/{storageNo}/inbounds",
        "POST /api2/v1/platforms/{platformNo}/companies/{companyCode}/inbounds",
      ],
      codeMapping: {
        filePath: "api-app/src/main/java/com/musinsa/scmhub/api/inbound/InboundController.java",
        className: "InboundController",
        packageName: "com.musinsa.scmhub.api.inbound",
        annotations: ["@RestController"],
      },
    },
    {
      id: "inbound-item-ctrl",
      label: "InboundItemController",
      type: "controller",
      layer: "presentation",
      subtitle: "입고 아이템 API",
      operations: [
        "PATCH /api/inbound-items/{id}/confirmed-quantity",
      ],
      codeMapping: {
        filePath: "api-app/src/main/java/com/musinsa/scmhub/api/inbound/InboundItemController.java",
        className: "InboundItemController",
        packageName: "com.musinsa.scmhub.api.inbound",
        annotations: ["@RestController"],
      },
    },
    {
      id: "inbound-request-ctrl",
      label: "InboundRequestController",
      type: "controller",
      layer: "presentation",
      subtitle: "입고 요청 API",
      operations: [
        "POST /api/inbound-requests/{id}/inbounds",
        "GET /api/inbound-requests",
      ],
      codeMapping: {
        filePath: "api-app/src/main/java/com/musinsa/scmhub/api/transaction/inbound/InboundRequestController.java",
        className: "InboundRequestController",
        packageName: "com.musinsa.scmhub.api.transaction.inbound",
        annotations: ["@RestController"],
      },
    },

    // ══════════════════════════════════════════════
    // Application Layer — Usecases (core/usecase 패키지)
    // ══════════════════════════════════════════════

    {
      id: "inbound-uc",
      label: "InboundUsecaseImpl",
      type: "usecase",
      layer: "application",
      subtitle: "ASN 입고 확정",
      description:
        "PLM ASN 확정 → Storage 검증 → Inbound 생성 → ASN 완료 → Workflow 실행. " +
        "여러 도메인 서비스를 오케스트레이션",
      operations: ["confirmAsn(inboundPlmId, floor, storageNo): Inbound"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/usecase/InboundUsecaseImpl.java",
        className: "InboundUsecaseImpl",
        packageName: "com.musinsa.scmhub.usecase",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "inbound-request-uc",
      label: "InboundRequestUsecaseImpl",
      type: "usecase",
      layer: "application",
      subtitle: "입고 요청 처리",
      description:
        "입고요청으로부터 실제 입고 생성. InboundService + OutboundService + " +
        "StorageService + MovementRequestService 등 12개 의존성 주입",
      operations: ["createInboundFromRequest(dto): List<InboundRequestItemInboundItem>"],
      tags: ["high-coupling"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/usecase/InboundRequestUsecaseImpl.java",
        className: "InboundRequestUsecaseImpl",
        packageName: "com.musinsa.scmhub.usecase",
        annotations: ["@Service", "@Transactional"],
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Inbound 도메인 (core/domain/inbound)
    // ══════════════════════════════════════════════

    {
      id: "inbound-svc",
      label: "InboundServiceImpl",
      type: "domain_service",
      layer: "domain",
      subtitle: "입고 핵심 서비스",
      description:
        "20+개 의존성을 가진 비대한 서비스. 입고 생성, 수량 확인, 도착 처리 등 " +
        "도메인 로직과 오케스트레이션이 혼재. 리팩토링 1순위 후보",
      operations: [
        "createInbound(dto): List<InboundItem>",
        "confirmQuantity(txId, itemId, qty)",
        "updateInboundItemsToArrived(request)",
      ],
      tags: ["thick-service", "high-coupling"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/InboundServiceImpl.java",
        className: "InboundServiceImpl",
        packageName: "com.musinsa.scmhub.domain.inbound",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "inbound-item-svc",
      label: "InboundItemServiceImpl",
      type: "domain_service",
      layer: "domain",
      subtitle: "입고 아이템 서비스",
      operations: [
        "getInboundItemHistories(itemId): List<History>",
        "updateInboundItemConfirmedQuantity(item, dto)",
      ],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/InboundItemServiceImpl.java",
        className: "InboundItemServiceImpl",
        packageName: "com.musinsa.scmhub.domain.inbound",
        annotations: ["@Service"],
      },
    },
    {
      id: "inbound-write-svc",
      label: "InboundWriteServiceImpl",
      type: "domain_service",
      layer: "domain",
      subtitle: "PLM 입고 생성",
      operations: [
        "createPlmInbound(dto, storage): Inbound",
        "cancelPlmInbound(txId): void",
      ],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/InboundWriteServiceImpl.java",
        className: "InboundWriteServiceImpl",
        packageName: "com.musinsa.scmhub.domain.inbound",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "inbound-instruction-svc",
      label: "InboundInstructionServiceImpl",
      type: "domain_service",
      layer: "domain",
      subtitle: "입고 지시",
      description: "센터/스토어 입고 지시 생성. MOMS 외부 시스템 연동 포함",
      operations: [
        "createCenterInboundInstruction(inbound)",
        "createStoreInboundInstruction(inbound)",
      ],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/instruction/InboundInstructionServiceImpl.java",
        className: "InboundInstructionServiceImpl",
        packageName: "com.musinsa.scmhub.domain.inbound.instruction",
        annotations: ["@Service"],
      },
    },
    {
      id: "inbound-entity",
      label: "Inbound",
      type: "aggregate",
      layer: "domain",
      subtitle: "입고 엔티티",
      description:
        "JPA @Entity가 도메인 모델 역할을 겸함. transactionId, 입고유형, " +
        "목적지 창고, 브랜드, 업체 정보 포함",
      tags: ["jpa-in-domain"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/model/Inbound.java",
        className: "Inbound",
        packageName: "com.musinsa.scmhub.domain.inbound.model",
        annotations: ["@Entity", "@Table"],
      },
    },
    {
      id: "inbound-item-entity",
      label: "InboundItem",
      type: "entity",
      layer: "domain",
      subtitle: "입고 아이템",
      aggregateId: "inbound-entity",
      description: "입고 상품 단위. SKU, 바코드, 수량, 상태 관리. Envers 이력 추적",
      tags: ["jpa-in-domain"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/model/InboundItem.java",
        className: "InboundItem",
        packageName: "com.musinsa.scmhub.domain.inbound.model",
        annotations: ["@Entity", "@Audited"],
      },
    },

    // ── Domain Layer — Repository (도메인에 위치 = 레이어 위반!) ──

    {
      id: "inbound-repo",
      label: "InboundRepository",
      type: "repository",
      layer: "domain",
      subtitle: "JPA in Domain",
      description:
        "JpaRepository + CustomRepository를 extends. " +
        "domain 패키지에 위치하여 인프라 의존성이 도메인에 유입됨",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/InboundRepository.java",
        className: "InboundRepository",
        packageName: "com.musinsa.scmhub.domain.inbound",
        annotations: ["extends JpaRepository"],
      },
    },
    {
      id: "inbound-item-repo",
      label: "InboundItemRepository",
      type: "repository",
      layer: "domain",
      subtitle: "JPA in Domain",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/InboundItemRepository.java",
        className: "InboundItemRepository",
        packageName: "com.musinsa.scmhub.domain.inbound",
        annotations: ["extends JpaRepository"],
      },
    },
    {
      id: "inbound-custom-repo",
      label: "InboundCustomRepositoryImpl",
      type: "repository",
      layer: "domain",
      subtitle: "QueryDSL in Domain",
      description: "QueryDSL + JPAQueryFactory가 도메인 패키지에 위치. 인프라 코드 누수",
      tags: ["layer-violation", "querydsl-in-domain"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inbound/InboundCustomRepositoryImpl.java",
        className: "InboundCustomRepositoryImpl",
        packageName: "com.musinsa.scmhub.domain.inbound",
        annotations: ["@Repository"],
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Inventory 도메인 (직접 의존)
    // ══════════════════════════════════════════════

    {
      id: "inventory-svc",
      label: "InventoryService",
      type: "domain_service",
      layer: "domain",
      subtitle: "재고 서비스",
      operations: ["getSkuProductOptionInventory(key): InventoryDto"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inventory/InventoryService.java",
        className: "InventoryService",
        packageName: "com.musinsa.scmhub.domain.inventory",
      },
    },
    {
      id: "inventory-repo",
      label: "InventoryRepository",
      type: "repository",
      layer: "domain",
      subtitle: "JPA in Domain",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/inventory/InventoryRepository.java",
        className: "InventoryRepository",
        packageName: "com.musinsa.scmhub.domain.inventory",
        annotations: ["extends JpaRepository"],
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Stock 도메인 (이벤트 기반 — 좋은 패턴)
    // ══════════════════════════════════════════════

    {
      id: "stock-inbound-listener",
      label: "StockInboundEventListener",
      type: "policy",
      layer: "domain",
      subtitle: "입고 이벤트 구독",
      description:
        "ApplicationEventPublisher를 통해 비동기로 연결. " +
        "입고 생성 이벤트를 수신하여 재고 이동 기록 생성",
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/stock/inbound/StockInboundEventListener.java",
        className: "StockInboundEventListener",
        packageName: "com.musinsa.scmhub.domain.stock.inbound",
        annotations: ["@EventListener"],
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Outbound 도메인 (입고에서 직접 호출)
    // ══════════════════════════════════════════════

    {
      id: "outbound-svc",
      label: "OutboundService",
      type: "domain_service",
      layer: "domain",
      subtitle: "출고 서비스",
      description: "입고 요청 Usecase에서 재고 이동 시 출고 생성을 위해 직접 호출됨",
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/outbound/OutboundService.java",
        className: "OutboundService",
        packageName: "com.musinsa.scmhub.domain.outbound",
      },
    },
    {
      id: "outbound-instruction-svc",
      label: "OutboundInstructionService",
      type: "domain_service",
      layer: "domain",
      subtitle: "출고 지시",
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/outbound/instruction/OutboundInstructionService.java",
        className: "OutboundInstructionService",
        packageName: "com.musinsa.scmhub.domain.outbound.instruction",
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Master 데이터 (여러 도메인이 직접 참조)
    // ══════════════════════════════════════════════

    {
      id: "storage-svc",
      label: "StorageService",
      type: "domain_service",
      layer: "domain",
      subtitle: "창고 마스터",
      operations: ["getStorageByStorageNo(no): Storage"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/master/storage/StorageService.java",
        className: "StorageService",
        packageName: "com.musinsa.scmhub.domain.master.storage",
      },
    },
    {
      id: "sku-repo",
      label: "SkuRepository",
      type: "repository",
      layer: "domain",
      subtitle: "SKU 마스터",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/master/sku/SkuRepository.java",
        className: "SkuRepository",
        packageName: "com.musinsa.scmhub.domain.master.sku",
        annotations: ["extends JpaRepository"],
      },
    },
    {
      id: "brand-repo",
      label: "BrandRepository",
      type: "repository",
      layer: "domain",
      subtitle: "브랜드 마스터",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/master/brand/BrandRepository.java",
        className: "BrandRepository",
        packageName: "com.musinsa.scmhub.domain.master.brand",
        annotations: ["extends JpaRepository"],
      },
    },
    {
      id: "company-repo",
      label: "CompanyRepository",
      type: "repository",
      layer: "domain",
      subtitle: "업체 마스터",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/master/supplier/CompanyRepository.java",
        className: "CompanyRepository",
        packageName: "com.musinsa.scmhub.domain.master.supplier",
        annotations: ["extends JpaRepository"],
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — RFID/ASN 도메인
    // ══════════════════════════════════════════════

    {
      id: "asn-confirm-svc",
      label: "AsnConfirmService",
      type: "domain_service",
      layer: "domain",
      subtitle: "ASN 확정",
      description: "PLM 입고 확정 전 검증 및 확정 처리",
      operations: [
        "checkConfirmation(plmId): ConfirmationCheckResult",
        "completeConfirm(): void",
      ],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/rfid/asn/AsnConfirmService.java",
        className: "AsnConfirmService",
        packageName: "com.musinsa.scmhub.domain.rfid.asn",
      },
    },
    {
      id: "asn-cancel-svc",
      label: "AsnCancellationService",
      type: "domain_service",
      layer: "domain",
      subtitle: "ASN 취소",
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/rfid/asn/AsnCancellationService.java",
        className: "AsnCancellationService",
        packageName: "com.musinsa.scmhub.domain.rfid.asn",
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — SAP 연동
    // ══════════════════════════════════════════════

    {
      id: "sap-asn-svc",
      label: "SapAsnSendService",
      type: "adapter",
      layer: "domain",
      subtitle: "SAP ASN 전송",
      description: "외부 SAP 시스템 연동이 domain 패키지에 위치 — adapter가 domain에 있는 위반",
      tags: ["layer-violation"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/sap/outbound/sapasn/SapAsnSendService.java",
        className: "SapAsnSendService",
        packageName: "com.musinsa.scmhub.domain.sap.outbound.sapasn",
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Transaction (입고와 양방향 의존)
    // ══════════════════════════════════════════════

    {
      id: "inbound-request-svc",
      label: "InboundRequestService",
      type: "domain_service",
      layer: "domain",
      subtitle: "입고 요청 서비스",
      description: "transaction/inbound 패키지. inbound 도메인과 양방향 의존 관계",
      tags: ["bidirectional-dependency"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/transaction/inbound/InboundRequestService.java",
        className: "InboundRequestService",
        packageName: "com.musinsa.scmhub.domain.transaction.inbound",
      },
    },
    {
      id: "inbound-request-repo",
      label: "InboundRequestRepository",
      type: "repository",
      layer: "domain",
      subtitle: "JPA in Domain",
      tags: ["layer-violation", "bidirectional-dependency"],
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/transaction/inbound/InboundRequestRepository.java",
        className: "InboundRequestRepository",
        packageName: "com.musinsa.scmhub.domain.transaction.inbound",
        annotations: ["extends JpaRepository"],
      },
    },
    {
      id: "logistics-link-svc",
      label: "LogisticsTransactionLinkService",
      type: "domain_service",
      layer: "domain",
      subtitle: "물류 트랜잭션 연결",
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/transaction/link/LogisticsTransactionLinkService.java",
        className: "LogisticsTransactionLinkService",
        packageName: "com.musinsa.scmhub.domain.transaction.link",
      },
    },

    // ══════════════════════════════════════════════
    // Infrastructure Layer — 외부 시스템 연동
    // ══════════════════════════════════════════════

    {
      id: "event-publisher",
      label: "ApplicationEventPublisher",
      type: "adapter",
      layer: "infrastructure",
      subtitle: "Spring 이벤트",
      description: "Spring ApplicationEventPublisher를 통한 도메인 이벤트 발행",
      codeMapping: {
        filePath: "spring-framework",
        className: "ApplicationEventPublisher",
        packageName: "org.springframework.context",
      },
    },
    {
      id: "workflow-client",
      label: "WorkflowClient",
      type: "adapter",
      layer: "infrastructure",
      subtitle: "Temporal 워크플로",
      description: "Temporal을 통한 비동기 워크플로 실행 (PLM ASN 처리)",
      codeMapping: {
        filePath: "core/src/main/java/com/musinsa/scmhub/domain/workflow/WorkflowClient.java",
        className: "WorkflowClient",
        packageName: "com.musinsa.scmhub.domain.workflow",
      },
    },
    {
      id: "pes-client",
      label: "PesClient",
      type: "adapter",
      layer: "infrastructure",
      subtitle: "PES 외부 API",
      description: "외부 PES 시스템 REST 클라이언트",
      codeMapping: {
        filePath: "common/src/main/java/com/musinsa/scmhub/common/client/pes/PesClient.java",
        className: "PesClient",
        packageName: "com.musinsa.scmhub.common.client.pes",
      },
    },
  ],

  edges: [
    // ── Presentation → Application ──────────────────
    { from: "inbound-ctrl", to: "inbound-svc", type: "invokes", label: "직접 호출 (usecase 우회)" },
    { from: "inbound-ctrl", to: "inbound-request-uc", type: "invokes", method: "createInboundFromRequest" },
    { from: "inbound-item-ctrl", to: "inbound-item-svc", type: "invokes", label: "직접 호출" },
    { from: "inbound-request-ctrl", to: "inbound-request-svc", type: "invokes", label: "직접 호출" },
    { from: "inbound-request-ctrl", to: "inbound-request-uc", type: "invokes", method: "createInboundFromRequest" },

    // ── Application (Usecase) → Domain Services ─────
    { from: "inbound-uc", to: "asn-confirm-svc", type: "invokes", method: "checkConfirmation" },
    { from: "inbound-uc", to: "asn-cancel-svc", type: "invokes" },
    { from: "inbound-uc", to: "inbound-write-svc", type: "invokes", method: "createPlmInbound" },
    { from: "inbound-uc", to: "sap-asn-svc", type: "invokes", label: "SAP 전송" },
    { from: "inbound-uc", to: "storage-svc", type: "invokes", method: "getStorageByStorageNo" },
    { from: "inbound-uc", to: "workflow-client", type: "invokes", label: "Temporal workflow" },

    { from: "inbound-request-uc", to: "inbound-svc", type: "invokes", method: "createInbound" },
    { from: "inbound-request-uc", to: "inbound-request-svc", type: "invokes" },
    { from: "inbound-request-uc", to: "outbound-svc", type: "invokes", label: "재고이동 시 출고 생성" },
    { from: "inbound-request-uc", to: "outbound-instruction-svc", type: "invokes" },
    { from: "inbound-request-uc", to: "storage-svc", type: "invokes" },
    { from: "inbound-request-uc", to: "logistics-link-svc", type: "invokes" },
    { from: "inbound-request-uc", to: "event-publisher", type: "publishes", label: "입고 생성 이벤트" },
    { from: "inbound-request-uc", to: "inbound-request-repo", type: "invokes" },

    // ── InboundServiceImpl의 방사형 의존 (핵심 문제) ─
    { from: "inbound-svc", to: "inbound-repo", type: "invokes" },
    { from: "inbound-svc", to: "inbound-item-repo", type: "invokes" },
    { from: "inbound-svc", to: "inbound-custom-repo", type: "invokes" },
    { from: "inbound-svc", to: "inventory-svc", type: "invokes", method: "getSkuProductOptionInventory" },
    { from: "inbound-svc", to: "inventory-repo", type: "invokes", label: "직접 repo 접근" },
    { from: "inbound-svc", to: "storage-svc", type: "invokes" },
    { from: "inbound-svc", to: "sku-repo", type: "invokes", label: "마스터 직접 참조" },
    { from: "inbound-svc", to: "brand-repo", type: "invokes", label: "마스터 직접 참조" },
    { from: "inbound-svc", to: "company-repo", type: "invokes", label: "마스터 직접 참조" },
    { from: "inbound-svc", to: "inbound-instruction-svc", type: "invokes" },
    { from: "inbound-svc", to: "logistics-link-svc", type: "invokes" },
    { from: "inbound-svc", to: "inbound-request-repo", type: "invokes", label: "양방향 의존" },
    { from: "inbound-svc", to: "inbound-request-svc", type: "depends_on", label: "양방향 의존" },

    // ── InboundItemServiceImpl ───────────────────────
    { from: "inbound-item-svc", to: "inbound-item-repo", type: "invokes" },
    { from: "inbound-item-svc", to: "inventory-repo", type: "invokes", label: "직접 repo 접근" },
    { from: "inbound-item-svc", to: "sku-repo", type: "invokes" },

    // ── InboundWriteServiceImpl ──────────────────────
    { from: "inbound-write-svc", to: "inbound-repo", type: "invokes" },
    { from: "inbound-write-svc", to: "inbound-item-repo", type: "invokes" },

    // ── Transaction → Inbound (양방향 의존) ──────────
    { from: "inbound-request-svc", to: "inbound-svc", type: "depends_on", label: "양방향" },
    { from: "inbound-request-svc", to: "inbound-request-repo", type: "invokes" },

    // ── 이벤트 기반 (비교적 건전한 패턴) ────────────
    { from: "event-publisher", to: "stock-inbound-listener", type: "publishes", label: "StockInboundCreatedEvent" },

    // ── Domain 내부 ─────────────────────────────────
    { from: "inbound-entity", to: "inbound-item-entity", type: "creates" },

    // ── 외부 시스템 의존 ────────────────────────────
    { from: "inbound-svc", to: "pes-client", type: "depends_on", label: "외부 API 직접 호출" },
  ],
};
