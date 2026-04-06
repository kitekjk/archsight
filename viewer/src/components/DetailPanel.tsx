// src/components/DetailPanel.tsx
import { memo } from "react";
import type { ResolvedNode } from "../types/spec-metadata";
import { STATUS_COLORS, LAYER_COLORS, TYPE_LABELS } from "../styles/theme";

interface DetailPanelProps {
  node: ResolvedNode;
  onClose: () => void;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 9,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          fontWeight: 700,
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: "1px solid #334155",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailPanelInner({ node, onClose }: DetailPanelProps) {
  const statusColor = STATUS_COLORS[node.status];
  const layerColor = LAYER_COLORS[node.layer];
  const typeLabel = TYPE_LABELS[node.type];
  const isDeprecated = node.status === "deprecated";
  const isNew = node.status === "new";

  return (
    <div
      style={{
        width: 340,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "#1e293b",
        borderLeft: "1px solid #334155",
        fontFamily: "'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "12px 16px",
          borderBottom: "1px solid #334155",
          background: "rgba(15,23,42,0.6)",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              color: layerColor.accent,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {typeLabel}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: isDeprecated ? "#6b7280" : "#e2e8f0",
              textDecoration: isDeprecated ? "line-through" : "none",
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {node.label}
          </div>
          {node.subtitle && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{node.subtitle}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {node.status !== "existing" && (
            <span
              style={{
                fontSize: 9,
                background: statusColor.badge,
                color: statusColor.text,
                padding: "2px 7px",
                borderRadius: 3,
                fontWeight: 700,
                border: isNew ? `1px dashed ${statusColor.border}` : "none",
              }}
            >
              {node.status}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "0 2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Description */}
        {node.description && (
          <Section title="Description">
            <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{node.description}</div>
          </Section>
        )}

        {/* Operations */}
        {node.operations && node.operations.length > 0 && (
          <Section title="Operations">
            {node.operations.map((op, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: "#cbd5e1",
                  fontFamily: "monospace",
                  lineHeight: 1.7,
                  padding: "1px 0",
                }}
              >
                {op}
              </div>
            ))}
          </Section>
        )}

        {/* Changes */}
        {node.changes.length > 0 && (
          <Section title="Changes">
            {node.changes.map((ch, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: statusColor.text,
                  lineHeight: 1.6,
                  paddingLeft: 4,
                }}
              >
                • {ch}
              </div>
            ))}
          </Section>
        )}

        {/* Modified Members */}
        {node.modifiedMembers && (
          <Section title="Modified Members">
            {node.modifiedMembers.added && node.modifiedMembers.added.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#4ade80",
                    textTransform: "uppercase",
                    marginBottom: 3,
                    fontWeight: 700,
                  }}
                >
                  Added
                </div>
                {node.modifiedMembers.added.map((m, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 11, color: "#4ade80", fontFamily: "monospace", lineHeight: 1.7 }}
                  >
                    + {m}
                  </div>
                ))}
              </div>
            )}
            {node.modifiedMembers.changed && node.modifiedMembers.changed.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#fbbf24",
                    textTransform: "uppercase",
                    marginBottom: 3,
                    fontWeight: 700,
                  }}
                >
                  Changed
                </div>
                {node.modifiedMembers.changed.map((m, i) => (
                  <div
                    key={i}
                    style={{ fontSize: 11, color: "#fbbf24", fontFamily: "monospace", lineHeight: 1.7 }}
                  >
                    ~ {m}
                  </div>
                ))}
              </div>
            )}
            {node.modifiedMembers.removed && node.modifiedMembers.removed.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#f87171",
                    textTransform: "uppercase",
                    marginBottom: 3,
                    fontWeight: 700,
                  }}
                >
                  Removed
                </div>
                {node.modifiedMembers.removed.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: "#f87171",
                      fontFamily: "monospace",
                      lineHeight: 1.7,
                      textDecoration: "line-through",
                    }}
                  >
                    - {m}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Review Points */}
        {node.reviewPoints.length > 0 && (
          <Section title="Review Points">
            {node.reviewPoints.map((rp, i) => {
              const severity = rp.severity ?? "info";
              const severityColor =
                severity === "critical"
                  ? "#f87171"
                  : severity === "warning"
                  ? "#fbbf24"
                  : "#94a3b8";
              return (
                <div
                  key={i}
                  style={{
                    marginBottom: 8,
                    padding: "7px 10px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 4,
                    borderLeft: `2px solid ${severityColor}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: severityColor,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      marginBottom: 3,
                    }}
                  >
                    {severity}
                    {rp.automatable && (
                      <span style={{ marginLeft: 6, color: "#4ade80" }}>auto-checkable</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{rp.message}</div>
                  {rp.ruleRef && (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, fontFamily: "monospace" }}>
                      rule: {rp.ruleRef}
                    </div>
                  )}
                </div>
              );
            })}
          </Section>
        )}

        {/* Code Mapping */}
        {node.codeMapping && (
          <Section title="Code Mapping">
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "8px 10px" }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  File
                </span>
                <div
                  style={{
                    fontSize: 11,
                    color: "#818cf8",
                    fontFamily: "monospace",
                    marginTop: 2,
                    wordBreak: "break-all",
                  }}
                >
                  {node.codeMapping.filePath}
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Class
                </span>
                <div style={{ fontSize: 11, color: "#cbd5e1", fontFamily: "monospace", marginTop: 2 }}>
                  {node.codeMapping.className}
                </div>
              </div>
              {node.codeMapping.packageName && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Package
                  </span>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      fontFamily: "monospace",
                      marginTop: 2,
                      wordBreak: "break-all",
                    }}
                  >
                    {node.codeMapping.packageName}
                  </div>
                </div>
              )}
              {node.codeMapping.annotations && node.codeMapping.annotations.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Annotations
                  </span>
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {node.codeMapping.annotations.map((ann, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10,
                          color: "#fbbf24",
                          fontFamily: "monospace",
                          background: "rgba(251,191,36,0.1)",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        {ann}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {node.codeMapping.lineRange && (
                <div>
                  <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Lines
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", marginLeft: 6 }}>
                    {node.codeMapping.lineRange[0]}–{node.codeMapping.lineRange[1]}
                  </span>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

export const DetailPanel = memo(DetailPanelInner);
