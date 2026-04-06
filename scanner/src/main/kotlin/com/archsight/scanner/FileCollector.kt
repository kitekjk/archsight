package com.archsight.scanner

import com.archsight.scanner.model.Language
import java.nio.file.Path
import kotlin.io.path.*

data class SourceFile(
    val path: Path,
    val language: Language,
    val relativePath: String,
)

/**
 * Collects Java and Kotlin source files from a project root.
 * Scans `src/main/` directories only, excluding `src/test/`.
 * Supports multi-module projects by parsing `settings.gradle.kts` or `settings.gradle`.
 */
class FileCollector(private val projectRoot: Path) {

    fun collect(): List<SourceFile> {
        val roots = resolveModuleRoots()
        return roots.flatMap { collectFromRoot(it) }
    }

    private fun resolveModuleRoots(): List<Path> {
        val roots = mutableListOf<Path>()

        // Always include the project root itself
        roots.add(projectRoot)

        // Check for multi-module settings
        val settingsKts = projectRoot.resolve("settings.gradle.kts")
        val settingsGroovy = projectRoot.resolve("settings.gradle")
        val settingsFile = when {
            settingsKts.exists() -> settingsKts
            settingsGroovy.exists() -> settingsGroovy
            else -> null
        }

        if (settingsFile != null) {
            val moduleNames = parseIncludeDirectives(settingsFile.readText())
            for (moduleName in moduleNames) {
                val moduleDir = projectRoot.resolve(moduleName)
                if (moduleDir.exists() && moduleDir.isDirectory()) {
                    roots.add(moduleDir)
                }
            }
        }

        return roots.distinct()
    }

    /**
     * Parses `include("a", "b")` or `include 'a', 'b'` directives from settings files.
     */
    private fun parseIncludeDirectives(content: String): List<String> {
        val modules = mutableListOf<String>()
        // Match include("module1", "module2") or include 'module1', 'module2'
        val includeRegex = Regex("""include\s*\(([^)]+)\)""")
        for (match in includeRegex.findAll(content)) {
            val args = match.groupValues[1]
            // Extract quoted strings
            val quotedRegex = Regex("""["']([^"']+)["']""")
            for (quoted in quotedRegex.findAll(args)) {
                // Gradle module paths use ':' as separator for nested; map to path separator
                val modulePath = quoted.groupValues[1].replace(":", "/")
                modules.add(modulePath)
            }
        }
        return modules
    }

    private fun collectFromRoot(root: Path): List<SourceFile> {
        val files = mutableListOf<SourceFile>()
        val srcMainDirs = listOf(
            root.resolve("src/main/java"),
            root.resolve("src/main/kotlin"),
        )
        for (srcDir in srcMainDirs) {
            if (!srcDir.exists()) continue
            srcDir.walk().forEach { file ->
                if (!file.isRegularFile()) return@forEach
                val language = when (file.extension.lowercase()) {
                    "java" -> Language.JAVA
                    "kt" -> Language.KOTLIN
                    else -> return@forEach
                }
                val relativePath = projectRoot.relativize(file).toString().replace("\\", "/")
                files.add(SourceFile(path = file, language = language, relativePath = relativePath))
            }
        }
        return files
    }
}
