// src/styles/theme.ts
import type { ChangeStatus, DddLayer, DddComponentType } from "../types/spec-metadata";

/** ChangeStatus → 시각 스타일 */
export const STATUS_COLORS: Record<ChangeStatus, { border: string; bg: string; text: string; badge: string }> = {
  existing:   { border: "#6b7280", bg: "#374151", text: "#9ca3af", badge: "#4b5563" },
  new:        { border: "#22c55e", bg: "#064e3b", text: "#4ade80", badge: "#15803d" },
  modified:   { border: "#f59e0b", bg: "#78350f", text: "#fbbf24", badge: "#b45309" },
  affected:   { border: "#ef4444", bg: "#7f1d1d", text: "#f87171", badge: "#b91c1c" },
  deprecated: { border: "#6b7280", bg: "#1f2937", text: "#6b7280", badge: "#374151" },
};

/** DddLayer → 레이어 색상 */
export const LAYER_COLORS: Record<DddLayer, { accent: string; bg: string }> = {
  presentation:   { accent: "#818cf8", bg: "rgba(99,102,241,0.08)" },
  application:    { accent: "#4ade80", bg: "rgba(34,197,94,0.06)" },
  domain:         { accent: "#fbbf24", bg: "rgba(251,191,36,0.06)" },
  infrastructure: { accent: "#fb7185", bg: "rgba(244,63,94,0.06)" },
};

/** DddComponentType → 표시 라벨 */
export const TYPE_LABELS: Record<DddComponentType, string> = {
  controller: "controller",
  usecase: "usecase",
  command: "command",
  query: "query",
  aggregate: "aggregate",
  entity: "entity",
  value_object: "value object",
  domain_service: "domain service",
  domain_event: "event",
  repository: "repository",
  adapter: "adapter",
  policy: "policy",
};

/** 레이어 순서 (dagre rank) */
export const LAYER_ORDER: Record<DddLayer, number> = {
  presentation: 0,
  application: 1,
  domain: 2,
  infrastructure: 3,
};

/** 노드 크기 계산 */
export function estimateNodeSize(label: string, subtitle?: string): { width: number; height: number } {
  const width = Math.max(160, label.length * 9 + 40);
  const height = subtitle ? 76 : 60;
  return { width, height };
}
