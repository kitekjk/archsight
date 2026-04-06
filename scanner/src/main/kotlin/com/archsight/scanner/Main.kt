package com.archsight.scanner

import com.archsight.scanner.model.Language
import com.archsight.scanner.parser.JavaClassParser
import com.archsight.scanner.parser.KotlinClassParser
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.main
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import java.nio.file.Path
import kotlin.io.path.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.readText
import kotlin.io.path.writeText

/**
 * CLI entry point for archsight-scanner.
 *
 * Usage:
 *   archsight-scanner scan <projectPath> [options]
 *
 * Options:
 *   -o, --output   Output file path (default: <project>/.archsight/base-graph.json)
 *   --name         Bounded context name (default: directory name)
 *   --stdout       Print JSON to stdout instead of writing to file
 */
class ScanCommand : CliktCommand(name = "scan") {

    val projectPath: String by argument()

    val output: String by option("-o", "--output").default("")

    val name: String by option("--name").default("")

    val stdout: Boolean by option("--stdout").flag()

    private val mapper = jacksonObjectMapper().apply {
        enable(SerializationFeature.INDENT_OUTPUT)
    }

    override fun run() {
        val projectRoot: Path = Path(projectPath)
        val projectName = name.ifEmpty { projectRoot.fileName?.toString() ?: "unknown" }

        echo("Scanning project: $projectRoot")

        // 1. Collect source files
        val collector = FileCollector(projectRoot)
        val sourceFiles = collector.collect()
        echo("Found ${sourceFiles.size} source files")

        // 2. Parse all classes
        val javaParser = JavaClassParser()
        val kotlinParser = KotlinClassParser()

        val allClasses = sourceFiles.mapNotNull { sourceFile ->
            runCatching {
                val source = sourceFile.path.readText()
                when (sourceFile.language) {
                    Language.JAVA -> javaParser.parse(source, sourceFile.relativePath)
                    Language.KOTLIN -> kotlinParser.parse(source, sourceFile.relativePath)
                }
            }.getOrNull()
        }
        echo("Parsed ${allClasses.size} classes")

        // 3. Build graph
        val graph = GraphBuilder.build(allClasses, projectName)
        echo("Graph: ${graph.nodes.size} nodes, ${graph.edges.size} edges")

        // 4. Output JSON
        val json = mapper.writeValueAsString(graph)

        if (stdout) {
            echo(json)
        } else {
            val outputPath: Path = if (output.isEmpty()) {
                projectRoot.resolve(".archsight/base-graph.json")
            } else {
                Path(output)
            }
            outputPath.parent?.createDirectories()
            outputPath.writeText(json)
            echo("Written to: $outputPath")
        }
    }
}

fun main(args: Array<String>) = ScanCommand().main(args)
