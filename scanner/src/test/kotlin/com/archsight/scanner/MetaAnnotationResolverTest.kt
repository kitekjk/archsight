package com.archsight.scanner

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MetaAnnotationResolverTest {

    private fun makeClass(
        className: String,
        annotations: List<String>,
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
        // @UseCase annotation itself is annotated with @Service
        val useCaseAnnotation = makeClass(
            "UseCase",
            listOf("@Service", "@Target"),
            isAnnotationClass = true,
        )

        // A normal class annotated with @UseCase
        val serviceClass = makeClass(
            "CreateOrderUseCase",
            listOf("@UseCase"),
            isAnnotationClass = false,
        )

        val allClasses = listOf(useCaseAnnotation, serviceClass)
        val resolver = MetaAnnotationResolver(allClasses)
        val result = resolver.resolve(serviceClass)

        assertTrue(result.annotations.contains("@UseCase"), "should keep original @UseCase")
        assertTrue(result.annotations.contains("@Service"), "should add resolved @Service")
    }

    @Test
    fun `preserves original annotations when no custom annotation found`() {
        val serviceClass = makeClass(
            "OrderService",
            listOf("@Service", "@Transactional"),
        )

        val allClasses = listOf(serviceClass)
        val resolver = MetaAnnotationResolver(allClasses)
        val result = resolver.resolve(serviceClass)

        assertTrue(result.annotations.contains("@Service"))
        assertTrue(result.annotations.contains("@Transactional"))
        // No extras added
        assertFalse(result.annotations.any { it == "@Component" }, "should not add unrelated annotations")
    }

    @Test
    fun `handles chained meta-annotations`() {
        // @DomainService → @Service
        val domainServiceAnnotation = makeClass(
            "DomainService",
            listOf("@Service"),
            isAnnotationClass = true,
        )

        // @EventHandler → @DomainService
        val eventHandlerAnnotation = makeClass(
            "EventHandler",
            listOf("@DomainService"),
            isAnnotationClass = true,
        )

        // Normal class with @EventHandler
        val handlerClass = makeClass(
            "OrderCancelledHandler",
            listOf("@EventHandler"),
        )

        val allClasses = listOf(domainServiceAnnotation, eventHandlerAnnotation, handlerClass)
        val resolver = MetaAnnotationResolver(allClasses)
        val result = resolver.resolve(handlerClass)

        assertTrue(result.annotations.contains("@EventHandler"), "should keep @EventHandler")
        assertTrue(result.annotations.contains("@DomainService"), "should resolve to @DomainService")
        assertTrue(result.annotations.contains("@Service"), "should chain-resolve to @Service")
    }

    @Test
    fun `does not duplicate annotations already present`() {
        val useCaseAnnotation = makeClass(
            "UseCase",
            listOf("@Service"),
            isAnnotationClass = true,
        )

        // Already has @Service directly
        val serviceClass = makeClass(
            "CreateOrderUseCase",
            listOf("@UseCase", "@Service"),
        )

        val allClasses = listOf(useCaseAnnotation, serviceClass)
        val resolver = MetaAnnotationResolver(allClasses)
        val result = resolver.resolve(serviceClass)

        val serviceCount = result.annotations.count { it == "@Service" }
        assertTrue(serviceCount == 1, "should not duplicate @Service, got count=$serviceCount")
    }
}
