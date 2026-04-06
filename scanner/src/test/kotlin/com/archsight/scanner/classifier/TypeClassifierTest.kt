package com.archsight.scanner.classifier

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class TypeClassifierTest {

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
    fun `@RestController maps to controller`() {
        val meta = makeClass("OrderController", listOf("@RestController"))
        assertEquals("controller", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Service with UseCase suffix maps to usecase`() {
        val meta = makeClass("CreateOrderUseCase", listOf("@Service"))
        assertEquals("usecase", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Service with AppService suffix maps to usecase`() {
        val meta = makeClass("OrderAppService", listOf("@Service"))
        assertEquals("usecase", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Service in domain package maps to domain_service`() {
        val meta = makeClass("OrderDomainService", listOf("@Service"), "com.example.domain.order")
        assertEquals("domain_service", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Service otherwise maps to usecase`() {
        val meta = makeClass("OrderService", listOf("@Service"))
        assertEquals("usecase", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Entity maps to aggregate`() {
        val meta = makeClass("Order", listOf("@Entity"))
        assertEquals("aggregate", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Embeddable maps to value_object`() {
        val meta = makeClass("Money", listOf("@Embeddable"))
        assertEquals("value_object", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Repository maps to repository`() {
        val meta = makeClass("OrderRepository", listOf("@Repository"))
        assertEquals("repository", TypeClassifier.classify(meta))
    }

    @Test
    fun `@Component with Adapter suffix maps to adapter`() {
        val meta = makeClass("KafkaAdapter", listOf("@Component"))
        assertEquals("adapter", TypeClassifier.classify(meta))
    }

    @Test
    fun `@WorkflowImpl maps to controller`() {
        val meta = makeClass("OrderWorkflowImpl", listOf("@WorkflowImpl"))
        assertEquals("controller", TypeClassifier.classify(meta))
    }

    @Test
    fun `name ending with Event maps to domain_event`() {
        val meta = makeClass("OrderCancelledEvent")
        assertEquals("domain_event", TypeClassifier.classify(meta))
    }

    @Test
    fun `name ending with Command maps to command`() {
        val meta = makeClass("CancelOrderCommand")
        assertEquals("command", TypeClassifier.classify(meta))
    }

    @Test
    fun `name ending with Policy maps to policy`() {
        val meta = makeClass("RefundPolicy")
        assertEquals("policy", TypeClassifier.classify(meta))
    }

    @Test
    fun `name ending with Saga maps to policy`() {
        val meta = makeClass("OrderSaga")
        assertEquals("policy", TypeClassifier.classify(meta))
    }

    @Test
    fun `name ending with Repository (no annotation) maps to repository`() {
        val meta = makeClass("OrderRepositoryImpl")
        // Does not end with Repository, falls to aggregate
        assertEquals("aggregate", TypeClassifier.classify(meta))
    }

    @Test
    fun `name ending with Repository maps to repository`() {
        val meta = makeClass("OrderRepository")
        assertEquals("repository", TypeClassifier.classify(meta))
    }

    @Test
    fun `@JvmInline maps to value_object`() {
        val meta = makeClass("OrderId", listOf("@JvmInline"))
        assertEquals("value_object", TypeClassifier.classify(meta))
    }

    @Test
    fun `no match defaults to aggregate`() {
        val meta = makeClass("SomeThing")
        assertEquals("aggregate", TypeClassifier.classify(meta))
    }
}
