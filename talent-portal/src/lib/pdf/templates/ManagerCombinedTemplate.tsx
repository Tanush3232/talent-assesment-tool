"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MANAGER COMBINED PDF TEMPLATE
// Creates one professional document containing:
//   Cover Page → Manager Summary → [Employee Section × N]
// Used for the Manager Portals "Download Combined PDF" action.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { SUB_DIMENSIONS, RATING_SHORT_LABELS } from "@/lib/constants";
import type { ExportEmployee, ExportManager } from "@/types/export-report";

const C = {
  NAVY:         "#0F172A",
  BLUE:         "#1E3A8A",
  BLUE_MED:     "#2563EB",
  BLUE_LIGHT:   "#EFF6FF",
  BLUE_BORDER:  "#BFDBFE",
  SLATE_700:    "#334155",
  SLATE_600:    "#475569",
  SLATE_500:    "#64748B",
  SLATE_400:    "#94A3B8",
  SLATE_300:    "#CBD5E1",
  SLATE_200:    "#E2E8F0",
  SLATE_100:    "#F1F5F9",
  SLATE_50:     "#F8FAFC",
  EMERALD:      "#059669",
  EMERALD_DARK: "#047857",
  EMERALD_LIGHT:"#D1FAE5",
  AMBER:        "#D97706",
  AMBER_LIGHT:  "#FEF3C7",
  ROSE:         "#E11D48",
  ROSE_LIGHT:   "#FFE4E6",
  WHITE:        "#FFFFFF",
} as const;

const PAGE_H_PAD = 40;

function classColors(category: string) {
  if (category.includes("High Potential")) return { bg: "#EFF6FF", text: "#1E3A8A", border: "#BFDBFE" };
  if (category.includes("Promotable"))    return { bg: "#D1FAE5", text: "#047857", border: "#A7F3D0" };
  return                                         { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" };
}

function scoreBg(score: number): { bg: string; text: string } {
  if (score >= 4) return { bg: "#1E3A8A", text: "#FFFFFF" };
  if (score === 3) return { bg: "#D1FAE5", text: "#047857" };
  if (score === 2) return { bg: "#FEF3C7", text: "#D97706" };
  return { bg: "#FFE4E6", text: "#E11D48" };
}

function truncate(text: string, max = 180): string {
  if (!text || text.length <= max) return text || "—";
  return text.slice(0, max) + "…";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.WHITE,
    paddingHorizontal: PAGE_H_PAD,
    paddingTop: 48,
    paddingBottom: 52,
    fontSize: 9,
    color: C.NAVY,
  },
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: C.WHITE,
    padding: 0,
    fontSize: 9,
    color: C.NAVY,
  },
  fixedHeader: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 36,
    backgroundColor: C.NAVY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_H_PAD,
  },
  fixedHeaderLeft:  { color: C.WHITE,    fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.2 },
  fixedHeaderRight: { color: "#94A3B8",  fontSize: 7 },
  fixedFooter: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 32,
    backgroundColor: C.SLATE_50,
    borderTopWidth: 1,
    borderTopColor: C.SLATE_200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_H_PAD,
  },
  fixedFooterLeft:  { color: C.SLATE_500, fontSize: 7 },
  fixedFooterRight: { color: C.SLATE_500, fontSize: 7 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: C.BLUE,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: C.BLUE,
  },
  infoLabel: {
    fontSize: 7, color: C.SLATE_400, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  infoValue: { fontSize: 9, color: C.NAVY, fontFamily: "Helvetica-Bold" },
  infoValueLight: { fontSize: 9, color: C.SLATE_600 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ManagerCoverPage({
  manager,
  employees,
}: {
  manager: ExportManager;
  employees: ExportEmployee[];
}) {
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const entity = employees[0]?.entity || manager.department || "Adventz Group";

  return (
    <Page size="A4" style={styles.coverPage}>
      {/* Top band */}
      <View style={{ backgroundColor: C.NAVY, paddingHorizontal: PAGE_H_PAD, paddingTop: 50, paddingBottom: 44 }}>
        <View style={{
          alignSelf: "flex-start", backgroundColor: C.BLUE,
          borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 20,
        }}>
          <Text style={{ color: C.WHITE, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
            MANAGER PORTAL REPORT  ·  STRICTLY CONFIDENTIAL
          </Text>
        </View>
        <Text style={{ color: C.WHITE, fontSize: 26, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 8 }}>
          Manager Appraisal{"\n"}Portal
        </Text>
        <Text style={{ color: "#93C5FD", fontSize: 11, letterSpacing: 0.5 }}>
          Direct Reports — Performance Evaluation Cycle
        </Text>
      </View>

      <View style={{ height: 5, backgroundColor: C.BLUE }} />

      {/* Manager identity */}
      <View style={{ paddingHorizontal: PAGE_H_PAD, paddingTop: 36, flex: 1 }}>
        {/* Manager avatar */}
        <View style={{
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: C.NAVY, alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: C.WHITE }}>
            {getInitials(manager.name)}
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: C.NAVY, marginBottom: 4 }}>
          {manager.name}
        </Text>
        <Text style={{ fontSize: 12, color: C.SLATE_600, marginBottom: 22 }}>
          {manager.designation || "Manager"}
          {manager.department ? `  ·  ${manager.department}` : ""}
        </Text>

        <View style={{ borderBottomWidth: 1, borderBottomColor: C.SLATE_200, marginBottom: 20 }} />

        {/* Stats */}
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          <View style={{
            flex: 1, backgroundColor: C.BLUE_LIGHT, borderRadius: 6,
            borderWidth: 1, borderColor: C.BLUE_BORDER, padding: 14, marginRight: 10,
            alignItems: "center",
          }}>
            <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: C.BLUE }}>{employees.length}</Text>
            <Text style={{ fontSize: 8, color: C.BLUE, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>
              DIRECT REPORTS INCLUDED
            </Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: C.SLATE_50, borderRadius: 6,
            borderWidth: 1, borderColor: C.SLATE_200, padding: 14,
            alignItems: "center",
          }}>
            <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: C.NAVY }}>
              {employees.filter(e => e.assessment.computedResult.classificationCategory.includes("High Potential")).length}
            </Text>
            <Text style={{ fontSize: 8, color: C.SLATE_500, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>
              HIGH POTENTIAL IDENTIFIED
            </Text>
          </View>
        </View>

        {/* Table of contents */}
        <Text style={{ ...styles.infoLabel, marginBottom: 10 }}>Table of Contents — Direct Reports</Text>
        {employees.map((emp, idx) => {
          const cls = classColors(emp.assessment.computedResult.classificationCategory);
          return (
            <View key={emp.id} style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 7,
              borderBottomWidth: 1,
              borderBottomColor: C.SLATE_100,
            }}>
              <Text style={{ fontSize: 8, color: C.SLATE_400, width: 22 }}>{idx + 1}.</Text>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.NAVY, flex: 1 }}>{emp.name}</Text>
              <Text style={{ fontSize: 8, color: C.SLATE_500, width: 130 }}>{emp.designation}</Text>
              <View style={{
                backgroundColor: cls.bg, borderWidth: 1, borderColor: cls.border,
                borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: cls.text }}>
                  {emp.assessment.computedResult.classificationCategory.split("(")[0].trim()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={{
        backgroundColor: C.SLATE_50,
        borderTopWidth: 1,
        borderTopColor: C.SLATE_200,
        paddingHorizontal: PAGE_H_PAD,
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <Text style={{ fontSize: 7, color: C.SLATE_500 }}>
          Generated on {generatedDate}  ·  {entity}  ·  Talent Management Platform
        </Text>
        <Text style={{ fontSize: 7, color: C.SLATE_400, letterSpacing: 0.8 }}>
          STRICTLY CONFIDENTIAL  ·  HR USE ONLY
        </Text>
      </View>
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SECTION (condensed, 1-2 pages per employee)
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeSection({
  employee,
  manager,
}: {
  employee: ExportEmployee;
  manager: ExportManager;
}) {
  const assessment = employee.assessment;
  const { computedResult } = assessment;
  const cls = classColors(computedResult.classificationCategory);

  const sections: Array<{ key: keyof typeof SUB_DIMENSIONS; label: string }> = [
    { key: "ability",    label: "Ability" },
    { key: "aspiration", label: "Aspiration" },
    { key: "leadership", label: "Leadership" },
  ];

  return (
    <Page size="A4" style={styles.page} break>
      {/* Fixed header */}
      <View fixed style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderLeft}>
          Manager Portal  ·  {manager.name}  ·  Direct Reports
        </Text>
        <Text style={styles.fixedHeaderRight}>{employee.name}  ·  {employee.id}</Text>
      </View>

      {/* Fixed footer */}
      <View fixed style={styles.fixedFooter}>
        <Text style={styles.fixedFooterLeft}>
          STRICTLY CONFIDENTIAL  ·  {employee.entity}  ·  HR USE ONLY
        </Text>
        <Text
          style={styles.fixedFooterRight}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>

      {/* Employee header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: C.BLUE,
      }}>
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: C.BLUE_LIGHT, borderWidth: 1, borderColor: C.BLUE_BORDER,
          alignItems: "center", justifyContent: "center", marginRight: 12,
        }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: C.BLUE }}>
            {getInitials(employee.name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: C.NAVY }}>{employee.name}</Text>
          <Text style={{ fontSize: 9, color: C.SLATE_600 }}>{employee.designation}  ·  {employee.department}</Text>
        </View>
        <View>
          <View style={{
            backgroundColor: cls.bg, borderWidth: 1, borderColor: cls.border,
            borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4,
          }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: cls.text }}>
              {computedResult.classificationCategory}
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: C.BLUE, textAlign: "right" }}>
            {computedResult.grandTotal}<Text style={{ fontSize: 9, color: C.SLATE_400 }}> / 48</Text>
          </Text>
        </View>
      </View>

      {/* Score cards row */}
      <View style={{ flexDirection: "row", marginBottom: 14 }}>
        {[
          { label: "Ability",    val: computedResult.abilitySum },
          { label: "Aspiration", val: computedResult.aspirationSum },
          { label: "Leadership", val: computedResult.leadershipSum },
        ].map(({ label, val }, i) => (
          <View key={label} style={{
            flex: 1, backgroundColor: C.SLATE_50,
            borderWidth: 1, borderColor: C.SLATE_200, borderRadius: 5,
            padding: 8, alignItems: "center",
            marginRight: i < 2 ? 8 : 0,
          }}>
            <Text style={{ fontSize: 6.5, color: C.SLATE_500, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 3 }}>
              {label.toUpperCase()}
            </Text>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: C.NAVY }}>{val}</Text>
            <Text style={{ fontSize: 6.5, color: C.SLATE_400 }}>/ 16</Text>
          </View>
        ))}
      </View>

      {/* Competency table (compact) */}
      <View style={styles.sectionTitle}>
        <Text>Competency Scores</Text>
      </View>

      {/* Table header */}
      <View style={{
        flexDirection: "row",
        backgroundColor: C.NAVY,
        paddingVertical: 5, paddingHorizontal: 8,
        marginBottom: 1, borderRadius: 3,
      }}>
        {["#", "Competency", "Score", "Rating"].map((h, i) => (
          <Text key={h} style={{
            fontSize: 6.5, color: C.WHITE, fontFamily: "Helvetica-Bold", letterSpacing: 0.8,
            width: i === 0 ? "6%" : i === 1 ? "34%" : i === 2 ? "10%" : "50%",
          }}>{h.toUpperCase()}</Text>
        ))}
      </View>

      {sections.map(({ key, label }) => {
        const dims = SUB_DIMENSIONS[key];
        const scoresForSection = (assessment.scores[key] || {}) as Record<string, number>;

        return (
          <View key={key}>
            <View style={{ backgroundColor: C.BLUE, paddingVertical: 4, paddingHorizontal: 8, marginTop: 4, marginBottom: 1, borderRadius: 3 }}>
              <Text style={{ color: C.WHITE, fontSize: 7.5, fontFamily: "Helvetica-Bold" }}>{label}</Text>
            </View>
            {dims.map((dim, idx) => {
              const score = scoresForSection[dim.id] ?? 0;
              const sc = scoreBg(score);
              return (
                <View key={dim.id} style={{
                  flexDirection: "row",
                  paddingVertical: 6, paddingHorizontal: 8,
                  backgroundColor: idx % 2 === 0 ? C.SLATE_50 : C.WHITE,
                  borderBottomWidth: 1, borderBottomColor: C.SLATE_100,
                }}>
                  <Text style={{ width: "6%",  fontSize: 8, color: C.SLATE_500 }}>{dim.id}</Text>
                  <Text style={{ width: "34%", fontSize: 8, color: C.NAVY, fontFamily: "Helvetica-Bold" }}>{dim.title}</Text>
                  <View style={{ width: "10%", alignItems: "flex-start" }}>
                    {score > 0 ? (
                      <View style={{ backgroundColor: sc.bg, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: sc.text }}>{score}</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 8, color: C.SLATE_400 }}>—</Text>
                    )}
                  </View>
                  <Text style={{ width: "50%", fontSize: 8, color: C.SLATE_600 }}>
                    {score > 0 ? RATING_SHORT_LABELS[score as 1|2|3|4] : "Not Rated"}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Manager comments */}
      {assessment.managerComments ? (
        <View style={{ marginTop: 14 }}>
          <Text style={{ ...styles.infoLabel, marginBottom: 6 }}>Manager Commentary</Text>
          <View style={{
            backgroundColor: C.SLATE_50, borderWidth: 1, borderColor: C.SLATE_200,
            borderRadius: 5, padding: 10,
          }}>
            <Text style={{ fontSize: 8.5, color: C.SLATE_700, lineHeight: 1.7 }}>
              {truncate(assessment.managerComments, 500)}
            </Text>
          </View>
        </View>
      ) : null}
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function ManagerCombinedTemplate({
  manager,
  employees,
}: {
  manager: ExportManager;
  employees: ExportEmployee[];
}) {
  return (
    <Document
      title={`Manager Portal — ${manager.name} — Direct Reports`}
      author={manager.department || "Adventz Group"}
      subject="Confidential Manager Portal Report"
      creator="Talent Management Platform"
    >
      <ManagerCoverPage manager={manager} employees={employees} />
      {employees.map((emp) => (
        <EmployeeSection key={emp.id} employee={emp} manager={manager} />
      ))}
    </Document>
  );
}
