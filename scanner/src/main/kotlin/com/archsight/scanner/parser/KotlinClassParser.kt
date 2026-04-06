package com.archsight.scanner.parser

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import com.archsight.scanner.util.NamingUtils
import org.jetbrains.kotlin.cli.common.messages.MessageRenderer
import org.jetbrains.kotlin.cli.common.messages.PrintingMessageCollector
import org.jetbrains.kotlin.cli.jvm.compiler.EnvironmentConfigFiles
import org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment
import org.jetbrains.kotlin.com.intellij.openapi.Disposable
import org.jetbrains.kotlin.com.intellij.openapi.util.Disposer
import org.jetbrains.kotlin.config.CommonConfigurationKeys
import org.jetbrains.kotlin.config.CompilerConfiguration
import org.jetbrains.kotlin.psi.KtClass
import org.jetbrains.kotlin.psi.KtFile
import org.jetbrains.kotlin.psi.KtNamedFunction
import org.jetbrains.kotlin.psi.KtPsiFactory
import org.jetbrains.kotlin.psi.psiUtil.isPublic

/**
 * Parses Kotlin source files into [ClassMetadata] using the Kotlin compiler PSI.
 * Handles data class, value class, regular class, and annotation class.
 */
class KotlinClassParser : AutoCloseable {

    private val disposable: Disposable = Disposer.newDisposable()
    private val psiFactory: KtPsiFactory

    init {
        val config = CompilerConfiguration().apply {
            put(
                CommonConfigurationKeys.MESSAGE_COLLECTOR_KEY,
                PrintingMessageCollector(System.err, MessageRenderer.PLAIN_RELATIVE_PATHS, false),
            )
        }
        val env = KotlinCoreEnvironment.createForProduction(
            disposable,
            config,
            EnvironmentConfigFiles.JVM_CONFIG_FILES,
        )
        psiFactory = KtPsiFactory(env.project)
    }

    fun parse(sourceCode: String, filePath: String): ClassMetadata {
        // Normalize CRLF to LF — the Kotlin PSI doesn't handle Windows line endings
        // correctly for annotation extraction when classes span many lines
        val normalizedSource = sourceCode.replace("\r\n", "\n").replace("\r", "\n")
        val ktFile: KtFile = psiFactory.createFile(filePath, normalizedSource)

        val packageName = ktFile.packageFqName.asString()

        // Find the primary class declaration
        val ktClass = ktFile.declarations
            .filterIsInstance<KtClass>()
            .firstOrNull()
            ?: error("No class declaration found in $filePath")

        val className = ktClass.name ?: error("Class has no name in $filePath")

        val isAnnotationClass = ktClass.isAnnotation()

        // Extract class-level annotations
        val annotations = ktClass.annotationEntries.map { entry ->
            val name = NamingUtils.normalizeAnnotation(entry.shortName?.asString() ?: "")
            NamingUtils.stripAnnotationParams(name)
        }

        // Extract primary constructor parameters
        val constructorParams = ktClass.primaryConstructor?.valueParameters?.map { param ->
            ParamInfo(
                name = param.name ?: "",
                typeName = param.typeReference?.text?.trimEnd('?') ?: "",
            )
        } ?: emptyList()

        // Extract public member functions (not private/protected/internal)
        val methods = ktClass.declarations
            .filterIsInstance<KtNamedFunction>()
            .filter { fn -> fn.isPublic }
            .map { fn ->
                val params = fn.valueParameters.joinToString(", ") { param ->
                    "${param.name}: ${param.typeReference?.text ?: "Any"}"
                }
                val returnType = fn.typeReference?.text ?: "Unit"
                "fun ${fn.name}($params): $returnType"
            }

        // Extract super types (implements/extends)
        val superTypes = ktClass.superTypeListEntries.map { superEntry ->
            // Get the short name from the type reference (strip type arguments)
            val typeText = superEntry.typeReference?.text ?: ""
            typeText.substringBefore("<").trim()
        }.filter { it.isNotEmpty() }

        return ClassMetadata(
            filePath = filePath,
            packageName = packageName,
            className = className,
            annotations = annotations,
            constructorParams = constructorParams,
            methods = methods,
            superTypes = superTypes,
            language = Language.KOTLIN,
            isAnnotationClass = isAnnotationClass,
        )
    }

    fun dispose() {
        Disposer.dispose(disposable)
    }

    override fun close() = dispose()
}
