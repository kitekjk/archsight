# archsight-scanner 설계 문서

## 목표

Spring Boot (Java/Kotlin) 프로젝트의 소스 코드를 정적 분석하여 `BoundedContextGraph` JSON을 자동 생성하는 Kotlin CLI 도구.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 기술 | Kotlin + JavaParser (Java) + kotlin-compiler PSI (Kotlin) |
| 분석 방식 | 소스 코드 파싱 (컴파일 불필요) |
| 배포 | 독립 CLI (fat JAR, 향후 GraalVM native-image 가능) |
| 출력 포맷 | `BoundedContextGraph` JSON (schema/spec-metadata.ts 스키마 준수) |
| 출력 위치 | 기본: `<project>/.archsight/base-graph.json` |
| 모노레포 위치 | `archsight/scanner/` |
| MVP 범위 | 구조 + 의존관계 (ChangeSet 생성은 범위 외 — spec-ai에서 담당) |

## 파이프라인

```
소스 디렉토리
  → FileCollector (*.java, *.kt 수집, test 제외)
    → AnnotationParser (Spring 어노테이션 + 클래스 메타데이터 추출)
      → MetaAnnotationResolver (커스텀 어노테이션 → Spring 표준 해석)
        → DependencyResolver (생성자 주입 → 엣지 생성)
          → LayerClassifier (어노테이션 + 패키지명 → DDD 레이어 판별)
            → GraphBuilder (노드 + 엣지 조합 → BoundedContextGraph)
              → JSON 출력
```

## 단계별 상세

### FileCollector

- 입력: 소스 루트 경로 (예: `src/main/kotlin/`, `src/main/java/`)
- 멀티모듈 지원: settings.gradle.kts에서 모듈 목록 파싱 → 각 모듈의 src/main/ 탐색
- 필터: `**/src/test/**` 제외, `*.java` 및 `*.kt` 파일만 수집
- 출력: 파일 경로 + 언어(Java/Kotlin) 목록

### AnnotationParser

**Java (JavaParser 사용)**:
- 클래스 선언 파싱: 이름, 패키지, 어노테이션, implements/extends
- 생성자 파라미터: 타입 + 이름 (DI 의존성)
- 메서드 시그니처: public 메서드 목록 (operations 필드용)
- 필드: @Embeddable, @Entity 등 어노테이션 확인

**Kotlin (kotlin-compiler PSI 사용)**:
- 클래스 선언 파싱: 이름, 패키지, 어노테이션
- primary constructor 파라미터: 타입 + 이름
- 함수 시그니처: public 함수 목록
- companion object의 factory method 감지 (create, reconstruct 등)

**공통 출력 — ClassMetadata**:
```kotlin
data class ClassMetadata(
    val filePath: String,           // 프로젝트 루트 기준 상대 경로
    val packageName: String,
    val className: String,
    val annotations: List<String>,  // @RestController, @Service, etc.
    val constructorParams: List<ParamInfo>,  // DI 주입 대상
    val methods: List<String>,      // public 메서드 시그니처
    val superTypes: List<String>,   // implements/extends
    val language: Language,         // JAVA | KOTLIN
)

data class ParamInfo(
    val name: String,
    val typeName: String,
)

enum class Language { JAVA, KOTLIN }
```

### MetaAnnotationResolver (신규)

커스텀 어노테이션의 meta-annotation을 추적하여 Spring 표준 어노테이션으로 해석.

**동작:**
1. 프로젝트 내 모든 `@interface` (Java) / `annotation class` (Kotlin) 파일을 먼저 수집
2. 각 어노테이션 클래스의 소스를 파싱하여 meta-annotation 매핑 테이블 구축
   - 예: `@UseCase` → `@Service` → Spring managed bean
   - 예: `@DomainService` → `@Service`
3. ClassMetadata의 annotations 필드를 확장: 직접 어노테이션 + 해석된 meta-annotation 모두 포함

**예시:**
```kotlin
// 프로젝트에 정의된 커스텀 어노테이션
@Service
@Target(AnnotationTarget.CLASS)
annotation class UseCase

// 사용하는 클래스
@UseCase
class CancelOrderUseCase(...)

// MetaAnnotationResolver 결과:
// annotations = ["@UseCase", "@Service"]  ← @Service가 추가됨
```

**fallback (meta-annotation 추적 실패 시):**
- 어노테이션 소스가 프로젝트 내에 없는 경우 (외부 라이브러리) → 빌트인 매핑 → 클래스명 + 패키지명 패턴으로 추론

### KnownAnnotations (빌트인 매핑)

외부 프레임워크 어노테이션 중 자주 쓰이는 것들을 내장 매핑으로 제공:

```kotlin
// 스캐너에 기본 포함
val KNOWN_ANNOTATIONS = mapOf(
    // Spring
    "@TransactionalEventListener" to AnnotationMapping(layer = DOMAIN, type = POLICY),
    "@Scheduled"                  to AnnotationMapping(layer = INFRASTRUCTURE, type = ADAPTER),
    "@Async"                      to AnnotationMapping(layer = INFRASTRUCTURE, type = ADAPTER),
    // Temporal
    "@WorkflowImpl"               to AnnotationMapping(layer = PRESENTATION, type = CONTROLLER),
    "@ActivityImpl"               to AnnotationMapping(layer = PRESENTATION, type = CONTROLLER),
    // JPA
    "@MappedSuperclass"           to AnnotationMapping(layer = DOMAIN, type = ENTITY),
)
```

### 사용자 확장 설정 (.archsight/config.yaml)

빌트인에 없는 어노테이션은 프로젝트별 설정으로 확장:

```yaml
# .archsight/config.yaml
custom-annotations:
  "@MyCustomHandler":
    layer: application
    type: usecase
  "@ExternalGateway":
    layer: infrastructure
    type: adapter
```

**우선순위**: 사용자 설정 > MetaAnnotationResolver (프로젝트 내 소스 추적) > 빌트인 매핑 > 클래스명/패키지명 패턴 fallback

### LayerClassifier

어노테이션 기반 1차 판별 (meta-annotation + 빌트인 + 사용자 설정 포함) → 패키지명 fallback:

```
규칙 (우선순위 순):

1. @RestController, @Controller, @WorkflowImpl, @ActivityImpl → presentation
2. @Service + 클래스명이 *UseCase/*AppService       → application
3. @Service + domain 패키지에 위치                  → domain (domain_service)
4. @Service + 그 외                                → application (기본)
5. @Entity                                         → domain
6. @Embeddable, @MappedSuperclass                  → domain
7. @Repository                                     → infrastructure
8. @Component + 클래스명이 *Adapter/*Client/*Gateway → infrastructure
9. @Component + 그 외                              → infrastructure (기본)
10. @EventListener, @TransactionalEventListener     → domain (policy)
11. 어노테이션 없음 → 패키지명으로 판별:
    - *.presentation.*, *.web.*, *.controller.*     → presentation
    - *.application.*, *.usecase.*                  → application
    - *.domain.*, *.model.*                         → domain
    - *.infrastructure.*, *.persistence.*, *.config.* → infrastructure
```

### DddComponentType 매핑

```
어노테이션/패턴                         → DddComponentType
──────────────────────────────────────────────────────
@RestController, @Controller            → controller
@Service + *UseCase/*AppService         → usecase
@Service + domain 패키지                → domain_service
@Entity + Aggregate Root 판별*          → aggregate
@Entity + aggregateId 참조 있음         → entity
@Embeddable, 클래스명 *VO              → value_object
@Repository                            → repository
@Component + *Adapter/*Client           → adapter
@EventListener, *Policy, *Saga         → policy
클래스명 *Event, *DomainEvent           → domain_event
클래스명 *Command                       → command
클래스명 *Query                         → query

* Aggregate Root 판별: 다른 @Entity에서 참조되지 않는 최상위 @Entity
```

### DependencyResolver

**엣지 생성 규칙:**

```
패턴                                    → EdgeType
──────────────────────────────────────────────────────
생성자 주입 (일반)                       → depends_on
controller → usecase 주입               → invokes
usecase → aggregate/domain_service 주입  → invokes
usecase/service → repository 주입        → invokes
implements/extends 관계                  → implements
@EventListener 파라미터 타입 매칭        → subscribes
ApplicationEventPublisher 주입 시        → (노드에만 기록, 구체적 이벤트는 파악 불가)
Aggregate 내 @Entity/@Embeddable 포함    → creates
```

**from/to 매핑:**
- 생성자에 주입되는 타입의 className → 해당 ClassMetadata의 노드 ID로 매핑
- 인터페이스 주입인 경우: 인터페이스를 implements하는 클래스와도 연결

### GraphBuilder

**노드 ID 생성 규칙:**
- className을 kebab-case로 변환: `CancelOrderUseCase` → `cancel-order-use-case`
- 충돌 시 패키지 prefix 추가: `order-cancel-order-use-case`

**BoundedContextGraph 조합:**
```kotlin
BoundedContextGraph(
    context = ContextInfo(
        id = projectName.toKebabCase(),
        name = projectName,
        description = "Auto-generated by archsight-scanner",
    ),
    layers = DEFAULT_DDD_LAYERS,
    nodes = classMetadataList.map { toComponentNode(it) },
    edges = dependencyPairs.map { toDependencyEdge(it) },
)
```

**ComponentNode 매핑:**
```kotlin
fun toComponentNode(meta: ClassMetadata): ComponentNode = ComponentNode(
    id = meta.className.toKebabCase(),
    label = meta.className,
    type = classifyType(meta),
    layer = classifyLayer(meta),
    subtitle = generateSubtitle(meta),  // 어노테이션 기반 (예: "REST API endpoint")
    operations = meta.methods,
    codeMapping = CodeMapping(
        filePath = meta.filePath,
        className = meta.className,
        packageName = meta.packageName,
        annotations = meta.annotations,
    ),
)
```

## CLI 인터페이스

```bash
# 기본 사용 — 프로젝트 루트에서 실행
archsight-scanner scan /path/to/project

# 출력 위치 지정
archsight-scanner scan /path/to/project -o .archsight/base-graph.json

# BC 이름 지정
archsight-scanner scan /path/to/project --name "LMS"

# 특정 모듈만 스캔
archsight-scanner scan /path/to/project --module domain,application

# JSON 표준 출력 (파이프용)
archsight-scanner scan /path/to/project --stdout
```

기본 동작:
- 출력: `<project>/.archsight/base-graph.json`
- settings.gradle.kts 감지 → 멀티모듈 자동 탐색
- build.gradle.kts 감지 → 단일 모듈 탐색

## Gradle 빌드 설정 (scanner/)

```
scanner/
├── build.gradle.kts          # Kotlin 프로젝트 설정
├── settings.gradle.kts
├── gradle/
│   └── wrapper/
├── src/
│   ├── main/kotlin/com/archsight/scanner/
│   │   ├── Main.kt                  # CLI 진입점
│   │   ├── FileCollector.kt
│   │   ├── parser/
│   │   │   ├── JavaClassParser.kt   # JavaParser 래퍼
│   │   │   ├── KotlinClassParser.kt # kotlin-compiler PSI 래퍼
│   │   │   └── ClassMetadata.kt     # 공통 메타데이터 모델
│   │   ├── classifier/
│   │   │   ├── MetaAnnotationResolver.kt
│   │   │   ├── LayerClassifier.kt
│   │   │   └── TypeClassifier.kt
│   │   ├── resolver/
│   │   │   └── DependencyResolver.kt
│   │   ├── graph/
│   │   │   ├── GraphBuilder.kt
│   │   │   └── JsonModels.kt        # BoundedContextGraph Kotlin 모델
│   │   └── util/
│   │       └── NamingUtils.kt       # kebab-case 변환 등
│   └── test/kotlin/com/archsight/scanner/
│       ├── parser/
│       ├── classifier/
│       ├── resolver/
│       └── integration/
│           ├── LmsDemoScanTest.kt   # lms-demo 프로젝트 스캔 검증
│           └── ScmHubScanTest.kt    # scm-hub-be 프로젝트 스캔 검증
```

## 의존성

```kotlin
// build.gradle.kts
dependencies {
    // Java 소스 파싱
    implementation("com.github.javaparser:javaparser-core:3.26.+")

    // Kotlin 소스 파싱
    implementation("org.jetbrains.kotlin:kotlin-compiler-embeddable:2.1.0")

    // JSON 직렬화
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.+")

    // CLI 파싱
    implementation("com.github.ajalt.clikt:clikt:5.0.+")

    // 테스트
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.+")
    testImplementation("io.strikt:strikt-core:0.35.+")
}
```

## 테스트 전략

**단위 테스트:**
- JavaClassParser: Java 소스 문자열 → ClassMetadata 검증
- KotlinClassParser: Kotlin 소스 문자열 → ClassMetadata 검증
- LayerClassifier: 어노테이션/패키지 조합 → 레이어 판별 검증
- TypeClassifier: 어노테이션/이름 패턴 → DddComponentType 판별 검증
- DependencyResolver: 생성자 파라미터 → 엣지 생성 검증
- NamingUtils: 클래스명 → kebab-case 변환 검증

**통합 테스트:**
- lms-demo 스캔 → 노드 수, 레이어 분류, 주요 의존관계 검증
- scm-hub-be 스캔 → 도메인 레이어에 repository가 나오는지 검증 (레이어 위반 감지)

## MVP 범위 외

- ChangeSet 생성 (spec-ai에서 담당)
- PR diff 비교
- 파일 watch / 실시간 재스캔
- IDE 플러그인 내장 실행
- GraalVM native-image 빌드
