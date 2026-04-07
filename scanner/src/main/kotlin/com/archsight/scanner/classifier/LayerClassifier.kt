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
        val pkg = meta.packageName
        val pkgLayer = classifyByPackage(pkg)

        // 1. @Entity/@Embeddable — 패키지 위치가 infrastructure면 infrastructure 우선
        //    (도메인 모델과 JPA Entity를 분리한 프로젝트 지원)
        if (annotations.any { it == "@Entity" || it == "@Embeddable" || it == "@MappedSuperclass" }) {
            return if (pkgLayer == "infrastructure") "infrastructure" else "domain"
        }

        // 2. Check BUILTIN for direct match
        for (annotation in annotations) {
            val mapping = KnownAnnotations.BUILTIN[annotation]
            if (mapping != null) {
                return when {
                    annotation == "@Service" && (meta.className.endsWith("UseCase") || meta.className.endsWith("AppService")) ->
                        "application"
                    annotation == "@Service" && pkg.contains(".domain.") ->
                        "domain"
                    annotation == "@Service" ->
                        "application"
                    annotation == "@Component" && (meta.className.endsWith("Adapter") || meta.className.endsWith("Client") || meta.className.endsWith("Gateway")) ->
                        "infrastructure"
                    annotation == "@Component" ->
                        "infrastructure"
                    annotation == "@Repository" ->
                        // Repository도 패키지 위치 반영 (domain에 있으면 domain)
                        if (pkgLayer == "domain") "domain" else "infrastructure"
                    else -> mapping.layer
                }
            }
        }

        // 3. No annotation match → package name fallback
        return pkgLayer
    }

    private fun classifyByPackage(pkg: String): String {
        return when {
            pkg.contains(".presentation.") || pkg.contains(".web.") || pkg.contains(".controller.") || pkg.contains(".interfaces.") -> "presentation"
            pkg.contains(".application.") || pkg.contains(".usecase.") -> "application"
            pkg.contains(".domain.") || pkg.contains(".model.") -> "domain"
            pkg.contains(".infrastructure.") || pkg.contains(".persistence.") || pkg.contains(".config.") -> "infrastructure"
            else -> "domain"
        }
    }
}
