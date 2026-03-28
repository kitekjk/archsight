import { describe, it, expect } from "vitest";
import { computeLayout } from "../hooks/useGraphLayout";
import { resolveGraph } from "../core/resolve-graph";
import { orderBoundedContext } from "../examples/order-bc-graph";
import { cancelOrderChangeSet } from "../examples/cancel-order-changeset";

describe("computeLayout", () => {
  it("base graph만 넘기면 모든 노드가 existing이고 위치가 할당된다", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { nodes, edges, layerBounds } = computeLayout(resolved);

    expect(nodes).toHaveLength(resolved.nodes.length);
    for (const node of nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeGreaterThanOrEqual(0);
    }
    expect(edges).toHaveLength(resolved.edges.length);
    expect(Object.keys(layerBounds)).toHaveLength(4);
  });

  it("presentation 레이어 노드가 domain 레이어 노드보다 위에 있다 (y값이 작다)", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { nodes } = computeLayout(resolved);

    const ctrlNode = nodes.find((n) => n.id === "order-ctrl");
    const aggNode = nodes.find((n) => n.id === "order-agg");

    expect(ctrlNode).toBeDefined();
    expect(aggNode).toBeDefined();
    expect(ctrlNode!.position.y).toBeLessThan(aggNode!.position.y);
  });

  it("ChangeSet 적용 시 새 노드가 포함된다", () => {
    const resolved = resolveGraph(orderBoundedContext, cancelOrderChangeSet);
    const { nodes } = computeLayout(resolved);

    const cancelUc = nodes.find((n) => n.id === "cancel-order-uc");
    expect(cancelUc).toBeDefined();
    expect(cancelUc!.data.status).toBe("new");
  });

  it("layerBounds의 y 순서가 presentation < application < domain < infrastructure", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { layerBounds } = computeLayout(resolved);

    expect(layerBounds.presentation.minY).toBeLessThan(layerBounds.application.minY);
    expect(layerBounds.application.minY).toBeLessThan(layerBounds.domain.minY);
    expect(layerBounds.domain.minY).toBeLessThan(layerBounds.infrastructure.minY);
  });
});
