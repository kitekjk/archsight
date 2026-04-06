package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class LayerClassifierTest {

    private fun makeClass(
        className: String,
        annotations: List<String> = emptyList(),
        packageName: String = "com.example",
    ) = ClassMetadata(
        filePath = "$className.kt",
        packageName = packageName,
        className = className,
        annotations = annotations,
        constructorParams = emptyList(),
        methods = emptyList(),
        superTypes = emptyList(),
        language = Language.KOTLIN,
    )

    @Test
    fun `@RestController maps to presentation`() {
        val meta = makeClass("OrderController", listOf("@RestController"))
        assertEquals("presentation", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Controller maps to presentation`() {
        val meta = makeClass("HomeController", listOf("@Controller"))
        assertEquals("presentation", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Service with UseCase suffix maps to application`() {
        val meta = makeClass("CreateOrderUseCase", listOf("@Service"))
        assertEquals("application", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Service with AppService suffix maps to application`() {
        val meta = makeClass("OrderAppService", listOf("@Service"))
        assertEquals("application", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Service in domain package maps to domain`() {
        val meta = makeClass("OrderDomainService", listOf("@Service"), "com.example.domain.order")
        assertEquals("domain", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Service otherwise maps to application`() {
        val meta = makeClass("OrderService", listOf("@Service"))
        assertEquals("application", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Entity maps to domain`() {
        val meta = makeClass("Order", listOf("@Entity"))
        assertEquals("domain", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Repository maps to infrastructure`() {
        val meta = makeClass("OrderRepository", listOf("@Repository"))
        assertEquals("infrastructure", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Component with Adapter suffix maps to infrastructure`() {
        val meta = makeClass("KafkaAdapter", listOf("@Component"))
        assertEquals("infrastructure", LayerClassifier.classify(meta))
    }

    @Test
    fun `@Component otherwise maps to infrastructure`() {
        val meta = makeClass("SomeHelper", listOf("@Component"))
        assertEquals("infrastructure", LayerClassifier.classify(meta))
    }

    @Test
    fun `@WorkflowImpl maps to presentation`() {
        val meta = makeClass("OrderWorkflowImpl", listOf("@WorkflowImpl"))
        assertEquals("presentation", LayerClassifier.classify(meta))
    }

    @Test
    fun `package fallback - controller package maps to presentation`() {
        val meta = makeClass("OrderFacade", emptyList(), "com.example.controller.order")
        assertEquals("presentation", LayerClassifier.classify(meta))
    }

    @Test
    fun `package fallback - web package maps to presentation`() {
        val meta = makeClass("OrderFacade", emptyList(), "com.example.web.order")
        assertEquals("presentation", LayerClassifier.classify(meta))
    }

    @Test
    fun `package fallback - application package maps to application`() {
        val meta = makeClass("OrderFacade", emptyList(), "com.example.application.order")
        assertEquals("application", LayerClassifier.classify(meta))
    }

    @Test
    fun `package fallback - domain package maps to domain`() {
        val meta = makeClass("OrderEntity", emptyList(), "com.example.domain.order")
        assertEquals("domain", LayerClassifier.classify(meta))
    }

    @Test
    fun `package fallback - infrastructure package maps to infrastructure`() {
        val meta = makeClass("OrderJpaRepository", emptyList(), "com.example.infrastructure.persistence")
        assertEquals("infrastructure", LayerClassifier.classify(meta))
    }

    @Test
    fun `no match defaults to domain`() {
        val meta = makeClass("SomeThing", emptyList(), "com.example.misc")
        assertEquals("domain", LayerClassifier.classify(meta))
    }
}
