package com.archsight.scanner

import com.archsight.scanner.model.Language
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FileCollectorTest {

    @Test
    fun `collects java and kotlin files from src main`(@TempDir tempDir: Path) {
        // Arrange
        val srcMain = tempDir.resolve("src/main/java/com/example")
        srcMain.createDirectories()
        srcMain.resolve("OrderController.java").writeText("class OrderController {}")

        val srcMainKt = tempDir.resolve("src/main/kotlin/com/example")
        srcMainKt.createDirectories()
        srcMainKt.resolve("OrderService.kt").writeText("class OrderService")

        // Act
        val collector = FileCollector(tempDir)
        val files = collector.collect()

        // Assert
        assertEquals(2, files.size)
        val javaFile = files.first { it.language == Language.JAVA }
        val kotlinFile = files.first { it.language == Language.KOTLIN }
        assertTrue(javaFile.path.toString().endsWith("OrderController.java"))
        assertTrue(kotlinFile.path.toString().endsWith("OrderService.kt"))
    }

    @Test
    fun `excludes test sources`(@TempDir tempDir: Path) {
        // Arrange - main source
        val srcMain = tempDir.resolve("src/main/java/com/example")
        srcMain.createDirectories()
        srcMain.resolve("MainClass.java").writeText("class MainClass {}")

        // Arrange - test source (should be excluded)
        val srcTest = tempDir.resolve("src/test/java/com/example")
        srcTest.createDirectories()
        srcTest.resolve("MainClassTest.java").writeText("class MainClassTest {}")

        val srcTestKt = tempDir.resolve("src/test/kotlin/com/example")
        srcTestKt.createDirectories()
        srcTestKt.resolve("SomeTest.kt").writeText("class SomeTest")

        // Act
        val collector = FileCollector(tempDir)
        val files = collector.collect()

        // Assert
        assertEquals(1, files.size)
        assertEquals(Language.JAVA, files[0].language)
        assertTrue(files[0].path.toString().endsWith("MainClass.java"))
    }

    @Test
    fun `supports multi-module via settings gradle kts parsing`(@TempDir tempDir: Path) {
        // Arrange - settings.gradle.kts with modules
        tempDir.resolve("settings.gradle.kts").writeText("""
            rootProject.name = "my-project"
            include("order-service", "payment-service")
        """.trimIndent())

        val orderSrcMain = tempDir.resolve("order-service/src/main/java/com/example/order")
        orderSrcMain.createDirectories()
        orderSrcMain.resolve("OrderController.java").writeText("class OrderController {}")

        val paymentSrcMain = tempDir.resolve("payment-service/src/main/kotlin/com/example/payment")
        paymentSrcMain.createDirectories()
        paymentSrcMain.resolve("PaymentService.kt").writeText("class PaymentService")

        // Root src/main (no files here)
        val rootSrc = tempDir.resolve("src/main/java")
        rootSrc.createDirectories()

        // Act
        val collector = FileCollector(tempDir)
        val files = collector.collect()

        // Assert
        assertEquals(2, files.size)
        assertTrue(files.any { it.language == Language.JAVA && it.path.toString().endsWith("OrderController.java") })
        assertTrue(files.any { it.language == Language.KOTLIN && it.path.toString().endsWith("PaymentService.kt") })
    }

    @Test
    fun `relative paths are set correctly`(@TempDir tempDir: Path) {
        val srcMain = tempDir.resolve("src/main/kotlin/com/example")
        srcMain.createDirectories()
        srcMain.resolve("MyService.kt").writeText("class MyService")

        val collector = FileCollector(tempDir)
        val files = collector.collect()

        assertEquals(1, files.size)
        val relPath = files[0].relativePath
        assertTrue(relPath.contains("MyService.kt"), "relativePath should contain filename, got: $relPath")
        assertTrue(!relPath.startsWith("/") || relPath.contains("src/main"), "relativePath should be relative")
    }
}
