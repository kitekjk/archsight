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
