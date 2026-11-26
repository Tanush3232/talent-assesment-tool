"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MANAGER COMBINED PDF TEMPLATE
// Cover Page (Manager + Direct Reports table) followed by each employee's
// 2-page assessment (reusing EmployeeSummaryPage + EmployeeCompetencyPage).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { COMPANY_NAME, APP_NAME } from "@/lib/constants";
import type { ExportEmployee, ExportManager } from "@/types/export-report";
import {
  EmployeeSummaryPage,
  EmployeeCompetencyPage,
  getLogoSrc,
} from "@/lib/pdf/templates/EmployeeAppraisalTemplate";

const C = {
  NAVY:         "#0F172A",
  BLUE:         "#1E3A8A",
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
  EMERALD_DARK: "#047857",
  EMERALD_LIGHT:"#D1FAE5",
  ROSE:         "#E11D48",
  WHITE:        "#FFFFFF",
} as const;

const PAGE_H_PAD = 40;

function classColors(category: string) {
  if (category.includes("High Potential")) return { bg: C.BLUE_LIGHT, text: C.BLUE, border: C.BLUE_BORDER };
  if (category.includes("Promotable"))    return { bg: C.EMERALD_LIGHT, text: C.EMERALD_DARK, border: "#A7F3D0" };
  return                                         { bg: C.SLATE_100, text: C.SLATE_700, border: C.SLATE_300 };
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: C.WHITE,
    padding: 0,
    fontSize: 9,
    color: C.NAVY,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER COVER PAGE (matches Single PDF Cover + Direct Reports Table)
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
      {/* Top branded band (same as Single PDF: logos + light gray + company/app) */}
      <View style={{ backgroundColor: "#E2E8F0", paddingHorizontal: PAGE_H_PAD, paddingTop: 28, paddingBottom: 32 }}>
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={getLogoSrc("zuari_logo.png")} style={{ height: 28, objectFit: "contain" }} />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={getLogoSrc("poddar_logo.png")} style={{ height: 26, objectFit: "contain" }} />
        </View>

        <View style={{
          alignSelf: "flex-start", backgroundColor: C.ROSE,
          borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 14,
        }}>
          <Text style={{ color: C.WHITE, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
            STRICTLY CONFIDENTIAL
          </Text>
        </View>

        <Text style={{ color: C.NAVY, fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 4 }}>
          {COMPANY_NAME}
        </Text>
        <Text style={{ color: C.BLUE, fontSize: 15, fontFamily: "Helvetica-Bold" }}>
          {APP_NAME}
        </Text>
      </View>

      <View style={{ height: 5, backgroundColor: C.BLUE }} />

      {/* Manager identity & Direct Reports */}
      <View style={{ paddingHorizontal: PAGE_H_PAD, paddingTop: 28, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: C.BLUE_LIGHT, borderWidth: 2, borderColor: C.BLUE_BORDER,
            alignItems: "center", justifyContent: "center", marginRight: 14,
          }}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: C.BLUE }}>
              {getInitials(manager.name)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: C.NAVY, marginBottom: 2 }}>
              {manager.name}
            </Text>
            <Text style={{ fontSize: 10.5, color: C.SLATE_600 }}>
              {manager.designation || "Line Manager"}
              {manager.department ? `  ·  ${manager.department}` : ""}
            </Text>
          </View>
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: C.SLATE_200, marginBottom: 14 }} />

        {/* Direct Reports Table (Name, Designation, Score, Potential Classification) */}
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: C.BLUE, marginBottom: 8, letterSpacing: 0.4 }}>
          Direct Reports
        </Text>

        {/* Table Header */}
        <View style={{
          flexDirection: "row",
          backgroundColor: C.NAVY,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: 3,
          marginBottom: 2,
        }}>
          <Text style={{ width: "30%", fontSize: 7, fontFamily: "Helvetica-Bold", color: C.WHITE, letterSpacing: 0.6 }}>NAME</Text>
          <Text style={{ width: "28%", fontSize: 7, fontFamily: "Helvetica-Bold", color: C.WHITE, letterSpacing: 0.6 }}>DESIGNATION</Text>
          <Text style={{ width: "14%", fontSize: 7, fontFamily: "Helvetica-Bold", color: C.WHITE, letterSpacing: 0.6 }}>SCORE</Text>
          <Text style={{ width: "28%", fontSize: 7, fontFamily: "Helvetica-Bold", color: C.WHITE, letterSpacing: 0.6 }}>POTENTIAL CLASSIFICATION</Text>
        </View>

        {employees.map((emp, idx) => {
          const { computedResult } = emp.assessment;
          const cls = classColors(computedResult.classificationCategory);
          return (
            <View key={emp.id} style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 7,
              paddingHorizontal: 8,
              backgroundColor: idx % 2 === 0 ? C.WHITE : C.SLATE_50,
              borderBottomWidth: 1,
              borderBottomColor: C.SLATE_100,
            }}>
              <Text style={{ width: "30%", fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.NAVY, paddingRight: 6 }}>
                {emp.name}
              </Text>
              <Text style={{ width: "28%", fontSize: 8, color: C.SLATE_600, paddingRight: 6 }}>
                {emp.designation}
              </Text>
              <Text style={{ width: "14%", fontSize: 8.5, fontFamily: "Helvetica-Bold", color: cls.text }}>
                {computedResult.grandTotal} / 48
              </Text>
              <View style={{ width: "28%", alignItems: "flex-start" }}>
                <View style={{
                  backgroundColor: cls.bg, borderWidth: 1, borderColor: cls.border,
                  borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 7.2, fontFamily: "Helvetica-Bold", color: cls.text }}>
                    {computedResult.classificationCategory}
                  </Text>
                </View>
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
          HUMAN RESOURCES  ·  STRICTLY CONFIDENTIAL
        </Text>
      </View>
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
      title={`${COMPANY_NAME} — ${manager.name} — Direct Reports`}
      author={manager.department || "Adventz Group"}
      subject="Confidential Direct Reports Talent Assessment"
      creator="Talent Management Platform"
    >
      <ManagerCoverPage manager={manager} employees={employees} />
      {employees.map((emp) => (
        <React.Fragment key={emp.id}>
          <EmployeeSummaryPage    employee={emp} assessment={emp.assessment} />
          <EmployeeCompetencyPage employee={emp} assessment={emp.assessment} />
        </React.Fragment>
      ))}
    </Document>
  );
}
