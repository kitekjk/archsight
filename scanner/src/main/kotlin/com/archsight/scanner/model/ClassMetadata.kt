package com.archsight.scanner.model

enum class Language { JAVA, KOTLIN }

data class ParamInfo(
    val name: String,
    val typeName: String,
)

data class ClassMetadata(
    val filePath: String,
    val packageName: String,
    val className: String,
    val annotations: List<String>,
    val constructorParams: List<ParamInfo>,
    val methods: List<String>,
    val superTypes: List<String>,
    val language: Language,
    val isAnnotationClass: Boolean = false,
)
