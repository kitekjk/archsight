package com.archsight.scanner.parser

import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class KotlinClassParserTest {

    private lateinit var parser: KotlinClassParser

    @BeforeAll
    fun setUp() {
        parser = KotlinClassParser()
    }

    @AfterAll
    fun tearDown() {
        parser.dispose()
    }

    @Test
    fun `parses data class with primary constructor`() {
        val source = """
            package com.example.order.domain

            data class OrderItem(
                val productId: String,
                val quantity: Int,
                val price: Long,
            )
        """.trimIndent()

        val result = parser.parse(source, "OrderItem.kt")

        assertEquals("com.example.order.domain", result.packageName)
        assertEquals("OrderItem", result.className)
        assertEquals(3, result.constructorParams.size)
        assertEquals("productId", result.constructorParams[0].name)
        assertEquals("String", result.constructorParams[0].typeName)
        assertEquals("quantity", result.constructorParams[1].name)
        assertEquals("Int", result.constructorParams[1].typeName)
        assertFalse(result.isAnnotationClass)
    }

    @Test
    fun `parses Spring service with constructor injection`() {
        val source = """
            package com.example.order.application

            import org.springframework.stereotype.Service
            import org.springframework.transaction.annotation.Transactional

            @Service
            @Transactional
            class OrderService(
                private val orderRepository: OrderRepository,
                private val eventPublisher: EventPublisher,
            ) {
                fun createOrder(command: CreateOrderCommand): String {
                    return "orderId"
                }

                fun cancelOrder(orderId: String) {
                    // cancel logic
                }

                private fun internalHelper(): Unit {}
            }
        """.trimIndent()

        val result = parser.parse(source, "OrderService.kt")

        assertEquals("com.example.order.application", result.packageName)
        assertEquals("OrderService", result.className)
        assertTrue(result.annotations.contains("@Service"), "should contain @Service")
        assertTrue(result.annotations.contains("@Transactional"), "should contain @Transactional")
        assertEquals(2, result.constructorParams.size)
        assertEquals("orderRepository", result.constructorParams[0].name)
        assertEquals("OrderRepository", result.constructorParams[0].typeName)
        assertEquals("eventPublisher", result.constructorParams[1].name)
        assertTrue(result.methods.any { it.contains("createOrder") }, "should have createOrder")
        assertTrue(result.methods.any { it.contains("cancelOrder") }, "should have cancelOrder")
        assertFalse(result.methods.any { it.contains("internalHelper") }, "should NOT have private method")
        assertFalse(result.isAnnotationClass)
    }

    @Test
    fun `parses annotation class as isAnnotationClass true`() {
        val source = """
            package com.example.annotation

            import org.springframework.stereotype.Service

            @Target(AnnotationTarget.CLASS)
            @Retention(AnnotationRetention.RUNTIME)
            @Service
            annotation class UseCase
        """.trimIndent()

        val result = parser.parse(source, "UseCase.kt")

        assertEquals("com.example.annotation", result.packageName)
        assertEquals("UseCase", result.className)
        assertTrue(result.isAnnotationClass, "should be annotation class")
        assertTrue(result.annotations.contains("@Service"), "should contain @Service")
    }

    @Test
    fun `parses value class`() {
        val source = """
            package com.example.order.domain

            @JvmInline
            value class OrderId(val value: String)
        """.trimIndent()

        val result = parser.parse(source, "OrderId.kt")

        assertEquals("com.example.order.domain", result.packageName)
        assertEquals("OrderId", result.className)
        assertEquals(1, result.constructorParams.size)
        assertEquals("value", result.constructorParams[0].name)
        assertEquals("String", result.constructorParams[0].typeName)
        assertTrue(result.annotations.contains("@JvmInline"), "should contain @JvmInline")
        assertFalse(result.isAnnotationClass)
    }
}
