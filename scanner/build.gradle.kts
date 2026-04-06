plugins {
    kotlin("jvm") version "2.1.0"
    application
}

application {
    mainClass.set("com.archsight.scanner.MainKt")
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.github.javaparser:javaparser-core:3.26.4")
    implementation("org.jetbrains.kotlin:kotlin-compiler-embeddable:2.1.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.3")
    implementation("com.github.ajalt.clikt:clikt:5.0.3")

    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
}

tasks.test {
    useJUnitPlatform()
}

kotlin {
    jvmToolchain(17)
}

tasks.jar {
    manifest {
        attributes["Main-Class"] = "com.archsight.scanner.MainKt"
    }
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}
