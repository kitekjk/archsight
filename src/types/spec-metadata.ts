/**
 * DDD Spec Visual Metadata — Type Definitions
 *
 * 이 타입 시스템이 곧 시각화 도구의 Spec입니다.
 * 
 * 설계 원칙:
 * 1. Two-Layer 구조: BoundedContextGraph (전체 그림) + ChangeSet (변경 오버레이)
 * 2. 사람/AI/코드분석 세 가지 작성 방식 모두 지원
 * 3. Required 필드만으로 최소 동작, Optional 필드로 풍부한 시각화
 * 4. Spring Boot + DDD + Clean Architecture 컨벤션 반영
 */

// ============================================================
// 1. Enums — 시각화 도구가 색상/아이콘/배치를 결정하는 기준
// ============================================================

/** DDD 레이어 — 시각화에서 수평 영역(swimlane)으로 매핑 */
export type DddLayer =
  | "presentation"    // Controller, DTO
  | "application"     // UseCase, ApplicationService, Command/Query
  | "domain"          // Aggregate, Entity, ValueObject, DomainService, DomainEvent
  | "infrastructure"; // Repository 구현체, 외부 시스템 Adapter

/** DDD 빌딩 블록 — 노드의 모양과 색상을 결정 */
export type DddComponentType =
  | "controller"      // @RestController, @Controller
  | "usecase"         // ApplicationService / UseCase
  | "command"         // Command 객체 (CQRS)
  | "query"           // Query 객체 (CQRS)
  | "aggregate"       // @Entity + Aggregate Root
  | "entity"          // @Entity (Aggregate 내부)
  | "value_object"    // @Embeddable, Value Object
  | "domain_service"  // 여러 Aggregate에 걸치는 도메인 로직
  | "domain_event"    // 도메인 이벤트
  | "repository"      // Repository 인터페이스 (domain) + 구현체 (infra)
  | "adapter"         // 외부 시스템 연동 (PG사, 메시징 등)
  | "policy";         // 이벤트 핸들러 / Saga / Policy

/** 변경 상태 — 시각화에서 색상 구분의 핵심 */
export type ChangeStatus =
  | "existing"        // 이번 변경에 영향 없음 (gray)
  | "new"             // 새로 추가됨 (green, dashed border)
  | "modified"        // 기존 코드 수정됨 (amber)
  | "affected"        // 직접 수정은 아니지만 파급 영향 (red)
  | "deprecated";     // 제거 예정 (strikethrough)

/** 엣지(의존관계) 유형 — 화살표 스타일을 결정 */
export type EdgeType =
  | "invokes"         // 동기 호출 (실선 화살표)
  | "publishes"       // 이벤트 발행 (점선 화살표)
  | "subscribes"      // 이벤트 구독 (점선 역방향)
  | "implements"      // 인터페이스 구현 (점선, 삼각 헤드)
  | "creates"         // 객체 생성 (실선, 다이아 헤드)
  | "depends_on";     // 일반 의존 (실선 화살표, 기본값)

/** 검수 심각도 */
export type ReviewSeverity =
  | "critical"        // 반드시 확인 (아키텍처 위반 가능성)
  | "warning"         // 주의 필요 (성능/일관성)
  | "info";           // 참고 사항

// ============================================================
// 2. Node — 다이어그램의 각 컴포넌트
// ============================================================

/** 
 * 검수 포인트 — 이 노드를 리뷰할 때 확인해야 할 사항
 * 
 * 사람이 작성할 때: message만 적으면 됨
 * Claude Code가 생성할 때: 모든 필드 채움
 */
export interface ReviewPoint {
  /** 검수 내용 (필수) */
  message: string;
  /** 심각도 (기본값: "info") */
  severity?: ReviewSeverity;
  /** 자동 검증 가능 여부 — true면 CI에서 체크 가능 */
  automatable?: boolean;
  /** 관련 규칙/패턴 이름 (예: "layer-dependency-rule", "aggregate-invariant") */
  ruleRef?: string;
}

/**
 * 코드 매핑 — 이 노드가 실제 코드의 어디에 해당하는지
 * 
 * 코드 분석(자동 추출) 시 필수, 사람 작성 시 optional
 * 시각화에서 "코드로 이동" 기능에 사용
 */
export interface CodeMapping {
  /** 파일 경로 (프로젝트 루트 기준) */
  filePath: string;
  /** 클래스명 (fully qualified 아닌 simple name) */
  className: string;
  /** 패키지 경로 */
  packageName?: string;
  /** Spring 어노테이션 (코드 분석 시 자동 추출) */
  annotations?: string[];
  /** 라인 범위 [시작, 끝] */
  lineRange?: [number, number];
}

/**
 * DDD 컴포넌트 노드
 * 
 * 최소 작성 예시 (사람이 빠르게):
 * { id: "order", label: "Order", type: "aggregate", layer: "domain" }
 * 
 * 완전 작성 예시 (Claude Code 자동 생성):
 * 모든 필드 채워진 형태
 */
export interface ComponentNode {
  // --- Required: 최소 이만큼은 있어야 렌더링 가능 ---

  /** 고유 ID (kebab-case 권장, BC 내 유일) */
  id: string;
  /** 화면에 표시되는 이름 */
  label: string;
  /** DDD 빌딩 블록 유형 */
  type: DddComponentType;
  /** 소속 레이어 */
  layer: DddLayer;

  // --- Optional: 시각화를 풍부하게 ---

  /** 부제 (노드 내부에 작은 글씨로 표시, 5단어 이내) */
  subtitle?: string;
  /** 상세 설명 (클릭 시 상세 패널에 표시) */
  description?: string;
  /** 이 노드가 소속된 Aggregate ID (entity, value_object에 사용) */
  aggregateId?: string;
  /** 주요 메서드/엔드포인트 목록 */
  operations?: string[];
  /** 코드 매핑 정보 */
  codeMapping?: CodeMapping;
  /** 태그 (자유 분류, 필터링에 사용) */
  tags?: string[];
}

// ============================================================
// 3. Edge — 컴포넌트 간 의존 관계
// ============================================================

/**
 * 의존 관계 엣지
 * 
 * 최소 작성: { from: "cancel-uc", to: "order-agg" }
 * 완전 작성: 모든 필드 포함
 */
export interface DependencyEdge {
  // --- Required ---

  /** 출발 노드 ID */
  from: string;
  /** 도착 노드 ID */
  to: string;

  // --- Optional ---

  /** 의존 유형 (기본값: "depends_on") */
  type?: EdgeType;
  /** 엣지 라벨 (화살표 위에 표시, 짧게) */
  label?: string;
  /** 호출되는 메서드명 */
  method?: string;
}

// ============================================================
// 4. BoundedContextGraph — BC 전체의 기본 구조 (Base Layer)
// ============================================================

/**
 * Bounded Context 전체 그래프
 * 
 * 이것이 "현재 상태"의 전체 그림입니다.
 * 변경 사항은 ChangeSet으로 오버레이합니다.
 * 
 * 하나의 BC = 하나의 BoundedContextGraph
 * 예: Order BC, Inventory BC, Payment BC 각각 별도 파일
 */
export interface BoundedContextGraph {
  /** BC 메타 정보 */
  context: {
    /** BC 고유 ID (kebab-case) */
    id: string;
    /** BC 표시 이름 */
    name: string;
    /** 설명 */
    description?: string;
    /** 담당 팀 */
    team?: string;
    /** 관련 문서 링크 */
    docLinks?: Record<string, string>;
  };

  /** 
   * DDD 레이어 설정
   * 기본값이 있으므로 생략 가능. 커스텀 레이어명이 필요할 때만 작성.
   */
  layers?: LayerConfig[];

  /** BC에 속한 모든 컴포넌트 노드 */
  nodes: ComponentNode[];

  /** 컴포넌트 간 의존 관계 */
  edges: DependencyEdge[];
}

/** 레이어 표시 설정 (생략 시 기본 DDD 4레이어 사용) */
export interface LayerConfig {
  id: DddLayer;
  /** 화면에 표시되는 레이어명 */
  displayName?: string;
  /** 위에서부터 순서 (0 = 최상단) */
  order: number;
}

// ============================================================
// 5. ChangeSet — 변경 오버레이 (Diff Layer)
// ============================================================

/**
 * 노드 변경 정보
 * 
 * BoundedContextGraph의 노드에 오버레이되는 변경 사항.
 * 기존 노드는 nodeId로 참조, 새 노드는 node 필드로 정의.
 */
export interface NodeChange {
  /** 
   * 대상 노드 ID
   * - 기존 노드: BoundedContextGraph.nodes 에 있는 ID
   * - 새 노드: 새로 부여하는 ID (이 경우 node 필드 필수)
   */
  nodeId: string;

  /** 변경 상태 */
  status: ChangeStatus;

  /** 
   * 새 노드 정의 (status가 "new"일 때 필수)
   * 기존 노드 수정 시에도 제공하면 label/subtitle 등을 오버라이드
   */
  node?: ComponentNode;

  /** 변경 내용 목록 (사람이 읽는 용도) */
  changes?: string[];

  /** 검수 포인트 */
  reviewPoints?: ReviewPoint[];

  /** 
   * 수정되는 메서드/필드 목록 (코드 분석 시 자동 추출)
   * 시각화에서 노드 내부에 "+ cancel()" 같이 표시
   */
  modifiedMembers?: {
    /** 추가되는 멤버 */
    added?: string[];
    /** 수정되는 멤버 */
    changed?: string[];
    /** 제거되는 멤버 */
    removed?: string[];
  };
}

/**
 * 엣지 변경 정보
 */
export interface EdgeChange {
  /** 출발 노드 ID */
  from: string;
  /** 도착 노드 ID */
  to: string;
  /** 변경 상태 */
  status: ChangeStatus;
  /** 새 엣지 정의 (status가 "new"일 때 사용) */
  edge?: DependencyEdge;
}

/**
 * ChangeSet — 하나의 기능/PR에 대한 변경 묶음
 * 
 * BoundedContextGraph 위에 오버레이되어
 * "이번에 뭐가 바뀌는지"를 시각화합니다.
 * 
 * 예: "주문 취소 기능 추가" = ChangeSet 1건
 *     하나의 BC에 여러 ChangeSet이 존재할 수 있음
 */
export interface ChangeSet {
  /** ChangeSet 메타 정보 */
  meta: {
    /** 고유 ID */
    id: string;
    /** 제목 */
    title: string;
    /** 대상 BC ID (BoundedContextGraph.context.id) */
    boundedContextId: string;
    /** 관련 Spec 문서 ID */
    specId?: string;
    /** 작성자 */
    author?: string;
    /** 작성일 (ISO 8601) */
    createdAt?: string;
    /** 관련 PR/이슈 번호 */
    refs?: Record<string, string>;
    /** 버전 */
    version?: string;
  };

  /** 변경 요약 (사람이 읽는 한 줄 설명) */
  summary: string;

  /** 노드 변경 목록 */
  nodeChanges: NodeChange[];

  /** 엣지 변경 목록 */
  edgeChanges: EdgeChange[];

  /** 
   * ChangeSet 전체에 대한 검수 포인트
   * (개별 노드가 아닌 전체 아키텍처 수준의 리뷰)
   */
  architectureReviewPoints?: ReviewPoint[];
}

// ============================================================
// 6. Resolved Graph — 시각화 도구가 실제로 렌더링하는 최종 구조
// ============================================================

/**
 * 렌더링용 노드 (BoundedContextGraph + ChangeSet 머지 결과)
 * 
 * 시각화 컴포넌트는 이 타입만 알면 됩니다.
 * BoundedContextGraph와 ChangeSet을 머지하는 로직은 useSpecParser 훅에서 처리.
 */
export interface ResolvedNode extends ComponentNode {
  /** 변경 상태 (기본값: "existing") */
  status: ChangeStatus;
  /** 변경 내용 */
  changes: string[];
  /** 검수 포인트 */
  reviewPoints: ReviewPoint[];
  /** 수정 멤버 */
  modifiedMembers?: NodeChange["modifiedMembers"];
}

/** 렌더링용 엣지 */
export interface ResolvedEdge extends DependencyEdge {
  /** 변경 상태 (기본값: "existing") */
  status: ChangeStatus;
}

/**
 * 최종 렌더링 데이터
 * 
 * useSpecParser(graph, changeSet) → ResolvedGraph
 */
export interface ResolvedGraph {
  context: BoundedContextGraph["context"];
  changeSet?: ChangeSet["meta"];
  layers: Required<LayerConfig>[];
  nodes: ResolvedNode[];
  edges: ResolvedEdge[];
  /** 변경 통계 (상단 메트릭 카드에 표시) */
  stats: {
    existing: number;
    new: number;
    modified: number;
    affected: number;
    deprecated: number;
  };
}
