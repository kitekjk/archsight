package com.archsight.scanner

/**
 * Maps a known annotation name to its architectural layer and component type.
 */
data class AnnotationMapping(
    /** DDD/Hexagonal layer: "presentation", "application", "domain", "infrastructure" */
    val layer: String,
    /** Component type: "controller", "usecase", "aggregate", "repository", "adapter", etc. */
    val type: String,
)

/**
 * Built-in annotation mappings for common Spring Boot and DDD stereotypes.
 * Used as a default lookup when scanning projects without custom configuration.
 */
object KnownAnnotations {

    val BUILTIN: Map<String, AnnotationMapping> = mapOf(
        "@RestController" to AnnotationMapping("presentation", "controller"),
        "@Controller" to AnnotationMapping("presentation", "controller"),
        "@Service" to AnnotationMapping("application", "usecase"),
        "@Repository" to AnnotationMapping("infrastructure", "repository"),
        "@Component" to AnnotationMapping("infrastructure", "adapter"),
        "@Entity" to AnnotationMapping("domain", "aggregate"),
        "@Embeddable" to AnnotationMapping("domain", "value_object"),
        "@MappedSuperclass" to AnnotationMapping("domain", "entity"),
        "@EventListener" to AnnotationMapping("domain", "policy"),
        "@TransactionalEventListener" to AnnotationMapping("domain", "policy"),
        "@Scheduled" to AnnotationMapping("infrastructure", "adapter"),
        "@Async" to AnnotationMapping("infrastructure", "adapter"),
        "@WorkflowImpl" to AnnotationMapping("presentation", "controller"),
        "@ActivityImpl" to AnnotationMapping("presentation", "controller"),
    )

    /** Standard Spring stereotype annotations used to identify meta-annotation chains. */
    val SPRING_STEREOTYPES = setOf(
        "@Service",
        "@Component",
        "@Repository",
        "@Controller",
        "@RestController",
        "@Configuration",
    )
}
