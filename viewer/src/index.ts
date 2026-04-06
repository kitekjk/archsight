// Types
export type {
  DddLayer,
  DddComponentType,
  ChangeStatus,
  EdgeType,
  ReviewSeverity,
  ReviewPoint,
  CodeMapping,
  ComponentNode,
  DependencyEdge,
  BoundedContextGraph,
  LayerConfig,
  NodeChange,
  EdgeChange,
  ChangeSet,
  ResolvedNode,
  ResolvedEdge,
  ResolvedGraph,
} from "./types/spec-metadata";

// Core functions
export { resolveGraph, analyzeImpact } from "./core/resolve-graph";

// Examples
export { orderBoundedContext } from "./examples/order-bc-graph";
export { cancelOrderChangeSet } from "./examples/cancel-order-changeset";
export { lmsBoundedContext } from "./examples/lms-bc-graph";
export { scmhubBoundedContext } from "./examples/scmhub-bc-graph";
