// src/__tests__/interactions.test.ts
import { describe, it, expect } from "vitest";
import { resolveGraph, analyzeImpact } from "../core/resolve-graph";
import { computeLayout } from "../hooks/useGraphLayout";
import { orderBoundedContext } from "../examples/order-bc-graph";
import { cancelOrderChangeSet } from "../examples/cancel-order-changeset";

describe("interaction: impact analysis with layout", () => {
  it("order-ctrl 선택 시 연결된 노드가 impactedNodeIds에 포함된다", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const impact = analyzeImpact(resolved, "order-ctrl");

    expect(impact.impactedNodeIds.has("order-ctrl")).toBe(true);
    expect(impact.impactedNodeIds.has("create-order-uc")).toBe(true);
    expect(impact.impactedNodeIds.has("get-order-uc")).toBe(true);
  });

  it("ChangeSet 적용 후 cancel-order-uc 선택 시 영향 범위가 올바르다", () => {
    const resolved = resolveGraph(orderBoundedContext, cancelOrderChangeSet);
    const impact = analyzeImpact(resolved, "cancel-order-uc");

    expect(impact.impactedNodeIds.has("cancel-order-uc")).toBe(true);
    expect(impact.impactedNodeIds.has("order-agg")).toBe(true);
    expect(impact.impactedNodeIds.has("order-repo")).toBe(true);
  });

  it("layout 결과의 노드에 인터랙션 데이터를 주입할 수 있다", () => {
    const resolved = resolveGraph(orderBoundedContext);
    const { nodes } = computeLayout(resolved);
    const impact = analyzeImpact(resolved, "order-ctrl", "downstream");

    const enriched = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isSelected: node.id === "order-ctrl",
        isImpacted: impact.impactedNodeIds.has(node.id),
        isDimmed: node.id !== "order-ctrl" && !impact.impactedNodeIds.has(node.id),
      },
    }));

    const selected = enriched.find((n) => n.id === "order-ctrl");
    expect(selected?.data.isSelected).toBe(true);
    expect(selected?.data.isDimmed).toBe(false);

    const impacted = enriched.find((n) => n.id === "create-order-uc");
    expect(impacted?.data.isImpacted).toBe(true);
    expect(impacted?.data.isDimmed).toBe(false);

    const dimmed = enriched.find((n) => n.id === "inventory-adapter");
    expect(dimmed?.data.isDimmed).toBe(true);
  });
});
