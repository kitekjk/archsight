package com.archsight.scanner

import com.archsight.scanner.model.ClassMetadata

/**
 * Resolves custom meta-annotations by expanding them into their underlying Spring stereotypes.
 *
 * Algorithm:
 * 1. Build a map of annotation-class names → their own annotations (the meta-annotation registry)
 * 2. For each class, expand its annotations by following meta-annotation chains
 * 3. Chains are resolved transitively: @EventHandler → @DomainService → @Service
 */
class MetaAnnotationResolver(allClasses: List<ClassMetadata>) {

    /**
     * Maps annotation short name (e.g. "@UseCase") → list of annotations on the annotation class.
     * Only contains entries for classes where [ClassMetadata.isAnnotationClass] is true.
     */
    private val metaRegistry: Map<String, List<String>> = buildRegistry(allClasses)

    private fun buildRegistry(allClasses: List<ClassMetadata>): Map<String, List<String>> {
        return allClasses
            .filter { it.isAnnotationClass }
            .associate { "@${it.className}" to it.annotations }
    }

    /**
     * Returns a copy of [classMetadata] with annotations expanded via meta-annotation resolution.
     * Original annotations are preserved; resolved annotations are added without duplication.
     */
    fun resolve(classMetadata: ClassMetadata): ClassMetadata {
        val expanded = expandAnnotations(classMetadata.annotations)
        return classMetadata.copy(annotations = expanded)
    }

    /**
     * Resolves annotations for all non-annotation classes in the input list.
     */
    fun resolveAll(classes: List<ClassMetadata>): List<ClassMetadata> {
        return classes.map { if (it.isAnnotationClass) it else resolve(it) }
    }

    /**
     * Expands a list of annotations by following meta-annotation chains.
     * Preserves original annotations; appends resolved ones without duplication.
     */
    private fun expandAnnotations(annotations: List<String>): List<String> {
        val result = annotations.toMutableList()
        val toProcess = ArrayDeque(annotations)
        val visited = mutableSetOf<String>()

        while (toProcess.isNotEmpty()) {
            val annotation = toProcess.removeFirst()
            if (!visited.add(annotation)) continue

            val metaAnnotations = metaRegistry[annotation] ?: continue
            for (meta in metaAnnotations) {
                if (!result.contains(meta)) {
                    result.add(meta)
                }
                // Continue resolving chains
                toProcess.add(meta)
            }
        }

        return result
    }
}
