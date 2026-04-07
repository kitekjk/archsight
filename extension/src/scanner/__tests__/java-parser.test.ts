import { describe, it, expect } from "vitest";
import { parseJavaSource } from "../java-parser.js";

describe("parseJavaSource", () => {
  it("parses @RestController with annotations, constructor injection, and methods", () => {
    const source = `
package com.example.order.presentation;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequestMapping("/orders")
public class OrderController {

  private final CreateOrderUseCase createOrderUseCase;

  public OrderController(CreateOrderUseCase createOrderUseCase) {
    this.createOrderUseCase = createOrderUseCase;
  }

  public OrderResponse createOrder(CreateOrderRequest request) {
    return createOrderUseCase.execute(request);
  }

  public OrderResponse getOrder(String orderId) {
    return createOrderUseCase.getById(orderId);
  }
}
`;
    const result = parseJavaSource(source, "src/main/java/com/example/order/presentation/OrderController.java");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderController");
    expect(result!.packageName).toBe("com.example.order.presentation");
    expect(result!.language).toBe("java");
    expect(result!.annotations).toContain("@RestController");
    expect(result!.annotations).toContain("@RequestMapping");
    expect(result!.constructorParams).toHaveLength(1);
    expect(result!.constructorParams[0]!.typeName).toBe("CreateOrderUseCase");
    expect(result!.constructorParams[0]!.name).toBe("createOrderUseCase");
    expect(result!.publicMethods.length).toBeGreaterThanOrEqual(1);
    expect(result!.isInterface).toBe(false);
    expect(result!.isEnum).toBe(false);
    expect(result!.isAbstract).toBe(false);
    expect(result!.hasPrivateConstructor).toBe(false);
  });

  it("parses @Entity class", () => {
    const source = `
package com.example.order.infrastructure;

import javax.persistence.Entity;
import javax.persistence.Id;

@Entity
public class OrderEntity {
  @Id
  private String id;
  private String status;

  public OrderEntity() {}

  public String getId() { return id; }
  public String getStatus() { return status; }
}
`;
    const result = parseJavaSource(source, "src/main/java/OrderEntity.java");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderEntity");
    expect(result!.annotations).toContain("@Entity");
    expect(result!.isInterface).toBe(false);
    expect(result!.publicMethods.some(m => m.startsWith("getId"))).toBe(true);
  });

  it("parses interface", () => {
    const source = `
package com.example.order.domain;

public interface OrderRepository {
  Order findById(String id);
  void save(Order order);
}
`;
    const result = parseJavaSource(source, "src/main/java/OrderRepository.java");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderRepository");
    expect(result!.isInterface).toBe(true);
    expect(result!.isEnum).toBe(false);
    expect(result!.publicMethods.some(m => m.startsWith("findById"))).toBe(true);
  });

  it("parses enum", () => {
    const source = `
package com.example.order.domain;

public enum OrderStatus {
  PENDING,
  CONFIRMED,
  CANCELLED;

  public boolean isFinal() {
    return this == CANCELLED;
  }
}
`;
    const result = parseJavaSource(source, "src/main/java/OrderStatus.java");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("OrderStatus");
    expect(result!.isEnum).toBe(true);
    expect(result!.isInterface).toBe(false);
  });

  it("parses @interface (annotation declaration)", () => {
    const source = `
package com.example.order.domain;

import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
public @interface DomainService {
  String value() default "";
}
`;
    const result = parseJavaSource(source, "src/main/java/DomainService.java");
    expect(result).not.toBeNull();
    expect(result!.className).toBe("DomainService");
    expect(result!.isAnnotationClass).toBe(true);
    expect(result!.isInterface).toBe(false);
    expect(result!.isEnum).toBe(false);
  });

  it("detects abstract class", () => {
    const source = `
package com.example.shared;

public abstract class BaseEntity {
  protected String id;
  public abstract void validate();
}
`;
    const result = parseJavaSource(source, "src/main/java/BaseEntity.java");
    expect(result).not.toBeNull();
    expect(result!.isAbstract).toBe(true);
    expect(result!.className).toBe("BaseEntity");
  });

  it("parses implements and extends", () => {
    const source = `
package com.example.order.infrastructure;

public class OrderRepositoryImpl extends AbstractRepository implements OrderRepository, Auditable {
  public OrderRepositoryImpl(DataSource dataSource) {}
  public Order findById(String id) { return null; }
}
`;
    const result = parseJavaSource(source, "src/main/java/OrderRepositoryImpl.java");
    expect(result).not.toBeNull();
    expect(result!.superTypes).toContain("AbstractRepository");
    expect(result!.superTypes).toContain("OrderRepository");
    expect(result!.superTypes).toContain("Auditable");
  });

  it("returns null for source with no class declaration", () => {
    const source = `package com.example;`;
    const result = parseJavaSource(source, "src/main/java/Empty.java");
    expect(result).toBeNull();
  });
});
