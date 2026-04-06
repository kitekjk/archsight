package com.archsight.scanner.parser

import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import kotlin.test.assertTrue

/**
 * Tests that the KotlinClassParser handles edge cases in annotation extraction,
 * including complex annotation parameters and Windows CRLF line endings.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class KotlinAnnotationParsingTest {

    private lateinit var parser: KotlinClassParser

    @BeforeAll
    fun setUp() {
        parser = KotlinClassParser()
    }

    @AfterAll
    fun tearDown() {
        parser.dispose()
    }

    @Test
    fun `parses annotations with complex string params`() {
        val source = """
            package com.lms.interfaces.web.controller

            @Tag(name = "Attendance API", description = "Check-in and check-out API")
            @RestController
            @RequestMapping("/api/attendance")
            class AttendanceController
        """.trimIndent()

        val result = parser.parse(source, "AttendanceController.kt")
        assertTrue(result.annotations.contains("@RestController"), "Should contain @RestController, got: ${result.annotations}")
        assertTrue(result.annotations.contains("@Tag"), "Should contain @Tag, got: ${result.annotations}")
        assertTrue(result.annotations.contains("@RequestMapping"), "Should contain @RequestMapping, got: ${result.annotations}")
    }

    @Test
    fun `parses annotations from file with CRLF line endings`() {
        // Simulates Windows line endings (CRLF) which is common in Windows development
        val source = "package com.example\r\n\r\n@Tag(name = \"test\")\r\n@RestController\r\n@RequestMapping(\"/api\")\r\nclass TestController\r\n"

        val result = parser.parse(source, "TestController.kt")
        assertTrue(result.annotations.contains("@RestController"), "Should contain @RestController with CRLF, got: ${result.annotations}")
        assertTrue(result.annotations.contains("@Tag"), "Should contain @Tag with CRLF, got: ${result.annotations}")
    }

    @Test
    fun `parses annotations with non-ASCII characters in annotation params`() {
        // Korean characters in annotation parameter values
        val source = """
            package com.lms.interfaces.web.controller

            @Tag(name = "출퇴근 관리", description = "출근, 퇴근, 출퇴근 기록 조회 및 수정 API")
            @RestController
            class KoreanController
        """.trimIndent()

        val result = parser.parse(source, "KoreanController.kt")
        assertTrue(result.annotations.contains("@RestController"), "Should contain @RestController, got: ${result.annotations}")
        assertTrue(result.annotations.contains("@Tag"), "Should contain @Tag, got: ${result.annotations}")
    }
}
