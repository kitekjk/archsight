package com.archsight.scanner.classifier

import com.archsight.scanner.KnownAnnotations
import com.archsight.scanner.model.ClassMetadata

/**
 * Classifies a class into a component type based on annotations and name patterns.
 *
 * Types: "controller", "usecase", "aggregate", "entity", "value_object", "repository",
 *        "domain_service", "policy", "adapter", "command", "domain_event"
 */
object TypeClassifier {

    fun classify(meta: ClassMetadata): String {
        val annotations = meta.annotations
        val name = meta.className

        // 1. Check BUILTIN for direct match (first wins, with contextual overrides)
        for (annotation in annotations) {
            val mapping = KnownAnnotations.BUILTIN[annotation]
            if (mapping != null) {
                return when {
                    // 2. @Service + UseCase/AppService name → "usecase"
                    annotation == "@Service" && (name.endsWith("UseCase") || name.endsWith("AppService")) ->
                        "usecase"
                    // 3. @Service + domain package → "domain_service"
                    annotation == "@Service" && meta.packageName.contains(".domain.") ->
                        "domain_service"
                    // 4. @Service otherwise → "usecase"
                    annotation == "@Service" ->
                        "usecase"
                    // 5. @Component + Adapter/Client/Gateway name → "adapter"
                    annotation == "@Component" && (name.endsWith("Adapter") || name.endsWith("Client") || name.endsWith("Gateway")) ->
                        "adapter"
                    annotation == "@Component" ->
                        "adapter"
                    else -> mapping.type
                }
            }
        }

        // 6. Name patterns (no annotation match)
        return when {
            name.endsWith("Event") -> "domain_event"
            name.endsWith("Command") -> "command"
            name.endsWith("Policy") || name.endsWith("Saga") -> "policy"
            name.endsWith("Repository") -> "repository"
            annotations.contains("@JvmInline") -> "value_object"
            else -> "aggregate"
        }
    }
}
