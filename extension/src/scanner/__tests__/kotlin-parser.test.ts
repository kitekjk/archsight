import { describe, it, expect } from "vitest";
import { parseKotlinSource } from "../kotlin-parser.js";

describe("parseKotlinSource", () => {
  it("parses data class with private constructor and companion factory", () => {
    const source = `
package com.example.order.domain

data class OrderId private constructor(val value: String) {
  companion object {
    fun of(value: String): OrderId = OrderId(value)
    fun create(raw: String): OrderId = OrderId(raw.trim())
  }
}
`;
    const result = parseKotlinSource(source, "src/main/kotlin/OrderId.kt");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderId");
    expect(result!.packageName).toBe("com.example.order.domain");
    expect(result!.language).toBe("kotlin");
    expect(result!.isDataClass).toBe(true);
    expect(result!.hasPrivateConstructor).toBe(true);
    expect(result!.hasCompanionFactory).toBe(true);
    expect(result!.isEnum).toBe(false);
    expect(result!.isInterface).toBe(false);
  });

  it("parses @Service with primary constructor injection", () => {
    const source = `
package com.example.order.application

import org.springframework.stereotype.Service

@Service
class CreateOrderService(
  private val orderRepository: OrderRepository,
  private val eventPublisher: EventPublisher
) {
  fun execute(command: CreateOrderCommand): OrderId {
    val order = Order.create(command)
    orderRepository.save(order)
    eventPublisher.publish(OrderCreatedEvent(order.id))
    return order.id
  }
}
`;
    const result = parseKotlinSource(source, "src/main/kotlin/CreateOrderService.kt");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("CreateOrderService");
    expect(result!.annotations).toContain("@Service");
    expect(result!.constructorParams).toHaveLength(2);
    expect(result!.constructorParams[0]!.name).toBe("orderRepository");
    expect(result!.constructorParams[0]!.typeName).toBe("OrderRepository");
    expect(result!.constructorParams[1]!.name).toBe("eventPublisher");
    expect(result!.publicMethods.some(m => m.startsWith("execute"))).toBe(true);
    expect(result!.hasPrivateConstructor).toBe(false);
    expect(result!.isDataClass).toBe(false);
  });

  it("parses annotation class", () => {
    const source = `
package com.example.shared

annotation class DomainEvent(
  val aggregateType: String = ""
)
`;
    const result = parseKotlinSource(source, "src/main/kotlin/DomainEvent.kt");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("DomainEvent");
    expect(result!.isAnnotationClass).toBe(true);
    expect(result!.isInterface).toBe(false);
    expect(result!.isEnum).toBe(false);
  });

  it("parses @JvmInline value class", () => {
    const source = `
package com.example.order.domain

import kotlin.jvm.JvmInline

@JvmInline
value class Money(val amount: Long) {
  fun add(other: Money): Money = Money(amount + other.amount)
}
`;
    const result = parseKotlinSource(source, "src/main/kotlin/Money.kt");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("Money");
    expect(result!.isValueClass).toBe(true);
    expect(result!.annotations).toContain("@JvmInline");
    expect(result!.constructorParams).toHaveLength(1);
    expect(result!.constructorParams[0]!.name).toBe("amount");
    expect(result!.constructorParams[0]!.typeName).toBe("Long");
  });

  it("parses interface", () => {
    const source = `
package com.example.order.domain

interface OrderRepository {
  fun findById(id: OrderId): Order?
  fun save(order: Order)
  fun findAll(): List<Order>
}
`;
    const result = parseKotlinSource(source, "src/main/kotlin/OrderRepository.kt");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderRepository");
    expect(result!.isInterface).toBe(true);
    expect(result!.isEnum).toBe(false);
    expect(result!.publicMethods.some(m => m.startsWith("findById"))).toBe(true);
    expect(result!.constructorParams).toHaveLength(0);
  });

  it("parses enum class", () => {
    const source = `
package com.example.order.domain

enum class OrderStatus {
  PENDING,
  CONFIRMED,
  SHIPPED,
  CANCELLED;

  fun isFinal(): Boolean = this == CANCELLED
}
`;
    const result = parseKotlinSource(source, "src/main/kotlin/OrderStatus.kt");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderStatus");
    expect(result!.isEnum).toBe(true);
    expect(result!.isInterface).toBe(false);
    expect(result!.isDataClass).toBe(false);
  });

  it("returns null for source with no class declaration", () => {
    const source = `package com.example\n\nval CONSTANT = 42`;
    const result = parseKotlinSource(source, "src/main/kotlin/Constants.kt");
    expect(result).toBeNull();
  });

  it("parses abstract class with supertype", () => {
    const source = `
package com.example.shared

abstract class BaseAggregateRoot : DomainEventPublisher {
  private val events = mutableListOf<DomainEvent>()

  fun registerEvent(event: DomainEvent) {
    events.add(event)
  }
}
`;
    const result = parseKotlinSource(source, "src/main/kotlin/BaseAggregateRoot.kt");
    expect(result).not.toBeNull();
    expect(result!.isAbstract).toBe(true);
    expect(result!.superTypes).toContain("DomainEventPublisher");
  });
});
