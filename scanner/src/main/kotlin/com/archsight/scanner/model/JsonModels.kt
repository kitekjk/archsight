package com.archsight.scanner.model

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class BoundedContextGraph(
    val context: ContextInfo,
    val layers: List<LayerConfig>? = null,
    val nodes: List<ComponentNode>,
    val edges: List<DependencyEdge>,
)

data class ContextInfo(
    val id: String,
    val name: String,
    val description: String? = null,
    val team: String? = null,
)

data class LayerConfig(
    val id: String,
    val displayName: String? = null,
    val order: Int,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ComponentNode(
    val id: String,
    val label: String,
    val type: String,
    val layer: String,
    val subtitle: String? = null,
    val description: String? = null,
    val aggregateId: String? = null,
    val operations: List<String>? = null,
    val codeMapping: CodeMapping? = null,
    val tags: List<String>? = null,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class CodeMapping(
    val filePath: String,
    val className: String,
    val packageName: String? = null,
    val annotations: List<String>? = null,
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class DependencyEdge(
    val from: String,
    val to: String,
    val type: String? = null,
    val label: String? = null,
    val method: String? = null,
)
