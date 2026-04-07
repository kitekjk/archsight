// src/App.tsx
import { useState, useMemo } from "react";
import { resolveGraph } from "./core/resolve-graph";
import { orderBoundedContext } from "./examples/order-bc-graph";
import { cancelOrderChangeSet } from "./examples/cancel-order-changeset";
import { lmsBoundedContext } from "./examples/lms-bc-graph";
import { scmhubBoundedContext } from "./examples/scmhub-bc-graph";
import lmsScanned from "./examples/lms-scanned.json";
import lmsAiAnalyzed from "./examples/lms-ai-analyzed.json";
import { SpecDiagram } from "./components/SpecDiagram";
import type { BoundedContextGraph } from "./types/spec-metadata";

const DATA_OPTIONS = [
  { key: "order", label: "Order BC (base)" },
  { key: "order-cancel", label: "Order BC + Cancel ChangeSet" },
  { key: "lms", label: "LMS BC (수동)" },
  { key: "lms-scanned", label: "LMS BC (스캐너 raw)" },
  { key: "lms-ai", label: "LMS BC (AI 분석)" },
  { key: "scmhub", label: "SCM Hub BC" },
] as const;

type DataKey = (typeof DATA_OPTIONS)[number]["key"];

function buildResolved(key: DataKey) {
  switch (key) {
    case "order":
      return resolveGraph(orderBoundedContext);
    case "order-cancel":
      return resolveGraph(orderBoundedContext, cancelOrderChangeSet);
    case "lms":
      return resolveGraph(lmsBoundedContext);
    case "lms-scanned":
      return resolveGraph(lmsScanned as unknown as BoundedContextGraph);
    case "lms-ai":
      return resolveGraph(lmsAiAnalyzed as unknown as BoundedContextGraph);
    case "scmhub":
      return resolveGraph(scmhubBoundedContext);
  }
}

export default function App() {
  const [selected, setSelected] = useState<DataKey>("order-cancel");
  const resolved = useMemo(() => buildResolved(selected), [selected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 20px", background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>archsight</span>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as DataKey)}
          style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 4, padding: "4px 8px", fontSize: 13 }}
        >
          {DATA_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {resolved.context.name} — {resolved.nodes.length} nodes, {resolved.edges.length} edges
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <SpecDiagram resolved={resolved} />
      </div>
    </div>
  );
}
