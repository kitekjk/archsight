package com.archsight.scanner.util

object NamingUtils {
    fun toKebabCase(name: String): String {
        return name
            .replace(Regex("([a-z])([A-Z])"), "$1-$2")
            .replace(Regex("([A-Z]+)([A-Z][a-z])"), "$1-$2")
            .lowercase()
    }

    fun normalizeAnnotation(name: String): String {
        return if (name.startsWith("@")) name else "@$name"
    }

    fun stripAnnotationParams(annotation: String): String {
        val parenIndex = annotation.indexOf('(')
        return if (parenIndex > 0) annotation.substring(0, parenIndex) else annotation
    }
}
