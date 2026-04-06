import type { BoundedContextGraph } from "../types/spec-metadata";

/**
 * LMS (Labor Management System) Bounded Context — 기본 그래프
 *
 * 교과서적 DDD + Clean Architecture 구조.
 * 멀티모듈(domain / application / infrastructure / interfaces)로
 * 레이어 경계가 물리적으로 강제되어 있다.
 *
 * 소스: lms-demo 프로젝트 (Kotlin + Spring Boot)
 * 특징:
 * - 도메인 레이어에 Spring/JPA 의존성 0
 * - Aggregate Root는 private constructor + factory method 패턴
 * - Value Object는 Kotlin @JvmInline value class
 * - Repository: 도메인에 인터페이스, 인프라에 구현체
 * - Entity ↔ Domain Mapper로 완전 분리
 */
export const lmsBoundedContext: BoundedContextGraph = {
  context: {
    id: "lms",
    name: "LMS (노무관리)",
    description:
      "직원 근태, 휴가, 급여, 스케줄을 관리하는 Bounded Context. " +
      "하나의 배포 단위 안에 여러 Aggregate가 잘 분리되어 있는 교과서적 DDD 구조.",
    team: "LMS Engineering",
    docLinks: {
      repo: "https://github.com/example/lms-demo",
    },
  },

  nodes: [
    // ══════════════════════════════════════════════
    // Presentation Layer — REST Controllers
    // ══════════════════════════════════════════════

    {
      id: "auth-ctrl",
      label: "AuthController",
      type: "controller",
      layer: "presentation",
      subtitle: "인증 API",
      operations: [
        "POST /api/auth/login",
        "POST /api/auth/register",
        "POST /api/auth/refresh",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/AuthController.kt",
        className: "AuthController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/auth\")"],
      },
    },
    {
      id: "employee-ctrl",
      label: "EmployeeController",
      type: "controller",
      layer: "presentation",
      subtitle: "직원 관리 API",
      operations: [
        "POST /api/employees",
        "GET /api/employees",
        "GET /api/employees/{id}",
        "PUT /api/employees/{id}",
        "PATCH /api/employees/{id}/deactivate",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/EmployeeController.kt",
        className: "EmployeeController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/employees\")"],
      },
    },
    {
      id: "leave-ctrl",
      label: "LeaveRequestController",
      type: "controller",
      layer: "presentation",
      subtitle: "휴가 관리 API",
      operations: [
        "POST /api/leaves",
        "GET /api/leaves/my-leaves",
        "GET /api/leaves/pending",
        "PATCH /api/leaves/{id}/approve",
        "PATCH /api/leaves/{id}/reject",
        "DELETE /api/leaves/{id}",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/LeaveRequestController.kt",
        className: "LeaveRequestController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/leaves\")"],
      },
    },
    {
      id: "attendance-ctrl",
      label: "AttendanceController",
      type: "controller",
      layer: "presentation",
      subtitle: "근태 관리 API",
      operations: [
        "POST /api/attendance/check-in",
        "POST /api/attendance/check-out",
        "GET /api/attendance/my-records",
        "GET /api/attendance/records",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/AttendanceController.kt",
        className: "AttendanceController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/attendance\")"],
      },
    },
    {
      id: "schedule-ctrl",
      label: "WorkScheduleController",
      type: "controller",
      layer: "presentation",
      subtitle: "근무 스케줄 API",
      operations: [
        "POST /api/schedules",
        "GET /api/schedules",
        "GET /api/schedules/my-schedule",
        "PUT /api/schedules/{id}",
        "DELETE /api/schedules/{id}",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/WorkScheduleController.kt",
        className: "WorkScheduleController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/schedules\")"],
      },
    },
    {
      id: "store-ctrl",
      label: "StoreController",
      type: "controller",
      layer: "presentation",
      subtitle: "매장 관리 API",
      operations: [
        "POST /api/stores",
        "GET /api/stores",
        "PUT /api/stores/{id}",
        "DELETE /api/stores/{id}",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/StoreController.kt",
        className: "StoreController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/stores\")"],
      },
    },
    {
      id: "payroll-ctrl",
      label: "PayrollController",
      type: "controller",
      layer: "presentation",
      subtitle: "급여 관리 API",
      operations: [
        "POST /api/payroll/calculate",
        "POST /api/payroll/batch",
        "GET /api/payroll/{id}",
        "GET /api/payroll/my-payroll",
      ],
      codeMapping: {
        filePath: "interfaces/src/main/kotlin/com/lms/interfaces/web/controller/PayrollController.kt",
        className: "PayrollController",
        packageName: "com.lms.interfaces.web.controller",
        annotations: ["@RestController", "@RequestMapping(\"/api/payroll\")"],
      },
    },

    // ══════════════════════════════════════════════
    // Application Layer — Use Cases
    // ══════════════════════════════════════════════

    {
      id: "login-uc",
      label: "LoginAppService",
      type: "usecase",
      layer: "application",
      subtitle: "로그인",
      operations: ["execute(context, command): LoginResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/auth/LoginAppService.kt",
        className: "LoginAppService",
        packageName: "com.lms.application.auth",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "register-uc",
      label: "RegisterAppService",
      type: "usecase",
      layer: "application",
      subtitle: "회원가입",
      operations: ["execute(context, command): UserResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/auth/RegisterAppService.kt",
        className: "RegisterAppService",
        packageName: "com.lms.application.auth",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "create-employee-uc",
      label: "CreateEmployeeAppService",
      type: "usecase",
      layer: "application",
      subtitle: "직원 등록",
      operations: ["execute(context, command): EmployeeResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/employee/CreateEmployeeAppService.kt",
        className: "CreateEmployeeAppService",
        packageName: "com.lms.application.employee",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "create-leave-uc",
      label: "CreateLeaveRequestAppService",
      type: "usecase",
      layer: "application",
      subtitle: "휴가 신청",
      description:
        "직원 존재 확인 → 잔여 연차 검증(LeavePolicyService) → 기간 중복 체크 → LeaveRequest 생성",
      operations: ["execute(context, command): LeaveRequestResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/leave/CreateLeaveRequestAppService.kt",
        className: "CreateLeaveRequestAppService",
        packageName: "com.lms.application.leave",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "approve-leave-uc",
      label: "ApproveLeaveRequestAppService",
      type: "usecase",
      layer: "application",
      subtitle: "휴가 승인",
      description:
        "LeaveRequest.approve() → Employee.deductLeave() — 두 Aggregate를 조율하는 Use Case",
      operations: ["execute(context, leaveId): LeaveRequestResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/leave/ApproveLeaveRequestAppService.kt",
        className: "ApproveLeaveRequestAppService",
        packageName: "com.lms.application.leave",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "cancel-leave-uc",
      label: "CancelLeaveRequestAppService",
      type: "usecase",
      layer: "application",
      subtitle: "휴가 취소",
      description:
        "승인된 휴가 취소 시 Employee.restoreLeave() 호출 — 보상 로직 포함",
      operations: ["execute(context, leaveId): LeaveRequestResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/leave/CancelLeaveRequestAppService.kt",
        className: "CancelLeaveRequestAppService",
        packageName: "com.lms.application.leave",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "check-in-uc",
      label: "CheckInAppService",
      type: "usecase",
      layer: "application",
      subtitle: "출근 기록",
      operations: ["execute(context, command): AttendanceRecordResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/attendance/CheckInAppService.kt",
        className: "CheckInAppService",
        packageName: "com.lms.application.attendance",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "check-out-uc",
      label: "CheckOutAppService",
      type: "usecase",
      layer: "application",
      subtitle: "퇴근 기록",
      description:
        "퇴근 기록 후 WorkSchedule과 비교하여 AttendanceStatus 평가 (정상/지각/조퇴)",
      operations: ["execute(context, command): AttendanceRecordResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/attendance/CheckOutAppService.kt",
        className: "CheckOutAppService",
        packageName: "com.lms.application.attendance",
        annotations: ["@Service", "@Transactional"],
      },
    },
    {
      id: "calc-payroll-uc",
      label: "CalculatePayrollAppService",
      type: "usecase",
      layer: "application",
      subtitle: "급여 계산",
      description:
        "가장 복잡한 Use Case. 근태기록 + 승인된 휴가 + 급여정책을 " +
        "PayrollCalculationEngine에 전달하여 급여 산출",
      operations: ["execute(context, command): PayrollResult"],
      codeMapping: {
        filePath: "application/src/main/kotlin/com/lms/application/payroll/CalculatePayrollAppService.kt",
        className: "CalculatePayrollAppService",
        packageName: "com.lms.application.payroll",
        annotations: ["@Service", "@Transactional"],
      },
    },

    // ══════════════════════════════════════════════
    // Domain Layer — Aggregate Roots
    // ══════════════════════════════════════════════

    {
      id: "user-agg",
      label: "User",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description: "인증 신원. Employee와 1:1 관계. 로그인/비밀번호 변경/비활성화",
      operations: [
        "create(context, email, password, role): User",
        "login(context): User",
        "changePassword(context, newPassword): User",
        "deactivate(context): User",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/user/User.kt",
        className: "User",
        packageName: "com.lms.domain.model.user",
      },
    },
    {
      id: "employee-agg",
      label: "Employee",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description:
        "근로자 프로필. UserId 참조로 User와 연결. 잔여 연차(RemainingLeave) 관리",
      operations: [
        "create(context, userId, name, type, storeId): Employee",
        "deductLeave(context, days): Employee",
        "restoreLeave(context, days): Employee",
        "assignStore(context, storeId): Employee",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/employee/Employee.kt",
        className: "Employee",
        packageName: "com.lms.domain.model.employee",
      },
    },
    {
      id: "store-agg",
      label: "Store",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description: "직원이 근무하는 매장. WorkSchedule과 Employee에서 참조",
      operations: [
        "create(context, name, location): Store",
        "update(context, name, location): Store",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/store/Store.kt",
        className: "Store",
        packageName: "com.lms.domain.model.store",
      },
    },
    {
      id: "leave-request-agg",
      label: "LeaveRequest",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description:
        "휴가 신청. PENDING → APPROVED/REJECTED 워크플로. 승인 시 Employee 연차 차감",
      operations: [
        "create(context, employeeId, type, period, reason): LeaveRequest",
        "approve(context, approverId): LeaveRequest",
        "reject(context, approverId, reason): LeaveRequest",
        "cancel(context): LeaveRequest",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/leave/LeaveRequest.kt",
        className: "LeaveRequest",
        packageName: "com.lms.domain.model.leave",
      },
    },
    {
      id: "attendance-agg",
      label: "AttendanceRecord",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description:
        "출퇴근 기록. 퇴근 시 WorkSchedule과 비교하여 상태 평가 (10분 유예)",
      operations: [
        "checkIn(context, employeeId, scheduleId, time): AttendanceRecord",
        "checkOut(context, time): AttendanceRecord",
        "evaluateStatus(context, schedule): AttendanceRecord",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/attendance/AttendanceRecord.kt",
        className: "AttendanceRecord",
        packageName: "com.lms.domain.model.attendance",
      },
    },
    {
      id: "schedule-agg",
      label: "WorkSchedule",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description: "근무 스케줄. Employee × Store × Date. 근태 평가의 기준",
      operations: [
        "create(context, employeeId, storeId, date, time): WorkSchedule",
        "confirm(context): WorkSchedule",
        "changeWorkTime(context, newTime): WorkSchedule",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/schedule/WorkSchedule.kt",
        className: "WorkSchedule",
        packageName: "com.lms.domain.model.schedule",
      },
    },
    {
      id: "payroll-agg",
      label: "Payroll",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description: "급여. 기본급 + 초과근무 - 공제 구조. PayrollDetail로 일별 명세 관리",
      operations: [
        "create(context, employeeId, period, amount): Payroll",
        "markAsPaid(context): Payroll",
        "recalculate(context, newAmount): Payroll",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/payroll/Payroll.kt",
        className: "Payroll",
        packageName: "com.lms.domain.model.payroll",
      },
    },
    {
      id: "payroll-policy-agg",
      label: "PayrollPolicy",
      type: "aggregate",
      layer: "domain",
      subtitle: "Aggregate Root",
      description:
        "급여 정책. 초과근무 배율(평일 1.5x, 주말 2x, 공휴일 2.5x). 유효 기간 관리",
      operations: [
        "create(context, type, multiplier, period): PayrollPolicy",
        "terminate(context, endDate): PayrollPolicy",
        "applyTo(baseAmount): BigDecimal",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/payroll/PayrollPolicy.kt",
        className: "PayrollPolicy",
        packageName: "com.lms.domain.model.payroll",
      },
    },

    // ── Domain Layer — Value Objects (Aggregate 내부) ──

    {
      id: "remaining-leave-vo",
      label: "RemainingLeave",
      type: "value_object",
      layer: "domain",
      subtitle: "잔여 연차",
      aggregateId: "employee-agg",
      description: "BigDecimal 기반. deduct/add 연산 시 잔액 검증",
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/employee/RemainingLeave.kt",
        className: "RemainingLeave",
        packageName: "com.lms.domain.model.employee",
      },
    },
    {
      id: "leave-period-vo",
      label: "LeavePeriod",
      type: "value_object",
      layer: "domain",
      subtitle: "휴가 기간",
      aggregateId: "leave-request-agg",
      description: "시작일/종료일 캡슐화. 기간 중복(overlapsWith) 검증 내장",
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/leave/LeavePeriod.kt",
        className: "LeavePeriod",
        packageName: "com.lms.domain.model.leave",
      },
    },
    {
      id: "attendance-time-vo",
      label: "AttendanceTime",
      type: "value_object",
      layer: "domain",
      subtitle: "출퇴근 시간",
      aggregateId: "attendance-agg",
      description: "checkIn/checkOut 시간 캡슐화. 실근무시간 계산",
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/attendance/AttendanceTime.kt",
        className: "AttendanceTime",
        packageName: "com.lms.domain.model.attendance",
      },
    },
    {
      id: "payroll-amount-vo",
      label: "PayrollAmount",
      type: "value_object",
      layer: "domain",
      subtitle: "급여 금액",
      aggregateId: "payroll-agg",
      description: "기본급 + 초과근무 - 공제. 합계 산출 로직 내장",
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/model/payroll/PayrollAmount.kt",
        className: "PayrollAmount",
        packageName: "com.lms.domain.model.payroll",
      },
    },

    // ── Domain Layer — Domain Services ──

    {
      id: "leave-policy-svc",
      label: "LeavePolicyService",
      type: "domain_service",
      layer: "domain",
      subtitle: "연차 정책",
      description:
        "순수 도메인 서비스 (Spring 의존성 0). 직원 유형별 연차 일수 결정 및 잔액 검증",
      operations: [
        "getAnnualLeaveByEmployeeType(type): BigDecimal",
        "validateLeaveRequest(type, remaining, requested): String?",
        "canRequestLeave(type, remaining, requested): Boolean",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/service/LeavePolicyService.kt",
        className: "LeavePolicyService",
        packageName: "com.lms.domain.service",
      },
    },
    {
      id: "payroll-calc-engine",
      label: "PayrollCalculationEngine",
      type: "domain_service",
      layer: "domain",
      subtitle: "급여 계산 엔진",
      description:
        "순수 도메인 서비스. 근태기록 + 휴가 + 정책으로 일별 급여를 계산. " +
        "근무유형 판별(평일/야간/주말/공휴일) → 배율 적용 → 합산",
      operations: [
        "calculate(records, leaves, rate, policies): PayrollCalculationResult",
      ],
      codeMapping: {
        filePath: "domain/src/main/kotlin/com/lms/domain/service/PayrollCalculationEngine.kt",
        className: "PayrollCalculationEngine",
        packageName: "com.lms.domain.service",
      },
    },

    // ══════════════════════════════════════════════
    // Infrastructure Layer — Repository 구현체 & Adapters
    // ══════════════════════════════════════════════

    {
      id: "user-repo",
      label: "UserRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "User 저장소",
      operations: ["save(user)", "findById(id)", "findByEmail(email)"],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/UserRepositoryImpl.kt",
        className: "UserRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "employee-repo",
      label: "EmployeeRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "Employee 저장소",
      operations: [
        "save(employee)",
        "findById(id)",
        "findByUserId(userId)",
        "findByStoreId(storeId)",
      ],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/EmployeeRepositoryImpl.kt",
        className: "EmployeeRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "store-repo",
      label: "StoreRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "Store 저장소",
      operations: ["save(store)", "findById(id)", "findAll()"],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/StoreRepositoryImpl.kt",
        className: "StoreRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "leave-repo",
      label: "LeaveRequestRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "LeaveRequest 저장소",
      operations: [
        "save(request)",
        "findById(id)",
        "findByEmployeeId(id)",
        "findPendingRequests()",
      ],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/LeaveRequestRepositoryImpl.kt",
        className: "LeaveRequestRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "attendance-repo",
      label: "AttendanceRecordRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "AttendanceRecord 저장소",
      operations: [
        "save(record)",
        "findByEmployeeIdAndDate(id, date)",
        "findByDateRange(start, end)",
      ],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/AttendanceRecordRepositoryImpl.kt",
        className: "AttendanceRecordRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "schedule-repo",
      label: "WorkScheduleRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "WorkSchedule 저장소",
      operations: [
        "save(schedule)",
        "findById(id)",
        "findByStoreIdAndDateRange(storeId, start, end)",
      ],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/WorkScheduleRepositoryImpl.kt",
        className: "WorkScheduleRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "payroll-repo",
      label: "PayrollRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "Payroll 저장소",
      operations: [
        "save(payroll)",
        "findByEmployeeIdAndPeriod(id, period)",
        "findByPeriod(period)",
      ],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/PayrollRepositoryImpl.kt",
        className: "PayrollRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "payroll-policy-repo",
      label: "PayrollPolicyRepositoryImpl",
      type: "repository",
      layer: "infrastructure",
      subtitle: "PayrollPolicy 저장소",
      operations: [
        "save(policy)",
        "findEffectivePolicies(date)",
        "findByType(type)",
      ],
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/persistence/repository/PayrollPolicyRepositoryImpl.kt",
        className: "PayrollPolicyRepositoryImpl",
        packageName: "com.lms.infrastructure.persistence.repository",
        annotations: ["@Repository", "@Transactional"],
      },
    },
    {
      id: "token-provider",
      label: "JwtTokenProvider",
      type: "adapter",
      layer: "infrastructure",
      subtitle: "JWT 토큰",
      description: "TokenProvider 인터페이스 구현체. Access/Refresh 토큰 생성 및 검증",
      codeMapping: {
        filePath: "infrastructure/src/main/kotlin/com/lms/infrastructure/security/JwtTokenProvider.kt",
        className: "JwtTokenProvider",
        packageName: "com.lms.infrastructure.security",
        annotations: ["@Component"],
      },
    },
  ],

  edges: [
    // ── Presentation → Application ──────────────────
    { from: "auth-ctrl", to: "login-uc", type: "invokes", method: "execute" },
    { from: "auth-ctrl", to: "register-uc", type: "invokes", method: "execute" },
    { from: "employee-ctrl", to: "create-employee-uc", type: "invokes", method: "execute" },
    { from: "leave-ctrl", to: "create-leave-uc", type: "invokes", method: "execute" },
    { from: "leave-ctrl", to: "approve-leave-uc", type: "invokes", method: "execute" },
    { from: "leave-ctrl", to: "cancel-leave-uc", type: "invokes", method: "execute" },
    { from: "attendance-ctrl", to: "check-in-uc", type: "invokes", method: "execute" },
    { from: "attendance-ctrl", to: "check-out-uc", type: "invokes", method: "execute" },
    { from: "payroll-ctrl", to: "calc-payroll-uc", type: "invokes", method: "execute" },

    // ── Application → Domain (Aggregates) ───────────
    { from: "login-uc", to: "user-agg", type: "invokes", method: "login" },
    { from: "register-uc", to: "user-agg", type: "invokes", method: "create" },
    { from: "create-employee-uc", to: "employee-agg", type: "invokes", method: "create" },
    { from: "create-leave-uc", to: "leave-request-agg", type: "invokes", method: "create" },
    { from: "approve-leave-uc", to: "leave-request-agg", type: "invokes", method: "approve" },
    { from: "approve-leave-uc", to: "employee-agg", type: "invokes", method: "deductLeave" },
    { from: "cancel-leave-uc", to: "leave-request-agg", type: "invokes", method: "cancel" },
    { from: "cancel-leave-uc", to: "employee-agg", type: "invokes", method: "restoreLeave" },
    { from: "check-in-uc", to: "attendance-agg", type: "invokes", method: "checkIn" },
    { from: "check-out-uc", to: "attendance-agg", type: "invokes", method: "checkOut" },
    { from: "check-out-uc", to: "schedule-agg", type: "depends_on", label: "status 평가용 조회" },
    { from: "calc-payroll-uc", to: "payroll-agg", type: "invokes", method: "create" },

    // ── Application → Domain Services ───────────────
    { from: "create-leave-uc", to: "leave-policy-svc", type: "invokes", method: "validateLeaveRequest" },
    { from: "calc-payroll-uc", to: "payroll-calc-engine", type: "invokes", method: "calculate" },

    // ── Application → Infrastructure (Repositories) ─
    { from: "login-uc", to: "user-repo", type: "invokes", method: "findByEmail" },
    { from: "register-uc", to: "user-repo", type: "invokes", method: "save" },
    { from: "login-uc", to: "token-provider", type: "invokes", method: "generateToken" },
    { from: "create-employee-uc", to: "employee-repo", type: "invokes", method: "save" },
    { from: "create-leave-uc", to: "leave-repo", type: "invokes", method: "save" },
    { from: "create-leave-uc", to: "employee-repo", type: "invokes", method: "findById" },
    { from: "approve-leave-uc", to: "leave-repo", type: "invokes", method: "findById" },
    { from: "approve-leave-uc", to: "employee-repo", type: "invokes", method: "findById" },
    { from: "cancel-leave-uc", to: "leave-repo", type: "invokes", method: "findById" },
    { from: "cancel-leave-uc", to: "employee-repo", type: "invokes", method: "findById" },
    { from: "check-in-uc", to: "attendance-repo", type: "invokes", method: "save" },
    { from: "check-out-uc", to: "attendance-repo", type: "invokes", method: "findByEmployeeIdAndDate" },
    { from: "check-out-uc", to: "schedule-repo", type: "invokes", method: "findById" },
    { from: "calc-payroll-uc", to: "payroll-repo", type: "invokes", method: "save" },
    { from: "calc-payroll-uc", to: "employee-repo", type: "invokes", method: "findById" },
    { from: "calc-payroll-uc", to: "attendance-repo", type: "invokes", method: "findByDateRange" },
    { from: "calc-payroll-uc", to: "leave-repo", type: "invokes", method: "findByEmployeeId" },
    { from: "calc-payroll-uc", to: "payroll-policy-repo", type: "invokes", method: "findEffectivePolicies" },

    // ── Domain 내부 (Aggregate → VO) ────────────────
    { from: "employee-agg", to: "remaining-leave-vo", type: "creates" },
    { from: "leave-request-agg", to: "leave-period-vo", type: "creates" },
    { from: "attendance-agg", to: "attendance-time-vo", type: "creates" },
    { from: "payroll-agg", to: "payroll-amount-vo", type: "creates" },
  ],
};
