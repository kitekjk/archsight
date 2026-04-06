package com.archsight.scanner.parser

import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.Language
import com.archsight.scanner.model.ParamInfo
import com.archsight.scanner.util.NamingUtils
import com.github.javaparser.StaticJavaParser
import com.github.javaparser.ast.body.AnnotationDeclaration
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration
import com.github.javaparser.ast.body.ConstructorDeclaration
import com.github.javaparser.ast.body.MethodDeclaration
import com.github.javaparser.ast.body.TypeDeclaration

/**
 * Parses Java source files into [ClassMetadata] using JavaParser.
 * Extracts class name, package, annotations, constructor parameters, public methods, and super types.
 */
class JavaClassParser {

    fun parse(sourceCode: String, filePath: String): ClassMetadata {
        val cu = StaticJavaParser.parse(sourceCode)

        val packageName = cu.packageDeclaration
            .map { it.nameAsString }
            .orElse("")

        // Find the primary type declaration (first public type or first type)
        val typeDecl = cu.types
            .firstOrNull { it.isPublic } ?: cu.types.firstOrNull()
            ?: error("No type declaration found in $filePath")

        val className = typeDecl.nameAsString

        val isAnnotationClass = typeDecl is AnnotationDeclaration

        // Extract annotations (from the type declaration itself)
        val annotations = typeDecl.annotations.map { annotation ->
            val name = NamingUtils.normalizeAnnotation(annotation.nameAsString)
            NamingUtils.stripAnnotationParams(name)
        }

        // Extract super types (extends + implements) for class/interface declarations
        val superTypes = when (typeDecl) {
            is ClassOrInterfaceDeclaration -> {
                val extended = typeDecl.extendedTypes.map { it.nameAsString }
                val implemented = typeDecl.implementedTypes.map { it.nameAsString }
                extended + implemented
            }
            else -> emptyList()
        }

        // Extract constructor with most parameters (primary DI injection point)
        val constructors = typeDecl.members
            .filterIsInstance<ConstructorDeclaration>()
            .sortedByDescending { it.parameters.size }

        val constructorParams = constructors.firstOrNull()?.parameters?.map { param ->
            ParamInfo(
                name = param.nameAsString,
                typeName = param.typeAsString,
            )
        } ?: emptyList()

        // Extract public methods as signature strings
        val methods = typeDecl.members
            .filterIsInstance<MethodDeclaration>()
            .filter { it.isPublic }
            .map { method ->
                val params = method.parameters.joinToString(", ") { "${it.typeAsString} ${it.nameAsString}" }
                "${method.typeAsString} ${method.nameAsString}($params)"
            }

        return ClassMetadata(
            filePath = filePath,
            packageName = packageName,
            className = className,
            annotations = annotations,
            constructorParams = constructorParams,
            methods = methods,
            superTypes = superTypes,
            language = Language.JAVA,
            isAnnotationClass = isAnnotationClass,
        )
    }
}
