# archsight-scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spring Boot (Java/Kotlin) 프로젝트를 정적 분석하여 BoundedContextGraph JSON을 자동 생성하는 Kotlin CLI 도구 구현.

**Architecture:** 소스 파일 수집 → AST 파싱 (JavaParser/kotlin-compiler PSI) → 커스텀 어노테이션 해석 → DDD 레이어/타입 분류 → 의존관계 추출 → JSON 출력. 각 단계가 독립 클래스로 분리되어 단위 테스트 가능.

**Tech Stack:** Kotlin 2.1, Gradle (Kotlin DSL), JavaParser 3.26, kotlin-compiler-embeddable 2.1, Jackson, Clikt 5, JUnit 5

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `scanner/build.gradle.kts` | Gradle 빌드 설정 |
| Create | `scanner/settings.gradle.kts` | 프로젝트 설정 |
| Create | `scanner/src/main/kotlin/.../model/ClassMetadata.kt` | 공통 메타데이터 모델 |
| Create | `scanner/src/main/kotlin/.../model/JsonModels.kt` | BoundedContextGraph Kotlin 모델 |
| Create | `scanner/src/main/kotlin/.../util/NamingUtils.kt` | 이름 변환 유틸 |
| Create | `scanner/src/main/kotlin/.../FileCollector.kt` | 소스 파일 수집 |
| Create | `scanner/src/main/kotlin/.../parser/JavaClassParser.kt` | Java AST 파싱 |
| Create | `scanner/src/main/kotlin/.../parser/KotlinClassParser.kt` | Kotlin AST 파싱 |
| Create | `scanner/src/main/kotlin/.../classifier/KnownAnnotations.kt` | 빌트인 어노테이션 매핑 |
| Create | `scanner/src/main/kotlin/.../classifier/MetaAnnotationResolver.kt` | 커스텀 어노테이션 해석 |
| Create | `scanner/src/main/kotlin/.../classifier/LayerClassifier.kt` | DDD 레이어 판별 |
| Create | `scanner/src/main/kotlin/.../classifier/TypeClassifier.kt` | DDD 타입 판별 |
| Create | `scanner/src/main/kotlin/.../resolver/DependencyResolver.kt` | 의존관계 엣지 생성 |
| Create | `scanner/src/main/kotlin/.../graph/GraphBuilder.kt` | 최종 그래프 조합 |
| Create | `scanner/src/main/kotlin/.../Main.kt` | CLI 진입점 (Clikt) |

*Note:* `...` = `com/archsight/scanner`

---

### Task 1: Gradle 프로젝트 세팅 + 데이터 모델

**Files:**
- Create: `scanner/build.gradle.kts`
- Create: `scanner/settings.gradle.kts`
- Create: `scanner/src/main/kotlin/com/archsight/scanner/model/ClassMetadata.kt`
- Create: `scanner/src/main/kotlin/com/archsight/scanner/model/JsonModels.kt`
- Create: `scanner/src/main/kotlin/com/archsight/scanner/util/NamingUtils.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/util/NamingUtilsTest.kt`

- [ ] **Step 1: Gradle wrapper 설치**

```bash
cd scanner
gradle wrapper --gradle-version 8.11
```

- [ ] **Step 2: settings.gradle.kts**

```kotlin
// scanner/settings.gradle.kts
rootProject.name = "archsight-scanner"
```

- [ ] **Step 3: build.gradle.kts**

```kotlin
// scanner/build.gradle.kts
plugins {
    kotlin("jvm") version "2.1.0"
    application
}

application {
    mainClass.set("com.archsight.scanner.MainKt")
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.github.javaparser:javaparser-core:3.26.4")
    implementation("org.jetbrains.kotlin:kotlin-compiler-embeddable:2.1.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.3")
    implementation("com.github.ajalt.clikt:clikt:5.0.3")

    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
}

tasks.test {
    useJUnitPlatform()
}

kotlin {
    jvmToolchain(17)
}

tasks.jar {
    manifest {
        attributes["Main-Class"] = "com.archsight.scanner.MainKt"
    }
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}
```

- [ ] **Step 4: ClassMetadata.kt**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/model/ClassMetadata.kt
package com.archsight.scanner.model

enum class Language { JAVA, KOTLIN }

data class ParamInfo(
    val name: String,
    val typeName: String,
)

data class ClassMetadata(
    val filePath: String,
    val packageName: String,
    val className: String,
    val annotations: List<String>,
    val constructorParams: List<ParamInfo>,
    val methods: List<String>,
    val superTypes: List<String>,
    val language: Language,
    val isAnnotationClass: Boolean = false,
)
```

- [ ] **Step 5: JsonModels.kt**

BoundedContextGraph의 Kotlin 표현. `schema/spec-metadata.ts` 스키마와 정확히 매칭.

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/model/JsonModels.kt
package com.archsight.scanner.model

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class BoundedContextGraph(
    val context: ContextInfo,
    val layers: List<LayerConfig>? = null,
    val nodes: List<ComponentNode>,
    val edges: List<DependencyEdge>,
)

data class ContextInfo(
    val id: String,
    val name: String,
    val description: String? = null,
    val team: String? = null,
)

data class LayerConfig(
    val id: String,
    val displayName: String? = null,
    val order: Int,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ComponentNode(
    val id: String,
    val label: String,
    val type: String,
    val layer: String,
    val subtitle: String? = null,
    val description: String? = null,
    val aggregateId: String? = null,
    val operations: List<String>? = null,
    val codeMapping: CodeMapping? = null,
    val tags: List<String>? = null,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class CodeMapping(
    val filePath: String,
    val className: String,
    val packageName: String? = null,
    val annotations: List<String>? = null,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class DependencyEdge(
    val from: String,
    val to: String,
    val type: String? = null,
    val label: String? = null,
    val method: String? = null,
)
```

- [ ] **Step 6: NamingUtils.kt**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/util/NamingUtils.kt
package com.archsight.scanner.util

object NamingUtils {
    /**
     * PascalCase/camelCase → kebab-case
     * "CancelOrderUseCase" → "cancel-order-use-case"
     * "OrderController" → "order-controller"
     */
    fun toKebabCase(name: String): String {
        return name
            .replace(Regex("([a-z])([A-Z])"), "$1-$2")
            .replace(Regex("([A-Z]+)([A-Z][a-z])"), "$1-$2")
            .lowercase()
    }

    /**
     * 어노테이션 이름을 정규화: "@RestController" → "@RestController"
     * 이미 @가 있으면 그대로, 없으면 추가
     */
    fun normalizeAnnotation(name: String): String {
        return if (name.startsWith("@")) name else "@$name"
    }

    /**
     * 어노테이션에서 파라미터 제거: "@RequestMapping(\"/api\")" → "@RequestMapping"
     */
    fun stripAnnotationParams(annotation: String): String {
        val parenIndex = annotation.indexOf('(')
        return if (parenIndex > 0) annotation.substring(0, parenIndex) else annotation
    }
}
```

- [ ] **Step 7: NamingUtils 테스트**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/util/NamingUtilsTest.kt
package com.archsight.scanner.util

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class NamingUtilsTest {
    @Test
    fun `PascalCase to kebab-case`() {
        assertEquals("cancel-order-use-case", NamingUtils.toKebabCase("CancelOrderUseCase"))
        assertEquals("order-controller", NamingUtils.toKebabCase("OrderController"))
        assertEquals("jpa-order-repository", NamingUtils.toKebabCase("JpaOrderRepository"))
        assertEquals("order", NamingUtils.toKebabCase("Order"))
    }

    @Test
    fun `normalizeAnnotation adds @ prefix`() {
        assertEquals("@Service", NamingUtils.normalizeAnnotation("Service"))
        assertEquals("@Service", NamingUtils.normalizeAnnotation("@Service"))
    }

    @Test
    fun `stripAnnotationParams removes parameters`() {
        assertEquals("@RequestMapping", NamingUtils.stripAnnotationParams("@RequestMapping(\"/api\")"))
        assertEquals("@Service", NamingUtils.stripAnnotationParams("@Service"))
    }
}
```

- [ ] **Step 8: 빌드 + 테스트 실행**

Run: `cd scanner && ./gradlew test`
Expected: BUILD SUCCESSFUL, 3 tests passed

- [ ] **Step 9: Commit**

```bash
git add scanner/
git commit -m "feat(scanner): setup Gradle project with data models and NamingUtils"
```

---

### Task 2: FileCollector

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/FileCollector.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/FileCollectorTest.kt`

- [ ] **Step 1: FileCollector 테스트**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/FileCollectorTest.kt
package com.archsight.scanner

import com.archsight.scanner.model.Language
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FileCollectorTest {
    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `collects java and kotlin files from src main`() {
        val srcMain = tempDir.resolve("src/main/kotlin/com/example").createDirectories()
        srcMain.resolve("Foo.kt").writeText("class Foo")
        val srcJava = tempDir.resolve("src/main/java/com/example").createDirectories()
        srcJava.resolve("Bar.java").writeText("class Bar {}")

        val files = FileCollector.collect(tempDir)

        assertEquals(2, files.size)
        assertTrue(files.any { it.language == Language.KOTLIN && it.path.toString().contains("Foo.kt") })
        assertTrue(files.any { it.language == Language.JAVA && it.path.toString().contains("Bar.java") })
    }

    @Test
    fun `excludes test sources`() {
        val srcMain = tempDir.resolve("src/main/kotlin/com/example").createDirectories()
        srcMain.resolve("Foo.kt").writeText("class Foo")
        val srcTest = tempDir.resolve("src/test/kotlin/com/example").createDirectories()
        srcTest.resolve("FooTest.kt").writeText("class FooTest")

        val files = FileCollector.collect(tempDir)

        assertEquals(1, files.size)
        assertTrue(files.first().path.toString().contains("Foo.kt"))
    }

    @Test
    fun `supports multi-module projects via settings gradle`() {
        // settings.gradle.kts with include
        tempDir.resolve("settings.gradle.kts").writeText("""
            rootProject.name = "test-project"
            include("domain", "application")
        """.trimIndent())

        val domainSrc = tempDir.resolve("domain/src/main/kotlin/com/example").createDirectories()
        domainSrc.resolve("Order.kt").writeText("class Order")
        val appSrc = tempDir.resolve("application/src/main/kotlin/com/example").createDirectories()
        appSrc.resolve("OrderUseCase.kt").writeText("class OrderUseCase")

        val files = FileCollector.collect(tempDir)

        assertEquals(2, files.size)
    }
}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd scanner && ./gradlew test --tests "*FileCollectorTest*"`
Expected: FAIL — FileCollector not found

- [ ] **Step 3: FileCollector 구현**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/FileCollector.kt
package com.archsight.scanner

import com.archsight.scanner.model.Language
import java.nio.file.Path
import kotlin.io.path.*

data class SourceFile(
    val path: Path,
    val language: Language,
    val relativePath: String,
)

object FileCollector {
    fun collect(projectRoot: Path): List<SourceFile> {
        val modules = detectModules(projectRoot)
        return modules.flatMap { collectFromModule(projectRoot, it) }
    }

    private fun detectModules(projectRoot: Path): List<Path> {
        val settingsFile = projectRoot.resolve("settings.gradle.kts")
        if (!settingsFile.exists()) {
            val settingsGroovy = projectRoot.resolve("settings.gradle")
            if (settingsGroovy.exists()) {
                return parseModules(projectRoot, settingsGroovy.readText())
            }
            return listOf(projectRoot)
        }
        return parseModules(projectRoot, settingsFile.readText())
    }

    private fun parseModules(projectRoot: Path, settingsContent: String): List<Path> {
        val includePattern = Regex("""include\s*\(\s*(.*?)\s*\)""", RegexOption.DOT_MATCHES_ALL)
        val modulePattern = Regex(""""([^"]+)"""")

        val modules = mutableListOf<Path>()
        for (match in includePattern.findAll(settingsContent)) {
            for (moduleMatch in modulePattern.findAll(match.groupValues[1])) {
                val moduleName = moduleMatch.groupValues[1].replace(":", "/")
                val modulePath = projectRoot.resolve(moduleName)
                if (modulePath.exists()) {
                    modules.add(modulePath)
                }
            }
        }

        if (modules.isEmpty()) {
            modules.add(projectRoot)
        }
        return modules
    }

    private fun collectFromModule(projectRoot: Path, moduleRoot: Path): List<SourceFile> {
        val sources = mutableListOf<SourceFile>()
        val srcDirs = listOf(
            moduleRoot.resolve("src/main/kotlin"),
            moduleRoot.resolve("src/main/java"),
        )

        for (srcDir in srcDirs) {
            if (!srcDir.exists()) continue
            srcDir.walk()
                .filter { it.isRegularFile() }
                .filter { it.extension == "kt" || it.extension == "java" }
                .filter { !it.pathString.contains("src/test/") }
                .forEach { file ->
                    sources.add(
                        SourceFile(
                            path = file,
                            language = if (file.extension == "kt") Language.KOTLIN else Language.JAVA,
                            relativePath = projectRoot.relativize(file).toString().replace('\\', '/'),
                        )
                    )
                }
        }
        return sources
    }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd scanner && ./gradlew test --tests "*FileCollectorTest*"`
Expected: 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add FileCollector with multi-module support"
```

---

### Task 3: JavaClassParser

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/parser/JavaClassParser.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/parser/JavaClassParserTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/parser/JavaClassParserTest.kt
package com.archsight.scanner.parser

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class JavaClassParserTest {
    @Test
    fun `parses RestController with annotations and methods`() {
        val source = """
            package com.example.order.presentation;

            import org.springframework.web.bind.annotation.*;

            @RestController
            @RequestMapping("/api/orders")
            public class OrderController {
                private final CreateOrderUseCase createOrderUseCase;

                public OrderController(CreateOrderUseCase createOrderUseCase) {
                    this.createOrderUseCase = createOrderUseCase;
                }

                @PostMapping
                public Order createOrder(@RequestBody CreateOrderRequest request) {
                    return createOrderUseCase.execute(request);
                }

                @GetMapping("/{id}")
                public Order getOrder(@PathVariable String id) {
                    return null;
                }
            }
        """.trimIndent()

        val result = JavaClassParser.parse(source, "src/main/java/com/example/order/presentation/OrderController.java")

        assertEquals(1, result.size)
        val meta = result.first()
        assertEquals("OrderController", meta.className)
        assertEquals("com.example.order.presentation", meta.packageName)
        assertTrue(meta.annotations.any { it.contains("@RestController") })
        assertTrue(meta.annotations.any { it.contains("@RequestMapping") })
        assertEquals(1, meta.constructorParams.size)
        assertEquals("CreateOrderUseCase", meta.constructorParams[0].typeName)
        assertTrue(meta.methods.any { it.contains("createOrder") })
        assertTrue(meta.methods.any { it.contains("getOrder") })
    }

    @Test
    fun `parses Entity with JPA annotations`() {
        val source = """
            package com.example.order.domain;

            import jakarta.persistence.*;

            @Entity
            @Table(name = "orders")
            public class Order {
                @Id
                private String id;
                private String status;

                public void cancel(String reason) {}
                public static Order create(String item) { return new Order(); }
            }
        """.trimIndent()

        val result = JavaClassParser.parse(source, "Order.java")
        val meta = result.first()
        assertEquals("Order", meta.className)
        assertTrue(meta.annotations.any { it.contains("@Entity") })
        assertTrue(meta.methods.any { it.contains("cancel") })
    }

    @Test
    fun `parses interface with extends`() {
        val source = """
            package com.example.order.domain;

            public interface OrderRepository {
                Order save(Order order);
                Order findById(String id);
            }
        """.trimIndent()

        val result = JavaClassParser.parse(source, "OrderRepository.java")
        val meta = result.first()
        assertEquals("OrderRepository", meta.className)
        assertTrue(meta.methods.any { it.contains("save") })
    }

    @Test
    fun `parses annotation class as isAnnotationClass=true`() {
        val source = """
            package com.example;

            import org.springframework.stereotype.Service;
            import java.lang.annotation.*;

            @Service
            @Target(ElementType.TYPE)
            @Retention(RetentionPolicy.RUNTIME)
            public @interface UseCase {
            }
        """.trimIndent()

        val result = JavaClassParser.parse(source, "UseCase.java")
        val meta = result.first()
        assertEquals("UseCase", meta.className)
        assertTrue(meta.isAnnotationClass)
        assertTrue(meta.annotations.any { it.contains("@Service") })
    }
}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd scanner && ./gradlew test --tests "*JavaClassParserTest*"`
Expected: FAIL

- [ ] **Step 3: JavaClassParser 구현**

JavaParser 라이브러리를 사용하여 Java 소스를 파싱. 클래스 선언, 어노테이션, 생성자 파라미터, public 메서드, superTypes를 추출하여 ClassMetadata로 변환.

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/parser/JavaClassParser.kt
package com.archsight.scanner.parser

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import com.archsight.scanner.util.NamingUtils
import com.github.javaparser.StaticJavaParser
import com.github.javaparser.ast.body.*
import com.github.javaparser.ast.Modifier

object JavaClassParser {
    fun parse(source: String, filePath: String): List<ClassMetadata> {
        val cu = StaticJavaParser.parse(source)
        val packageName = cu.packageDeclaration.map { it.nameAsString }.orElse("")

        val results = mutableListOf<ClassMetadata>()

        // 클래스 + 인터페이스 + 어노테이션 선언 처리
        for (type in cu.types) {
            if (type is ClassOrInterfaceDeclaration || type is AnnotationDeclaration) {
                results.add(extractMetadata(type, packageName, filePath))
            }
        }

        return results
    }

    private fun extractMetadata(type: TypeDeclaration<*>, packageName: String, filePath: String): ClassMetadata {
        val annotations = type.annotations.map { "@${NamingUtils.stripAnnotationParams(it.nameAsString)}" }

        val constructorParams = if (type is ClassOrInterfaceDeclaration) {
            type.constructors
                .maxByOrNull { it.parameters.size }
                ?.parameters
                ?.map { ParamInfo(it.nameAsString, it.typeAsString) }
                ?: emptyList()
        } else emptyList()

        val methods = if (type is ClassOrInterfaceDeclaration) {
            type.methods
                .filter { it.isPublic || type.isInterface }
                .map { m ->
                    val params = m.parameters.joinToString(", ") { "${it.nameAsString}: ${it.typeAsString}" }
                    "${m.nameAsString}($params): ${m.typeAsString}"
                }
        } else emptyList()

        val superTypes = if (type is ClassOrInterfaceDeclaration) {
            val extended = type.extendedTypes.map { it.nameAsString }
            val implemented = type.implementedTypes.map { it.nameAsString }
            extended + implemented
        } else emptyList()

        val isAnnotation = type is AnnotationDeclaration

        return ClassMetadata(
            filePath = filePath,
            packageName = packageName,
            className = type.nameAsString,
            annotations = annotations,
            constructorParams = constructorParams,
            methods = methods,
            superTypes = superTypes,
            language = Language.JAVA,
            isAnnotationClass = isAnnotation,
        )
    }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd scanner && ./gradlew test --tests "*JavaClassParserTest*"`
Expected: 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add JavaClassParser with annotation and constructor extraction"
```

---

### Task 4: KotlinClassParser

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/parser/KotlinClassParser.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/parser/KotlinClassParserTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/parser/KotlinClassParserTest.kt
package com.archsight.scanner.parser

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class KotlinClassParserTest {
    @Test
    fun `parses data class with annotations and primary constructor`() {
        val source = """
            package com.lms.domain.model.employee

            data class Employee private constructor(
                val id: EmployeeId,
                val userId: UserId,
                val name: EmployeeName,
                val employeeType: EmployeeType,
            ) {
                companion object {
                    fun create(userId: UserId, name: EmployeeName): Employee = TODO()
                    fun reconstruct(id: EmployeeId, userId: UserId, name: EmployeeName): Employee = TODO()
                }

                fun deductLeave(days: BigDecimal): Employee = TODO()
                fun restoreLeave(days: BigDecimal): Employee = TODO()
            }
        """.trimIndent()

        val result = KotlinClassParser.parse(source, "Employee.kt")
        assertEquals(1, result.size)
        val meta = result.first()
        assertEquals("Employee", meta.className)
        assertEquals("com.lms.domain.model.employee", meta.packageName)
        assertTrue(meta.methods.any { it.contains("deductLeave") })
        assertTrue(meta.methods.any { it.contains("restoreLeave") })
    }

    @Test
    fun `parses Spring service with constructor injection`() {
        val source = """
            package com.lms.application.leave

            import org.springframework.stereotype.Service
            import org.springframework.transaction.annotation.Transactional

            @Service
            @Transactional
            class CreateLeaveRequestAppService(
                private val leaveRequestRepository: LeaveRequestRepository,
                private val employeeRepository: EmployeeRepository,
                private val leavePolicyService: LeavePolicyService,
            ) {
                fun execute(command: CreateLeaveCommand): LeaveRequestResult = TODO()
            }
        """.trimIndent()

        val result = KotlinClassParser.parse(source, "CreateLeaveRequestAppService.kt")
        val meta = result.first()
        assertEquals("CreateLeaveRequestAppService", meta.className)
        assertTrue(meta.annotations.any { it.contains("@Service") })
        assertEquals(3, meta.constructorParams.size)
        assertEquals("LeaveRequestRepository", meta.constructorParams[0].typeName)
        assertEquals("EmployeeRepository", meta.constructorParams[1].typeName)
        assertEquals("LeavePolicyService", meta.constructorParams[2].typeName)
    }

    @Test
    fun `parses annotation class`() {
        val source = """
            package com.example

            import org.springframework.stereotype.Service

            @Service
            @Target(AnnotationTarget.CLASS)
            annotation class UseCase
        """.trimIndent()

        val result = KotlinClassParser.parse(source, "UseCase.kt")
        val meta = result.first()
        assertEquals("UseCase", meta.className)
        assertTrue(meta.isAnnotationClass)
        assertTrue(meta.annotations.any { it.contains("@Service") })
    }

    @Test
    fun `parses inline value class`() {
        val source = """
            package com.lms.domain.model.employee

            @JvmInline
            value class EmployeeId(val value: String) {
                companion object {
                    fun generate(): EmployeeId = EmployeeId(java.util.UUID.randomUUID().toString())
                }
            }
        """.trimIndent()

        val result = KotlinClassParser.parse(source, "EmployeeId.kt")
        val meta = result.first()
        assertEquals("EmployeeId", meta.className)
        assertTrue(meta.annotations.any { it.contains("@JvmInline") })
    }
}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd scanner && ./gradlew test --tests "*KotlinClassParserTest*"`
Expected: FAIL

- [ ] **Step 3: KotlinClassParser 구현**

kotlin-compiler-embeddable의 PSI를 사용하여 Kotlin 소스를 파싱. KtFile → KtClass 순회하며 어노테이션, primary constructor 파라미터, 함수 목록을 추출.

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/parser/KotlinClassParser.kt
package com.archsight.scanner.parser

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import com.archsight.scanner.util.NamingUtils
import org.jetbrains.kotlin.cli.common.CLIConfigurationKeys
import org.jetbrains.kotlin.cli.common.messages.MessageRenderer
import org.jetbrains.kotlin.cli.common.messages.PrintingMessageCollector
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.psi.*

object KotlinClassParser {
    fun parse(source: String, filePath: String): List<ClassMetadata> {
        val disposable = Disposer.newDisposable()
        try {
            val configuration = CompilerConfiguration().apply {
                put(CLIConfigurationKeys.MESSAGE_COLLECTOR_KEY,
                    PrintingMessageCollector(System.err, MessageRenderer.PLAIN_RELATIVE_PATHS, false))
            }
            val env = KotlinCoreEnvironment.createForProduction(
                disposable, configuration, EnvironmentConfigFiles.JVM_CONFIG_FILES
            )
            val psiFactory = KtPsiFactory(env.project)
            val ktFile = psiFactory.createFile(filePath, source)

            val packageName = ktFile.packageFqName.asString()
            val results = mutableListOf<ClassMetadata>()

            for (declaration in ktFile.declarations) {
                when (declaration) {
                    is KtClass -> results.add(extractFromKtClass(declaration, packageName, filePath))
                    else -> {} // skip top-level functions, properties, etc.
                }
            }
            return results
        } finally {
            disposable.dispose()
        }
    }

    private fun extractFromKtClass(ktClass: KtClass, packageName: String, filePath: String): ClassMetadata {
        val annotations = ktClass.annotationEntries.map { entry ->
            "@${NamingUtils.stripAnnotationParams(entry.shortName?.asString() ?: "Unknown")}"
        }

        val constructorParams = ktClass.primaryConstructor?.valueParameters?.map { param ->
            ParamInfo(
                name = param.name ?: "",
                typeName = param.typeReference?.text?.replace(Regex("<.*>"), "") ?: "Unknown",
            )
        } ?: emptyList()

        val methods = ktClass.declarations
            .filterIsInstance<KtNamedFunction>()
            .filter { !it.hasModifier(org.jetbrains.kotlin.lexer.KtTokens.PRIVATE_KEYWORD) }
            .map { fn ->
                val params = fn.valueParameters.joinToString(", ") {
                    "${it.name}: ${it.typeReference?.text ?: "Any"}"
                }
                val returnType = fn.typeReference?.text ?: "Unit"
                "${fn.name}($params): $returnType"
            }

        val superTypes = ktClass.superTypeListEntries.map { entry ->
            entry.typeReference?.text?.replace(Regex("<.*>"), "") ?: "Unknown"
        }

        val isAnnotation = ktClass.isAnnotation()

        return ClassMetadata(
            filePath = filePath,
            packageName = packageName,
            className = ktClass.name ?: "Unknown",
            annotations = annotations,
            constructorParams = constructorParams,
            methods = methods,
            superTypes = superTypes,
            language = Language.KOTLIN,
            isAnnotationClass = isAnnotation,
        )
    }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd scanner && ./gradlew test --tests "*KotlinClassParserTest*"`
Expected: 4 tests passed

- [ ] **Step 5: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add KotlinClassParser with PSI-based Kotlin source parsing"
```

---

### Task 5: MetaAnnotationResolver + KnownAnnotations

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/classifier/KnownAnnotations.kt`
- Create: `scanner/src/main/kotlin/com/archsight/scanner/classifier/MetaAnnotationResolver.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/classifier/MetaAnnotationResolverTest.kt`

- [ ] **Step 1: KnownAnnotations 작성**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/classifier/KnownAnnotations.kt
package com.archsight.scanner.classifier

data class AnnotationMapping(
    val layer: String,
    val type: String,
)

object KnownAnnotations {
    val BUILTIN: Map<String, AnnotationMapping> = mapOf(
        // Spring Core
        "@RestController" to AnnotationMapping("presentation", "controller"),
        "@Controller" to AnnotationMapping("presentation", "controller"),
        "@Service" to AnnotationMapping("application", "usecase"),
        "@Repository" to AnnotationMapping("infrastructure", "repository"),
        "@Component" to AnnotationMapping("infrastructure", "adapter"),
        "@Entity" to AnnotationMapping("domain", "aggregate"),
        "@Embeddable" to AnnotationMapping("domain", "value_object"),
        "@MappedSuperclass" to AnnotationMapping("domain", "entity"),
        "@EventListener" to AnnotationMapping("domain", "policy"),
        "@TransactionalEventListener" to AnnotationMapping("domain", "policy"),
        "@Scheduled" to AnnotationMapping("infrastructure", "adapter"),
        "@Async" to AnnotationMapping("infrastructure", "adapter"),
        // Temporal
        "@WorkflowImpl" to AnnotationMapping("presentation", "controller"),
        "@ActivityImpl" to AnnotationMapping("presentation", "controller"),
    )

    /**
     * Spring의 핵심 stereotype 어노테이션 — meta-annotation 추적에 사용
     * 이 어노테이션들이 meta-annotation으로 발견되면 해당 클래스를 Spring 관리 빈으로 인식
     */
    val SPRING_STEREOTYPES = setOf(
        "@Service", "@Component", "@Repository", "@Controller", "@RestController",
        "@Configuration",
    )
}
```

- [ ] **Step 2: MetaAnnotationResolver 테스트**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/classifier/MetaAnnotationResolverTest.kt
package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import org.junit.jupiter.api.Test
import kotlin.test.assertTrue

class MetaAnnotationResolverTest {
    private fun meta(
        className: String,
        annotations: List<String> = emptyList(),
        isAnnotationClass: Boolean = false,
    ) = ClassMetadata(
        filePath = "$className.kt",
        packageName = "com.example",
        className = className,
        annotations = annotations,
        constructorParams = emptyList(),
        methods = emptyList(),
        superTypes = emptyList(),
        language = Language.KOTLIN,
        isAnnotationClass = isAnnotationClass,
    )

    @Test
    fun `resolves custom annotation to Spring stereotype`() {
        val annotationDef = meta("UseCase", annotations = listOf("@Service"), isAnnotationClass = true)
        val userClass = meta("CancelOrderUseCase", annotations = listOf("@UseCase"))

        val resolved = MetaAnnotationResolver.resolve(listOf(annotationDef, userClass))

        val cancelUc = resolved.first { it.className == "CancelOrderUseCase" }
        assertTrue(cancelUc.annotations.contains("@UseCase"))
        assertTrue(cancelUc.annotations.contains("@Service"))
    }

    @Test
    fun `preserves original annotations when no custom annotation found`() {
        val service = meta("OrderService", annotations = listOf("@Service", "@Transactional"))

        val resolved = MetaAnnotationResolver.resolve(listOf(service))

        val orderSvc = resolved.first()
        assertTrue(orderSvc.annotations.contains("@Service"))
        assertTrue(orderSvc.annotations.contains("@Transactional"))
    }

    @Test
    fun `handles chained meta-annotations`() {
        // @DomainService is annotated with @Service
        val domainSvcAnnotation = meta("DomainService", annotations = listOf("@Service"), isAnnotationClass = true)
        // @EventHandler is annotated with @DomainService
        val eventHandlerAnnotation = meta("EventHandler", annotations = listOf("@DomainService"), isAnnotationClass = true)
        // MyHandler uses @EventHandler
        val handler = meta("MyHandler", annotations = listOf("@EventHandler"))

        val resolved = MetaAnnotationResolver.resolve(listOf(domainSvcAnnotation, eventHandlerAnnotation, handler))

        val myHandler = resolved.first { it.className == "MyHandler" }
        assertTrue(myHandler.annotations.contains("@EventHandler"))
        assertTrue(myHandler.annotations.contains("@DomainService"))
        assertTrue(myHandler.annotations.contains("@Service"))
    }
}
```

- [ ] **Step 3: MetaAnnotationResolver 구현**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/classifier/MetaAnnotationResolver.kt
package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata

object MetaAnnotationResolver {
    /**
     * 커스텀 어노테이션의 meta-annotation을 추적하여 annotations 필드를 확장.
     *
     * 1. isAnnotationClass=true인 클래스들에서 meta-annotation 매핑 테이블 구축
     * 2. 각 클래스의 어노테이션을 테이블로 확장 (체이닝 지원)
     * 3. 원본 annotations를 유지하면서 해석된 어노테이션을 추가
     */
    fun resolve(classes: List<ClassMetadata>): List<ClassMetadata> {
        // 1. 어노테이션 정의 클래스 수집 → { "@UseCase": ["@Service"] }
        val annotationDefs = classes
            .filter { it.isAnnotationClass }
            .associate { "@${it.className}" to it.annotations }

        // 2. 체이닝 해석: @EventHandler → @DomainService → @Service
        val expandedDefs = mutableMapOf<String, Set<String>>()
        for ((name, directAnnotations) in annotationDefs) {
            expandedDefs[name] = expandChain(name, annotationDefs, mutableSetOf())
        }

        // 3. 각 클래스의 annotations를 확장
        return classes.map { meta ->
            if (meta.isAnnotationClass) return@map meta

            val expanded = mutableSetOf<String>()
            expanded.addAll(meta.annotations)

            for (annotation in meta.annotations) {
                val stripped = annotation.substringBefore("(").let {
                    if (it.startsWith("@")) it else "@$it"
                }
                expandedDefs[stripped]?.let { expanded.addAll(it) }
            }

            meta.copy(annotations = expanded.toList())
        }
    }

    private fun expandChain(
        annotation: String,
        defs: Map<String, List<String>>,
        visited: MutableSet<String>,
    ): Set<String> {
        if (annotation in visited) return emptySet()
        visited.add(annotation)

        val directAnnotations = defs[annotation] ?: return emptySet()
        val result = mutableSetOf<String>()
        result.addAll(directAnnotations)

        for (parent in directAnnotations) {
            val stripped = parent.substringBefore("(").let {
                if (it.startsWith("@")) it else "@$it"
            }
            result.addAll(expandChain(stripped, defs, visited))
        }
        return result
    }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd scanner && ./gradlew test --tests "*MetaAnnotationResolverTest*"`
Expected: 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add MetaAnnotationResolver and KnownAnnotations"
```

---

### Task 6: LayerClassifier + TypeClassifier

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/classifier/LayerClassifier.kt`
- Create: `scanner/src/main/kotlin/com/archsight/scanner/classifier/TypeClassifier.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/classifier/ClassifierTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/classifier/ClassifierTest.kt
package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class ClassifierTest {
    private fun meta(
        className: String,
        packageName: String = "com.example",
        annotations: List<String> = emptyList(),
        superTypes: List<String> = emptyList(),
    ) = ClassMetadata(
        filePath = "$className.kt",
        packageName = packageName,
        className = className,
        annotations = annotations,
        constructorParams = emptyList(),
        methods = emptyList(),
        superTypes = superTypes,
        language = Language.KOTLIN,
    )

    // LayerClassifier tests
    @Test
    fun `RestController is presentation`() {
        assertEquals("presentation", LayerClassifier.classify(meta("OrderController", annotations = listOf("@RestController"))))
    }

    @Test
    fun `Service with UseCase suffix is application`() {
        assertEquals("application", LayerClassifier.classify(meta("CreateOrderUseCase", annotations = listOf("@Service"))))
    }

    @Test
    fun `Service with AppService suffix is application`() {
        assertEquals("application", LayerClassifier.classify(meta("CreateOrderAppService", annotations = listOf("@Service"))))
    }

    @Test
    fun `Service in domain package is domain`() {
        assertEquals("domain", LayerClassifier.classify(meta("LeavePolicyService", packageName = "com.example.domain.service", annotations = listOf("@Service"))))
    }

    @Test
    fun `Entity is domain`() {
        assertEquals("domain", LayerClassifier.classify(meta("Order", annotations = listOf("@Entity"))))
    }

    @Test
    fun `Repository is infrastructure`() {
        assertEquals("infrastructure", LayerClassifier.classify(meta("OrderRepository", annotations = listOf("@Repository"))))
    }

    @Test
    fun `no annotation falls back to package name`() {
        assertEquals("domain", LayerClassifier.classify(meta("LeavePolicyService", packageName = "com.example.domain.service")))
        assertEquals("presentation", LayerClassifier.classify(meta("OrderHandler", packageName = "com.example.web.handler")))
        assertEquals("infrastructure", LayerClassifier.classify(meta("Config", packageName = "com.example.infrastructure.config")))
    }

    @Test
    fun `WorkflowImpl is presentation`() {
        assertEquals("presentation", LayerClassifier.classify(meta("OrderWorkflow", annotations = listOf("@WorkflowImpl"))))
    }

    // TypeClassifier tests
    @Test
    fun `RestController type is controller`() {
        assertEquals("controller", TypeClassifier.classify(meta("OrderController", annotations = listOf("@RestController"))))
    }

    @Test
    fun `Service UseCase type is usecase`() {
        assertEquals("usecase", TypeClassifier.classify(meta("CreateOrderUseCase", annotations = listOf("@Service"))))
    }

    @Test
    fun `Entity type is aggregate by default`() {
        assertEquals("aggregate", TypeClassifier.classify(meta("Order", annotations = listOf("@Entity"))))
    }

    @Test
    fun `Embeddable type is value_object`() {
        assertEquals("value_object", TypeClassifier.classify(meta("ShippingInfo", annotations = listOf("@Embeddable"))))
    }

    @Test
    fun `class ending in Event is domain_event`() {
        assertEquals("domain_event", TypeClassifier.classify(meta("OrderCreatedEvent")))
    }

    @Test
    fun `EventListener is policy`() {
        assertEquals("policy", TypeClassifier.classify(meta("OrderEventHandler", annotations = listOf("@EventListener"))))
    }
}
```

- [ ] **Step 2: LayerClassifier 구현**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/classifier/LayerClassifier.kt
package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata

object LayerClassifier {
    fun classify(meta: ClassMetadata): String {
        val annotations = meta.annotations.map { it.substringBefore("(") }

        // 1. 빌트인 매핑에서 직접 매칭
        for (ann in annotations) {
            KnownAnnotations.BUILTIN[ann]?.let { return it.layer }
        }

        // 2. @Service 기반 판별
        if (annotations.any { it == "@Service" }) {
            val name = meta.className
            if (name.endsWith("UseCase") || name.endsWith("AppService")) return "application"
            if (meta.packageName.contains(".domain.") || meta.packageName.endsWith(".domain")) return "domain"
            return "application"
        }

        // 3. @Component 기반 판별
        if (annotations.any { it == "@Component" }) {
            val name = meta.className
            if (name.endsWith("Adapter") || name.endsWith("Client") || name.endsWith("Gateway")) return "infrastructure"
            return "infrastructure"
        }

        // 4. 패키지명 fallback
        return classifyByPackage(meta.packageName)
    }

    private fun classifyByPackage(packageName: String): String {
        val segments = packageName.lowercase()
        return when {
            segments.contains(".presentation.") || segments.contains(".web.") || segments.contains(".controller.") || segments.endsWith(".presentation") || segments.endsWith(".web") -> "presentation"
            segments.contains(".application.") || segments.contains(".usecase.") || segments.endsWith(".application") -> "application"
            segments.contains(".domain.") || segments.contains(".model.") || segments.endsWith(".domain") -> "domain"
            segments.contains(".infrastructure.") || segments.contains(".persistence.") || segments.contains(".config.") || segments.endsWith(".infrastructure") -> "infrastructure"
            else -> "domain" // 판별 불가 시 domain 기본값
        }
    }
}
```

- [ ] **Step 3: TypeClassifier 구현**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/classifier/TypeClassifier.kt
package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata

object TypeClassifier {
    fun classify(meta: ClassMetadata): String {
        val annotations = meta.annotations.map { it.substringBefore("(") }
        val name = meta.className

        // 1. 빌트인 어노테이션 매핑
        for (ann in annotations) {
            KnownAnnotations.BUILTIN[ann]?.let { return it.type }
        }

        // 2. @Service 기반
        if (annotations.any { it == "@Service" }) {
            return when {
                name.endsWith("UseCase") || name.endsWith("AppService") -> "usecase"
                meta.packageName.contains(".domain.") || meta.packageName.endsWith(".domain") -> "domain_service"
                else -> "usecase"
            }
        }

        // 3. @Component 기반
        if (annotations.any { it == "@Component" }) {
            return when {
                name.endsWith("Adapter") || name.endsWith("Client") || name.endsWith("Gateway") -> "adapter"
                else -> "adapter"
            }
        }

        // 4. 이름 패턴 매칭
        return when {
            name.endsWith("Controller") || name.endsWith("Handler") && meta.packageName.contains(".web.") -> "controller"
            name.endsWith("UseCase") || name.endsWith("AppService") -> "usecase"
            name.endsWith("Event") || name.endsWith("DomainEvent") -> "domain_event"
            name.endsWith("Command") -> "command"
            name.endsWith("Query") && !name.endsWith("Repository") -> "query"
            name.endsWith("Policy") || name.endsWith("Saga") -> "policy"
            name.endsWith("Repository") || name.endsWith("RepositoryImpl") -> "repository"
            name.endsWith("Adapter") || name.endsWith("Client") -> "adapter"
            name.endsWith("Service") -> "domain_service"
            name.endsWith("VO") || annotations.any { it == "@JvmInline" } -> "value_object"
            else -> "aggregate" // 판별 불가 시 aggregate 기본값
        }
    }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd scanner && ./gradlew test --tests "*ClassifierTest*"`
Expected: 모든 테스트 통과

- [ ] **Step 5: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add LayerClassifier and TypeClassifier with annotation + package rules"
```

---

### Task 7: DependencyResolver

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/resolver/DependencyResolver.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/resolver/DependencyResolverTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/resolver/DependencyResolverTest.kt
package com.archsight.scanner.resolver

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DependencyResolverTest {
    private fun meta(
        className: String,
        packageName: String = "com.example",
        annotations: List<String> = emptyList(),
        constructorParams: List<ParamInfo> = emptyList(),
        superTypes: List<String> = emptyList(),
    ) = ClassMetadata(
        filePath = "$className.kt",
        packageName = packageName,
        className = className,
        annotations = annotations,
        constructorParams = constructorParams,
        methods = emptyList(),
        superTypes = superTypes,
        language = Language.KOTLIN,
    )

    @Test
    fun `constructor injection creates edges`() {
        val controller = meta("OrderController", annotations = listOf("@RestController"),
            constructorParams = listOf(ParamInfo("useCase", "CreateOrderUseCase")))
        val useCase = meta("CreateOrderUseCase", annotations = listOf("@Service"))

        val edges = DependencyResolver.resolve(listOf(controller, useCase))

        assertEquals(1, edges.size)
        assertEquals("OrderController", edges[0].fromClassName)
        assertEquals("CreateOrderUseCase", edges[0].toClassName)
    }

    @Test
    fun `implements relationship creates edge`() {
        val impl = meta("JpaOrderRepository",
            annotations = listOf("@Repository"),
            superTypes = listOf("OrderRepository"))
        val iface = meta("OrderRepository")

        val edges = DependencyResolver.resolve(listOf(impl, iface))

        val implEdge = edges.first { it.edgeType == "implements" }
        assertEquals("JpaOrderRepository", implEdge.fromClassName)
        assertEquals("OrderRepository", implEdge.toClassName)
    }

    @Test
    fun `ignores constructor params with no matching class`() {
        val controller = meta("OrderController",
            constructorParams = listOf(ParamInfo("logger", "Logger")))

        val edges = DependencyResolver.resolve(listOf(controller))
        assertTrue(edges.isEmpty())
    }

    @Test
    fun `controller to usecase edge type is invokes`() {
        val controller = meta("OrderController", annotations = listOf("@RestController"),
            constructorParams = listOf(ParamInfo("uc", "CreateOrderUseCase")))
        val useCase = meta("CreateOrderUseCase", annotations = listOf("@Service"))

        val edges = DependencyResolver.resolve(listOf(controller, useCase))

        assertEquals("invokes", edges[0].edgeType)
    }
}
```

- [ ] **Step 2: DependencyResolver 구현**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/resolver/DependencyResolver.kt
package com.archsight.scanner.resolver

import com.archsight.scanner.classifier.LayerClassifier
import com.archsight.scanner.classifier.TypeClassifier
import com.archsight.scanner.model.ClassMetadata

data class ResolvedEdge(
    val fromClassName: String,
    val toClassName: String,
    val edgeType: String,
    val label: String? = null,
)

object DependencyResolver {
    fun resolve(classes: List<ClassMetadata>): List<ResolvedEdge> {
        val classMap = classes.associateBy { it.className }
        val edges = mutableListOf<ResolvedEdge>()

        for (meta in classes) {
            // 1. 생성자 주입 → 의존 관계
            for (param in meta.constructorParams) {
                val targetName = param.typeName.substringAfterLast(".")
                if (classMap.containsKey(targetName)) {
                    val edgeType = inferEdgeType(meta, classMap[targetName]!!)
                    edges.add(ResolvedEdge(meta.className, targetName, edgeType))
                }
            }

            // 2. implements/extends 관계
            for (superType in meta.superTypes) {
                val targetName = superType.substringAfterLast(".")
                if (classMap.containsKey(targetName)) {
                    edges.add(ResolvedEdge(meta.className, targetName, "implements"))
                }
            }
        }

        return edges
    }

    private fun inferEdgeType(from: ClassMetadata, to: ClassMetadata): String {
        val fromType = TypeClassifier.classify(from)
        val toType = TypeClassifier.classify(to)

        return when {
            fromType == "controller" && toType == "usecase" -> "invokes"
            fromType == "usecase" && toType in setOf("aggregate", "domain_service", "repository") -> "invokes"
            fromType in setOf("usecase", "domain_service") && toType == "repository" -> "invokes"
            fromType == "aggregate" && toType in setOf("entity", "value_object") -> "creates"
            fromType == "policy" && toType == "domain_event" -> "subscribes"
            else -> "depends_on"
        }
    }
}
```

- [ ] **Step 3: 테스트 실행**

Run: `cd scanner && ./gradlew test --tests "*DependencyResolverTest*"`
Expected: 4 tests passed

- [ ] **Step 4: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add DependencyResolver with edge type inference"
```

---

### Task 8: GraphBuilder

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/graph/GraphBuilder.kt`
- Test: `scanner/src/test/kotlin/com/archsight/scanner/graph/GraphBuilderTest.kt`

- [ ] **Step 1: 테스트 작성**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/graph/GraphBuilderTest.kt
package com.archsight.scanner.graph

import com.archsight.scanner.model.*
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GraphBuilderTest {
    private fun meta(
        className: String,
        packageName: String = "com.example.domain",
        annotations: List<String> = listOf("@Entity"),
        constructorParams: List<ParamInfo> = emptyList(),
        methods: List<String> = emptyList(),
    ) = ClassMetadata(
        filePath = "src/main/kotlin/com/example/$className.kt",
        packageName = packageName,
        className = className,
        annotations = annotations,
        constructorParams = constructorParams,
        methods = methods,
        superTypes = emptyList(),
        language = Language.KOTLIN,
    )

    @Test
    fun `builds graph with correct node count`() {
        val classes = listOf(
            meta("Order"),
            meta("OrderController", "com.example.presentation", listOf("@RestController"),
                constructorParams = listOf(ParamInfo("uc", "CreateOrderUseCase"))),
            meta("CreateOrderUseCase", "com.example.application", listOf("@Service")),
        )

        val graph = GraphBuilder.build(classes, "test-project")

        assertEquals(3, graph.nodes.size)
        assertEquals(1, graph.edges.size) // controller → usecase
        assertEquals("test-project", graph.context.id)
    }

    @Test
    fun `node IDs are kebab-case`() {
        val classes = listOf(meta("CancelOrderUseCase", annotations = listOf("@Service")))

        val graph = GraphBuilder.build(classes, "test")

        assertEquals("cancel-order-use-case", graph.nodes.first().id)
    }

    @Test
    fun `includes code mapping`() {
        val classes = listOf(meta("Order", methods = listOf("cancel(reason: String): Unit")))

        val graph = GraphBuilder.build(classes, "test")

        val node = graph.nodes.first()
        assertEquals("Order", node.codeMapping?.className)
        assertEquals("com.example.domain", node.codeMapping?.packageName)
        assertTrue(node.operations?.any { it.contains("cancel") } ?: false)
    }

    @Test
    fun `default layers are included`() {
        val graph = GraphBuilder.build(emptyList(), "test")

        assertEquals(4, graph.layers?.size)
    }
}
```

- [ ] **Step 2: GraphBuilder 구현**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/graph/GraphBuilder.kt
package com.archsight.scanner.graph

import com.archsight.scanner.classifier.LayerClassifier
import com.archsight.scanner.classifier.MetaAnnotationResolver
import com.archsight.scanner.classifier.TypeClassifier
import com.archsight.scanner.model.*
import com.archsight.scanner.resolver.DependencyResolver
import com.archsight.scanner.util.NamingUtils

object GraphBuilder {
    private val DEFAULT_LAYERS = listOf(
        LayerConfig("presentation", "Presentation", 0),
        LayerConfig("application", "Application", 1),
        LayerConfig("domain", "Domain", 2),
        LayerConfig("infrastructure", "Infrastructure", 3),
    )

    fun build(rawClasses: List<ClassMetadata>, projectName: String): BoundedContextGraph {
        // 1. meta-annotation 해석
        val classes = MetaAnnotationResolver.resolve(rawClasses)

        // 2. 일반 클래스만 필터 (어노테이션 정의 제외)
        val normalClasses = classes.filter { !it.isAnnotationClass }

        // 3. 노드 생성
        val usedIds = mutableSetOf<String>()
        val nodes = normalClasses.map { toNode(it, usedIds) }

        // 4. 엣지 생성
        val resolvedEdges = DependencyResolver.resolve(normalClasses)
        val nodeIdMap = normalClasses.associate { it.className to NamingUtils.toKebabCase(it.className) }
        val edges = resolvedEdges.mapNotNull { edge ->
            val fromId = nodeIdMap[edge.fromClassName] ?: return@mapNotNull null
            val toId = nodeIdMap[edge.toClassName] ?: return@mapNotNull null
            DependencyEdge(
                from = fromId,
                to = toId,
                type = edge.edgeType,
                label = edge.label,
            )
        }

        return BoundedContextGraph(
            context = ContextInfo(
                id = NamingUtils.toKebabCase(projectName),
                name = projectName,
                description = "Auto-generated by archsight-scanner",
            ),
            layers = DEFAULT_LAYERS,
            nodes = nodes,
            edges = edges,
        )
    }

    private fun toNode(meta: ClassMetadata, usedIds: MutableSet<String>): ComponentNode {
        var id = NamingUtils.toKebabCase(meta.className)
        if (id in usedIds) {
            val prefix = meta.packageName.substringAfterLast(".").lowercase()
            id = "$prefix-$id"
        }
        usedIds.add(id)

        val layer = LayerClassifier.classify(meta)
        val type = TypeClassifier.classify(meta)

        return ComponentNode(
            id = id,
            label = meta.className,
            type = type,
            layer = layer,
            subtitle = generateSubtitle(type, meta),
            operations = meta.methods.ifEmpty { null },
            codeMapping = CodeMapping(
                filePath = meta.filePath,
                className = meta.className,
                packageName = meta.packageName,
                annotations = meta.annotations.ifEmpty { null },
            ),
        )
    }

    private fun generateSubtitle(type: String, meta: ClassMetadata): String? {
        return when (type) {
            "controller" -> "REST API endpoint"
            "usecase" -> meta.className
                .removeSuffix("UseCase")
                .removeSuffix("AppService")
                .replace(Regex("([a-z])([A-Z])"), "$1 $2")
                .lowercase()
            "aggregate" -> "Aggregate Root"
            "entity" -> "Entity"
            "value_object" -> "Value Object"
            "domain_service" -> "Domain Service"
            "repository" -> "Repository"
            "adapter" -> "Adapter"
            "domain_event" -> "Domain Event"
            "policy" -> "Event Handler"
            else -> null
        }
    }
}
```

- [ ] **Step 3: 테스트 실행**

Run: `cd scanner && ./gradlew test --tests "*GraphBuilderTest*"`
Expected: 4 tests passed

- [ ] **Step 4: Commit**

```bash
git add scanner/src/
git commit -m "feat(scanner): add GraphBuilder composing nodes, edges, and layers"
```

---

### Task 9: CLI Main (Clikt)

**Files:**
- Create: `scanner/src/main/kotlin/com/archsight/scanner/Main.kt`

- [ ] **Step 1: Main.kt 작성**

```kotlin
// scanner/src/main/kotlin/com/archsight/scanner/Main.kt
package com.archsight.scanner

import com.archsight.scanner.graph.GraphBuilder
import com.archsight.scanner.parser.JavaClassParser
import com.archsight.scanner.parser.KotlinClassParser
import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.main
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import java.nio.file.Path
import kotlin.io.path.*

class ScanCommand : CliktCommand(name = "scan", help = "Scan a Spring Boot project and generate BoundedContextGraph JSON") {
    private val projectPath by argument(help = "Path to the project root")
    private val output by option("-o", "--output", help = "Output file path").default("")
    private val name by option("--name", help = "Bounded Context name")
    private val stdout by option("--stdout", help = "Output to stdout instead of file").flag()

    override fun run() {
        val projectRoot = Path(projectPath).toAbsolutePath()
        if (!projectRoot.exists()) {
            echo("Error: Project path does not exist: $projectRoot", err = true)
            return
        }

        echo("Scanning: $projectRoot")

        // 1. 파일 수집
        val sourceFiles = FileCollector.collect(projectRoot)
        echo("Found ${sourceFiles.size} source files")

        // 2. 파싱
        val allClasses = mutableListOf<ClassMetadata>()
        for (sf in sourceFiles) {
            try {
                val source = sf.path.readText()
                val parsed = when (sf.language) {
                    Language.JAVA -> JavaClassParser.parse(source, sf.relativePath)
                    Language.KOTLIN -> KotlinClassParser.parse(source, sf.relativePath)
                }
                allClasses.addAll(parsed)
            } catch (e: Exception) {
                echo("Warning: Failed to parse ${sf.relativePath}: ${e.message}", err = true)
            }
        }
        echo("Parsed ${allClasses.size} classes")

        // 3. 그래프 빌드
        val projectName = name ?: projectRoot.fileName.toString()
        val graph = GraphBuilder.build(allClasses, projectName)
        echo("Generated: ${graph.nodes.size} nodes, ${graph.edges.size} edges")

        // 4. JSON 출력
        val mapper = ObjectMapper()
            .registerKotlinModule()
            .enable(SerializationFeature.INDENT_OUTPUT)
        val json = mapper.writeValueAsString(graph)

        if (stdout) {
            println(json)
        } else {
            val outputPath = if (output.isNotEmpty()) {
                Path(output).toAbsolutePath()
            } else {
                projectRoot.resolve(".archsight/base-graph.json")
            }
            outputPath.parent.createDirectories()
            outputPath.writeText(json)
            echo("Output: $outputPath")
        }
    }
}

fun main(args: Array<String>) = ScanCommand().main(args)
```

- [ ] **Step 2: 빌드 확인**

Run: `cd scanner && ./gradlew build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: fat JAR로 lms-demo 스캔 테스트**

Run: `cd scanner && ./gradlew jar && java -jar build/libs/archsight-scanner.jar scan C:/Users/kitek/IdeaProjects/lms-demo --stdout | head -20`
Expected: JSON 출력 시작 (노드가 포함된 BoundedContextGraph)

- [ ] **Step 4: Commit**

```bash
git add scanner/src/main/kotlin/com/archsight/scanner/Main.kt
git commit -m "feat(scanner): add CLI entry point with Clikt"
```

---

### Task 10: 통합 테스트 + 최종 검증

**Files:**
- Create: `scanner/src/test/kotlin/com/archsight/scanner/integration/LmsDemoScanTest.kt`

- [ ] **Step 1: lms-demo 통합 테스트**

```kotlin
// scanner/src/test/kotlin/com/archsight/scanner/integration/LmsDemoScanTest.kt
package com.archsight.scanner.integration

import com.archsight.scanner.FileCollector
import com.archsight.scanner.graph.GraphBuilder
import com.archsight.scanner.model.Language
import com.archsight.scanner.parser.JavaClassParser
import com.archsight.scanner.parser.KotlinClassParser
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import java.nio.file.Path
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.test.assertTrue

@EnabledIf("projectExists")
class LmsDemoScanTest {
    companion object {
        private val PROJECT_PATH = Path.of("C:/Users/kitek/IdeaProjects/lms-demo")

        @JvmStatic
        fun projectExists(): Boolean = PROJECT_PATH.exists()
    }

    @Test
    fun `scans lms-demo and produces valid graph`() {
        val files = FileCollector.collect(PROJECT_PATH)
        assertTrue(files.isNotEmpty(), "Should find source files")

        val classes = files.flatMap { sf ->
            val source = sf.path.readText()
            when (sf.language) {
                Language.JAVA -> JavaClassParser.parse(source, sf.relativePath)
                Language.KOTLIN -> KotlinClassParser.parse(source, sf.relativePath)
            }
        }
        assertTrue(classes.size > 10, "Should find multiple classes, found: ${classes.size}")

        val graph = GraphBuilder.build(classes, "lms-demo")

        // 노드 검증
        assertTrue(graph.nodes.size > 10, "Should have >10 nodes, got: ${graph.nodes.size}")
        assertTrue(graph.nodes.any { it.type == "controller" }, "Should have controllers")
        assertTrue(graph.nodes.any { it.type == "usecase" || it.type == "domain_service" }, "Should have services")
        assertTrue(graph.nodes.any { it.layer == "domain" }, "Should have domain layer nodes")

        // 엣지 검증
        assertTrue(graph.edges.isNotEmpty(), "Should have edges")
        assertTrue(graph.edges.any { it.type == "invokes" }, "Should have invokes edges")

        // 레이어 검증
        val layers = graph.nodes.map { it.layer }.toSet()
        assertTrue(layers.size >= 3, "Should use at least 3 DDD layers, got: $layers")

        println("LMS-demo scan result: ${graph.nodes.size} nodes, ${graph.edges.size} edges")
        println("Layers: ${graph.nodes.groupBy { it.layer }.mapValues { it.value.size }}")
        println("Types: ${graph.nodes.groupBy { it.type }.mapValues { it.value.size }}")
    }
}
```

- [ ] **Step 2: 테스트 실행**

Run: `cd scanner && ./gradlew test`
Expected: 모든 테스트 통과 (단위 + 통합)

- [ ] **Step 3: 전체 빌드 확인**

Run: `cd scanner && ./gradlew clean build`
Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit + Push**

```bash
git add scanner/
git commit -m "test(scanner): add lms-demo integration test"
git push
```
