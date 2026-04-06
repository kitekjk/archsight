package com.archsight.scanner.classifier

import com.archsight.scanner.KnownAnnotations
import com.archsight.scanner.model.ClassMetadata

/**
 * Classifies a class into a DDD/Hexagonal layer based on annotations and package name.
 *
 * Layers: "presentation", "application", "domain", "infrastructure"
 */
object LayerClassifier {

    fun classify(meta: ClassMetadata): String {
        val annotations = meta.annotations

        // 1. Check BUILTIN for direct match (first wins)
        for (annotation in annotations) {
            val mapping = KnownAnnotations.BUILTIN[annotation]
            if (mapping != null) {
                // Apply contextual overrides before returning builtin result
                return when {
                    // 2. @Service + className ends with UseCase/AppService → "application"
                    annotation == "@Service" && (meta.className.endsWith("UseCase") || meta.className.endsWith("AppService")) ->
                        "application"
                    // 3. @Service + package contains ".domain." → "domain"
                    annotation == "@Service" && meta.packageName.contains(".domain.") ->
                        "domain"
                    // 4. @Service otherwise → "application"
                    annotation == "@Service" ->
                        "application"
                    // 5. @Component + className ends with Adapter/Client/Gateway → "infrastructure"
                    annotation == "@Component" && (meta.className.endsWith("Adapter") || meta.className.endsWith("Client") || meta.className.endsWith("Gateway")) ->
                        "infrastructure"
                    // 6. @Component otherwise → "infrastructure"
                    annotation == "@Component" ->
                        "infrastructure"
                    else -> mapping.layer
                }
            }
        }

        // 7. No annotation match → package name fallback
        val pkg = meta.packageName
        return when {
            pkg.contains(".presentation.") || pkg.contains(".web.") || pkg.contains(".controller.") -> "presentation"
            pkg.contains(".application.") || pkg.contains(".usecase.") -> "application"
            pkg.contains(".domain.") || pkg.contains(".model.") -> "domain"
            pkg.contains(".infrastructure.") || pkg.contains(".persistence.") || pkg.contains(".config.") -> "infrastructure"
            else -> "domain"
        }
    }
}
