package com.archsight.scanner

import com.archsight.scanner.classifier.LayerClassifier
import com.archsight.scanner.classifier.TypeClassifier
import com.archsight.scanner.model.BoundedContextGraph
import com.archsight.scanner.model.ClassMetadata
import com.archsight.scanner.model.CodeMapping
import com.archsight.scanner.model.ComponentNode
import com.archsight.scanner.model.ContextInfo
import com.archsight.scanner.model.DependencyEdge
import com.archsight.scanner.model.LayerConfig
import com.archsight.scanner.util.NamingUtils

/**
 * Assembles the full BoundedContextGraph from a list of raw ClassMetadata.
 *
 * Steps:
 * 1. MetaAnnotationResolver — expand custom annotations
 * 2. Filter out annotation classes
 * 3. Build ComponentNodes (classify layer/type, generate ID, codeMapping)
 * 4. Build DependencyEdges via DependencyResolver
 * 5. Add default 4 DDD layers
 */
object GraphBuilder {

    private val DEFAULT_LAYERS = listOf(
        LayerConfig(id = "presentation", displayName = "Presentation", order = 0),
        LayerConfig(id = "application", displayName = "Application", order = 1),
        LayerConfig(id = "domain", displayName = "Domain", order = 2),
        LayerConfig(id = "infrastructure", displayName = "Infrastructure", order = 3),
    )

    fun build(rawClasses: List<ClassMetadata>, projectName: String): BoundedContextGraph {
        // 1. Expand meta-annotations
        val resolver = MetaAnnotationResolver(rawClasses)
        val resolved = resolver.resolveAll(rawClasses)

        // 2. Filter out non-architectural classes
        val componentClasses = resolved.filter { !it.isAnnotationClass && isArchitecturalClass(it) }

        // 3. Build nodes
        val nodes = componentClasses.map { meta -> buildNode(meta) }

        // Build className → nodeId map for edge translation
        val classToId: Map<String, String> = componentClasses.associate { it.className to buildNodeId(it) }

        // 4. Resolve edges from component classes only
        val resolvedEdges = DependencyResolver.resolve(componentClasses)
        val edges = resolvedEdges.mapNotNull { edge ->
            val fromId = classToId[edge.fromClassName] ?: return@mapNotNull null
            val toId = classToId[edge.toClassName] ?: return@mapNotNull null
            DependencyEdge(
                from = fromId,
                to = toId,
                type = edge.edgeType,
                label = edge.label,
            )
        }

        // 5. Build context info and return graph
        val contextId = NamingUtils.toKebabCase(projectName)
        return BoundedContextGraph(
            context = ContextInfo(
                id = contextId,
                name = projectName,
            ),
            layers = DEFAULT_LAYERS,
            nodes = nodes,
            edges = edges,
        )
    }

    private fun buildNode(meta: ClassMetadata): ComponentNode {
        val layer = LayerClassifier.classify(meta)
        val type = TypeClassifier.classify(meta)
        val id = buildNodeId(meta)

        return ComponentNode(
            id = id,
            label = meta.className,
            type = type,
            layer = layer,
            subtitle = buildSubtitle(meta, type),
            codeMapping = CodeMapping(
                filePath = meta.filePath,
                className = meta.className,
                packageName = meta.packageName,
                annotations = meta.annotations.ifEmpty { null },
            ),
        )
    }

    private fun buildNodeId(meta: ClassMetadata): String {
        return NamingUtils.toKebabCase(meta.className)
    }

    private fun buildSubtitle(meta: ClassMetadata, type: String): String? {
        return when (type) {
            "controller" -> "REST API endpoint"
            "usecase" -> buildUseCaseSubtitle(meta.className)
            "aggregate" -> "Aggregate Root"
            "entity" -> "Entity"
            "value_object" -> "Value Object"
            "repository" -> "Repository"
            "domain_service" -> "Domain Service"
            "policy" -> "Policy / Event Handler"
            "adapter" -> "Infrastructure Adapter"
            "domain_event" -> "Domain Event"
            "command" -> "Command"
            else -> null
        }
    }

    /** 아키텍처 다이어그램에 보여야 할 타입 */
    private val ARCHITECTURAL_TYPES = setOf(
        "controller", "usecase", "aggregate", "domain_service",
        "repository", "adapter", "policy", "domain_event",
        "entity", "value_object",
    )

    /**
     * 아키텍처 다이어그램에 의미 있는 클래스만 포함.
     *
     * 포함: Controller, UseCase, Aggregate, DomainService, Repository, Adapter, Policy, DomainEvent
     * 제외: DTO, Exception, Config, Mapper, Command, Query, Entity, ValueObject, 기타
     */
    private fun isArchitecturalClass(meta: ClassMetadata): Boolean {
        // 먼저 타입을 분류해서 아키텍처적으로 의미 있는 타입인지 확인
        val type = TypeClassifier.classify(meta)
        if (type !in ARCHITECTURAL_TYPES) return false

        val name = meta.className
        val pkg = meta.packageName

        // infrastructure의 entity/value_object는 JPA 매핑용이므로 제외
        val layer = LayerClassifier.classify(meta)
        if (layer == "infrastructure" && type in setOf("entity", "value_object", "aggregate")) return false

        // 이름 패턴으로 추가 제외 (타입 분류를 통과했더라도)
        val excludeSuffixes = listOf(
            "Dto", "DTO", "Request", "Response", "Result",
            "Exception", "Error",
            "Config", "Configuration", "Properties",
            "Mapper", "Converter", "Serializer", "Deserializer",
            "Interceptor", "Filter",
            "Advice", "Handler",
            "Base", "Abstract",
            "Constants", "Const", "Utils", "Util", "Helper",
        )
        if (excludeSuffixes.any { name.endsWith(it) }) return false

        // 패키지 패턴으로 제외
        val excludePackages = listOf(".dto.", ".exception.", ".error.", ".config.", ".common.")
        if (excludePackages.any { pkg.contains(it) }) return false

        return true
    }

    private fun buildUseCaseSubtitle(className: String): String {
        // Convert CamelCase to spaced words, e.g. "CreateOrderUseCase" → "Create Order"
        val withoutSuffix = className
            .removeSuffix("UseCase")
            .removeSuffix("AppService")
            .removeSuffix("Service")
        return withoutSuffix
            .replace(Regex("([a-z])([A-Z])"), "$1 $2")
            .replace(Regex("([A-Z]+)([A-Z][a-z])"), "$1 $2")
            .trim()
            .ifEmpty { className }
    }
}
