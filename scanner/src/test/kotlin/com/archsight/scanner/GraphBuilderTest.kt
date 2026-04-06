package com.archsight.scanner

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class GraphBuilderTest {

    private fun makeClass(
        className: String,
        annotations: List<String> = emptyList(),
        packageName: String = "com.example",
        constructorParams: List<ParamInfo> = emptyList(),
        superTypes: List<String> = emptyList(),
        isAnnotationClass: Boolean = false,
    ) = ClassMetadata(
        filePath = "src/main/kotlin/$className.kt",
        packageName = packageName,
        className = className,
        annotations = annotations,
        constructorParams = constructorParams,
        methods = emptyList(),
        superTypes = superTypes,
        language = Language.KOTLIN,
        isAnnotationClass = isAnnotationClass,
    )

    private val sampleClasses = listOf(
        makeClass("OrderController", listOf("@RestController"), "com.example.presentation"),
        makeClass("CreateOrderUseCase", listOf("@Service"), "com.example.application",
            constructorParams = listOf(ParamInfo("orderRepository", "OrderRepository"))),
        makeClass("Order", listOf("@Entity"), "com.example.domain"),
        makeClass("OrderRepository", listOf("@Repository"), "com.example.infrastructure"),
    )

    @Test
    fun `graph has correct node count`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        assertEquals(4, graph.nodes.size)
    }

    @Test
    fun `nodes have kebab-case IDs`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        val ids = graph.nodes.map { it.id }
        assertTrue(ids.contains("order-controller"), "Should have 'order-controller'")
        assertTrue(ids.contains("create-order-use-case"), "Should have 'create-order-use-case'")
        assertTrue(ids.contains("order"), "Should have 'order'")
        assertTrue(ids.contains("order-repository"), "Should have 'order-repository'")
    }

    @Test
    fun `nodes have code mapping`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        graph.nodes.forEach { node ->
            assertNotNull(node.codeMapping, "Node ${node.id} should have codeMapping")
            assertTrue(node.codeMapping!!.className.isNotEmpty())
            assertTrue(node.codeMapping!!.filePath.isNotEmpty())
        }
    }

    @Test
    fun `graph includes default 4 DDD layers`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        assertNotNull(graph.layers)
        val layerIds = graph.layers!!.map { it.id }
        assertTrue(layerIds.contains("presentation"))
        assertTrue(layerIds.contains("application"))
        assertTrue(layerIds.contains("domain"))
        assertTrue(layerIds.contains("infrastructure"))
        assertEquals(4, graph.layers!!.size)
    }

    @Test
    fun `edges are resolved from constructor injection`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        assertTrue(graph.edges.isNotEmpty(), "Should have at least one edge")

        val edge = graph.edges.first { it.from == "create-order-use-case" }
        assertEquals("order-repository", edge.to)
        assertEquals("invokes", edge.type)
    }

    @Test
    fun `annotation classes are filtered out`() {
        val annotationClass = makeClass("UseCase", listOf("@Service"), isAnnotationClass = true)
        val classes = sampleClasses + annotationClass

        val graph = GraphBuilder.build(classes, "MyProject")
        // Annotation class should be excluded
        assertTrue(graph.nodes.none { it.label == "UseCase" }, "Annotation class should be filtered out")
        assertEquals(4, graph.nodes.size)
    }

    @Test
    fun `controller layer is presentation`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        val controller = graph.nodes.first { it.id == "order-controller" }
        assertEquals("presentation", controller.layer)
        assertEquals("controller", controller.type)
    }

    @Test
    fun `repository layer is infrastructure`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        val repo = graph.nodes.first { it.id == "order-repository" }
        assertEquals("infrastructure", repo.layer)
        assertEquals("repository", repo.type)
    }

    @Test
    fun `context id is kebab-case of project name`() {
        val graph = GraphBuilder.build(sampleClasses, "MyProject")
        assertEquals("my-project", graph.context.id)
        assertEquals("MyProject", graph.context.name)
    }
}
