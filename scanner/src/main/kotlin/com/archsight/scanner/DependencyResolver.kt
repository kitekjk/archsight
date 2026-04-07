package com.archsight.scanner

import com.archsight.scanner.classifier.LayerClassifier
import com.archsight.scanner.classifier.TypeClassifier
import com.archsight.scanner.model.ClassMetadata

/**
 * Represents a resolved dependency edge between two classes.
 */
data class ResolvedEdge(
    val fromClassName: String,
    val toClassName: String,
    val edgeType: String,
    val label: String? = null,
)

/**
 * Resolves dependency edges by inspecting constructor injection and implements/extends relationships.
 *
 * Edge type inference:
 * - controller → usecase = "invokes"
 * - usecase → aggregate/domain_service/repository = "invokes"
 * - service → repository = "invokes"
 * - aggregate → entity/value_object = "creates"
 * - policy → domain_event = "subscribes"
 * - else = "depends_on"
 */
object DependencyResolver {

    fun resolve(classes: List<ClassMetadata>): List<ResolvedEdge> {
        // Build a map of className → ClassMetadata for quick lookups
        val classMap: Map<String, ClassMetadata> = classes.associateBy { it.className }

        val edges = mutableListOf<ResolvedEdge>()

        for (cls in classes) {
            val fromType = TypeClassifier.classify(cls)

            // Constructor injection edges
            for (param in cls.constructorParams) {
                val targetClass = classMap[param.typeName] ?: continue
                val toType = TypeClassifier.classify(targetClass)
                val edgeType = inferEdgeType(fromType, toType)
                edges.add(ResolvedEdge(cls.className, targetClass.className, edgeType))
            }

            // Super type (implements/extends) edges
            for (superType in cls.superTypes) {
                val targetClass = classMap[superType] ?: continue
                val toType = TypeClassifier.classify(targetClass)
                val edgeType = "implements"
                edges.add(ResolvedEdge(cls.className, targetClass.className, edgeType))
            }
        }

        // Repository → Aggregate 관계 추론
        // EmployeeRepository → Employee (이름에서 Repository 접미사를 제거)
        for (cls in classes) {
            val type = TypeClassifier.classify(cls)
            if (type == "repository" && cls.className.endsWith("Repository")) {
                val aggregateName = cls.className.removeSuffix("Repository")
                val aggregateClass = classMap[aggregateName]
                if (aggregateClass != null) {
                    edges.add(ResolvedEdge(cls.className, aggregateClass.className, "invokes"))
                }
            }
        }

        return edges
    }

    private fun inferEdgeType(fromType: String, toType: String): String {
        return when {
            fromType == "controller" && toType == "usecase" -> "invokes"
            fromType == "usecase" && toType in setOf("aggregate", "domain_service", "repository") -> "invokes"
            fromType == "usecase" && toType == "usecase" -> "invokes"
            fromType in setOf("usecase", "domain_service") && toType == "repository" -> "invokes"
            fromType == "aggregate" && toType in setOf("entity", "value_object") -> "creates"
            fromType == "policy" && toType == "domain_event" -> "subscribes"
            else -> "depends_on"
        }
    }
}
