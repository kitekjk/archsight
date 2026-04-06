package com.archsight.scanner

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DependencyResolverTest {

    private fun makeClass(
        className: String,
        annotations: List<String> = emptyList(),
        packageName: String = "com.example",
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
    fun `constructor injection creates dependency edge`() {
        val repo = makeClass("OrderRepository", listOf("@Repository"))
        val service = makeClass(
            "CreateOrderUseCase",
            listOf("@Service"),
            constructorParams = listOf(ParamInfo("orderRepository", "OrderRepository")),
        )

        val edges = DependencyResolver.resolve(listOf(repo, service))
        assertEquals(1, edges.size)
        assertEquals("CreateOrderUseCase", edges[0].fromClassName)
        assertEquals("OrderRepository", edges[0].toClassName)
    }

    @Test
    fun `controller to usecase creates invokes edge`() {
        val useCase = makeClass("CreateOrderUseCase", listOf("@Service"))
        val controller = makeClass(
            "OrderController",
            listOf("@RestController"),
            constructorParams = listOf(ParamInfo("createOrderUseCase", "CreateOrderUseCase")),
        )

        val edges = DependencyResolver.resolve(listOf(useCase, controller))
        assertEquals(1, edges.size)
        assertEquals("invokes", edges[0].edgeType)
    }

    @Test
    fun `usecase to repository creates invokes edge`() {
        val repo = makeClass("OrderRepository", listOf("@Repository"))
        val useCase = makeClass(
            "CreateOrderUseCase",
            listOf("@Service"),
            constructorParams = listOf(ParamInfo("orderRepository", "OrderRepository")),
        )

        val edges = DependencyResolver.resolve(listOf(repo, useCase))
        assertEquals(1, edges.size)
        assertEquals("invokes", edges[0].edgeType)
    }

    @Test
    fun `implements relationship creates implements edge`() {
        val iface = makeClass("OrderRepositoryPort")
        val impl = makeClass(
            "JpaOrderRepository",
            listOf("@Repository"),
            superTypes = listOf("OrderRepositoryPort"),
        )

        val edges = DependencyResolver.resolve(listOf(iface, impl))
        assertEquals(1, edges.size)
        assertEquals("implements", edges[0].edgeType)
        assertEquals("JpaOrderRepository", edges[0].fromClassName)
        assertEquals("OrderRepositoryPort", edges[0].toClassName)
    }

    @Test
    fun `ignores unknown constructor param types`() {
        val service = makeClass(
            "CreateOrderUseCase",
            listOf("@Service"),
            constructorParams = listOf(
                ParamInfo("unknownDep", "SomeExternalClass"),
                ParamInfo("strValue", "String"),
            ),
        )

        val edges = DependencyResolver.resolve(listOf(service))
        assertTrue(edges.isEmpty(), "Should ignore params with unknown types")
    }

    @Test
    fun `policy to domain_event creates subscribes edge`() {
        val event = makeClass("OrderCancelledEvent")
        val policy = makeClass(
            "RefundPolicy",
            constructorParams = listOf(ParamInfo("event", "OrderCancelledEvent")),
        )

        val edges = DependencyResolver.resolve(listOf(event, policy))
        assertEquals(1, edges.size)
        assertEquals("subscribes", edges[0].edgeType)
    }

    @Test
    fun `aggregate to value_object creates creates edge`() {
        val vo = makeClass("Money", listOf("@Embeddable"))
        val aggregate = makeClass(
            "Order",
            listOf("@Entity"),
            constructorParams = listOf(ParamInfo("price", "Money")),
        )

        val edges = DependencyResolver.resolve(listOf(vo, aggregate))
        assertEquals(1, edges.size)
        assertEquals("creates", edges[0].edgeType)
    }

    @Test
    fun `unrelated classes create depends_on edge`() {
        val helper = makeClass("SomeHelper", listOf("@Component"))
        val adapter = makeClass(
            "SomeAdapter",
            listOf("@Component"),
            constructorParams = listOf(ParamInfo("helper", "SomeHelper")),
        )

        val edges = DependencyResolver.resolve(listOf(helper, adapter))
        assertEquals(1, edges.size)
        assertEquals("depends_on", edges[0].edgeType)
    }
}
