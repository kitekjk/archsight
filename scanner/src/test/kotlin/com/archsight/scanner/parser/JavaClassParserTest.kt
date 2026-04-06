package com.archsight.scanner.parser

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class JavaClassParserTest {

    private val parser = JavaClassParser()

    @Test
    fun `parses RestController with annotations, constructor params, and methods`() {
        val source = """
            package com.example.order;

            import org.springframework.web.bind.annotation.RestController;
            import org.springframework.web.bind.annotation.RequestMapping;
            import org.springframework.web.bind.annotation.PostMapping;

            @RestController
            @RequestMapping("/orders")
            public class OrderController {

                private final OrderService orderService;
                private final OrderQueryService orderQueryService;

                public OrderController(OrderService orderService, OrderQueryService orderQueryService) {
                    this.orderService = orderService;
                    this.orderQueryService = orderQueryService;
                }

                @PostMapping
                public OrderResponse createOrder(CreateOrderRequest request) {
                    return orderService.create(request);
                }

                public OrderResponse getOrder(String orderId) {
                    return orderQueryService.findById(orderId);
                }
            }
        """.trimIndent()

        val result = parser.parse(source, "OrderController.java")

        assertEquals("com.example.order", result.packageName)
        assertEquals("OrderController", result.className)
        assertTrue(result.annotations.contains("@RestController"), "should contain @RestController")
        assertTrue(result.annotations.contains("@RequestMapping"), "should contain @RequestMapping")
        assertEquals(2, result.constructorParams.size)
        assertEquals("orderService", result.constructorParams[0].name)
        assertEquals("OrderService", result.constructorParams[0].typeName)
        assertEquals("orderQueryService", result.constructorParams[1].name)
        assertTrue(result.methods.any { it.contains("createOrder") })
        assertTrue(result.methods.any { it.contains("getOrder") })
        assertFalse(result.isAnnotationClass)
    }

    @Test
    fun `parses Entity with JPA annotations`() {
        val source = """
            package com.example.order.domain;

            import javax.persistence.Entity;
            import javax.persistence.Table;
            import javax.persistence.Id;
            import javax.persistence.GeneratedValue;

            @Entity
            @Table(name = "orders")
            public class Order {

                @Id
                @GeneratedValue
                private Long id;

                private String status;

                public Long getId() { return id; }
                public String getStatus() { return status; }
                public void changeStatus(String newStatus) { this.status = newStatus; }
            }
        """.trimIndent()

        val result = parser.parse(source, "Order.java")

        assertEquals("com.example.order.domain", result.packageName)
        assertEquals("Order", result.className)
        assertTrue(result.annotations.contains("@Entity"), "should contain @Entity")
        assertTrue(result.annotations.contains("@Table"), "should contain @Table")
        assertTrue(result.methods.any { it.contains("getId") })
        assertTrue(result.methods.any { it.contains("getStatus") })
        assertTrue(result.methods.any { it.contains("changeStatus") })
    }

    @Test
    fun `parses interface with methods`() {
        val source = """
            package com.example.order.domain;

            public interface OrderRepository {
                Order findById(String id);
                void save(Order order);
                void delete(String id);
            }
        """.trimIndent()

        val result = parser.parse(source, "OrderRepository.java")

        assertEquals("com.example.order.domain", result.packageName)
        assertEquals("OrderRepository", result.className)
        assertTrue(result.methods.any { it.contains("findById") })
        assertTrue(result.methods.any { it.contains("save") })
        assertTrue(result.methods.any { it.contains("delete") })
        assertFalse(result.isAnnotationClass)
    }

    @Test
    fun `parses annotation declaration as isAnnotationClass true`() {
        val source = """
            package com.example.annotation;

            import java.lang.annotation.ElementType;
            import java.lang.annotation.Target;
            import org.springframework.stereotype.Service;

            @Target(ElementType.TYPE)
            @Service
            public @interface UseCase {
            }
        """.trimIndent()

        val result = parser.parse(source, "UseCase.java")

        assertEquals("com.example.annotation", result.packageName)
        assertEquals("UseCase", result.className)
        assertTrue(result.isAnnotationClass, "should be annotation class")
        assertTrue(result.annotations.contains("@Target"), "should contain @Target")
        assertTrue(result.annotations.contains("@Service"), "should contain @Service")
    }

    @Test
    fun `extracts superTypes from implements and extends`() {
        val source = """
            package com.example.order;

            public class OrderServiceImpl extends AbstractService implements OrderService, Auditable {
                public OrderServiceImpl() {}

                public void process() {}
            }
        """.trimIndent()

        val result = parser.parse(source, "OrderServiceImpl.java")

        assertEquals("OrderServiceImpl", result.className)
        assertTrue(result.superTypes.contains("AbstractService"), "should contain AbstractService")
        assertTrue(result.superTypes.contains("OrderService"), "should contain OrderService")
        assertTrue(result.superTypes.contains("Auditable"), "should contain Auditable")
    }
}
