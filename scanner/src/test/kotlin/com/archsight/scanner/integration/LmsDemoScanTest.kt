package com.archsight.scanner.integration

import com.archsight.scanner.FileCollector
import com.archsight.scanner.GraphBuilder
import com.archsight.scanner.model.Language
import com.archsight.scanner.parser.JavaClassParser
import com.archsight.scanner.parser.KotlinClassParser
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import kotlin.io.path.Path
import kotlin.io.path.exists
import kotlin.test.assertTrue

class LmsDemoScanTest {

    companion object {
        private const val LMS_DEMO_PATH = "C:/Users/kitek/IdeaProjects/lms-demo"

        @JvmStatic
        fun projectExists(): Boolean = Path(LMS_DEMO_PATH).exists()
    }

    @Test
    @EnabledIf("projectExists")
    fun `lms-demo scan produces valid graph`() {
        val projectRoot = Path(LMS_DEMO_PATH)
        val collector = FileCollector(projectRoot)
        val sourceFiles = collector.collect()

        // Found source files > 0
        assertTrue(sourceFiles.isNotEmpty(), "Should find source files")
        println("Source files found: ${sourceFiles.size}")

        // Parse all classes
        val javaParser = JavaClassParser()
        val kotlinParser = KotlinClassParser()

        val allClasses = sourceFiles.mapNotNull { sourceFile ->
            runCatching {
                val source = sourceFile.path.toFile().readText()
                when (sourceFile.language) {
                    Language.JAVA -> javaParser.parse(source, sourceFile.relativePath)
                    Language.KOTLIN -> kotlinParser.parse(source, sourceFile.relativePath)
                }
            }.getOrNull()
        }

        // Parsed classes > 10
        assertTrue(allClasses.size > 10, "Should parse more than 10 classes, got ${allClasses.size}")
        println("Classes parsed: ${allClasses.size}")

        // Build graph
        val graph = GraphBuilder.build(allClasses, "lms-demo")

        // Graph has nodes > 10
        assertTrue(graph.nodes.size > 10, "Graph should have more than 10 nodes, got ${graph.nodes.size}")

        // Has controllers
        val controllerNodes = graph.nodes.filter { it.type == "controller" }
        assertTrue(controllerNodes.isNotEmpty(), "Should have controller nodes")

        // Has services/usecases
        val serviceNodes = graph.nodes.filter { it.type in setOf("usecase", "domain_service") }
        assertTrue(serviceNodes.isNotEmpty(), "Should have service/usecase nodes")

        // Has domain layer nodes
        val domainNodes = graph.nodes.filter { it.layer == "domain" }
        assertTrue(domainNodes.isNotEmpty(), "Should have domain layer nodes")

        // Graph has edges with "invokes" type
        val invokesEdges = graph.edges.filter { it.type == "invokes" }
        assertTrue(invokesEdges.isNotEmpty(), "Should have edges of type 'invokes'")

        // At least 3 DDD layers used
        val usedLayers = graph.nodes.map { it.layer }.distinct()
        assertTrue(usedLayers.size >= 3, "Should use at least 3 DDD layers, got: $usedLayers")

        // Print summary
        println("\n=== LMS-DEMO SCAN SUMMARY ===")
        println("Nodes: ${graph.nodes.size}")
        println("Edges: ${graph.edges.size}")

        val layerDistribution = graph.nodes.groupBy { it.layer }.mapValues { it.value.size }
        println("Layer distribution: $layerDistribution")

        val typeDistribution = graph.nodes.groupBy { it.type }.mapValues { it.value.size }
        println("Type distribution: $typeDistribution")

        val edgeTypeDistribution = graph.edges.groupBy { it.type }.mapValues { it.value.size }
        println("Edge type distribution: $edgeTypeDistribution")
        println("==============================")
    }
}
