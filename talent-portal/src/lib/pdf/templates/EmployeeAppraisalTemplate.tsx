"use client";
// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE APPRAISAL PDF TEMPLATE
// Enterprise-grade talent assessment report for individual employees.
// Designed to match the quality of Workday / SAP SuccessFactors exports.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  Line,
  Circle,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { SUB_DIMENSIONS, RATING_SHORT_LABELS, COMPANY_NAME, PDF_APP_NAME, formatAssessmentCycle, getClassificationTheme } from "@/lib/constants";
import type { ExportEmployee } from "@/types/export-report";

// Prevent mid-word hyphenation (e.g. "Flexibility" splitting as "Flexibili-ty")
Font.registerHyphenationCallback((word) => [word]);

export function getLogoSrc(filename: "zuari_logo.png" | "poddar_logo.png"): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/logos/${filename}`;
  }
  // Node.js fallback: embed as base64 data URI so React-PDF never calls fetch() on a Windows path
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  const buf = fs.readFileSync(path.join(process.cwd(), "public", "logos", filename));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// ── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  NAVY:         "#0F172A",
  NAVY_MID:     "#1E293B",
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

// ── Classification helpers ────────────────────────────────────────────────────
export function classColors(category: string): { bg: string; text: string; border: string; dot: string } {
  return getClassificationTheme(category).pdf;
}

function countLowScoreSubDimensions(scores: ExportEmployee["assessment"]["scores"]): number {
  let count = 0;
  for (const sec of ["ability", "aspiration", "leadership"] as const) {
    const secScores = scores?.[sec];
    if (!secScores) continue;
    for (const val of Object.values(secScores)) {
      if (typeof val === "number" && val >= 1 && val <= 2) count++;
    }
  }
  return count;
}

function HiPoExceptionBadge({ marginLeft = 8 }: { marginLeft?: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FCD34D",
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginLeft,
      }}
    >
      <Svg width={10} height={10} viewBox="0 0 24 24" style={{ marginRight: 4 }}>
        <Path
          d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          fill="#FEF3C7"
          stroke="#B45309"
          strokeWidth={2.2}
        />
        <Line x1={12} y1={9} x2={12} y2={13} stroke="#B45309" strokeWidth={2.2} />
        <Circle cx={12} cy={17} r={1.2} fill="#B45309" />
      </Svg>
      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#B45309" }}>
        HiPo Exception
      </Text>
    </View>
  );
}

function HiPoExceptionBanner({ lowScoreCount }: { lowScoreCount: number }) {
  const countLabel = lowScoreCount > 0 ? `${lowScoreCount} sub-dimensions` : "multiple sub-dimensions";
  return (
    <View
      style={{
        marginTop: 14,
        backgroundColor: "#FEFCE8",
        borderWidth: 1.2,
        borderColor: "#FACC15",
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" style={{ marginRight: 8, marginTop: 1 }}>
        <Path
          d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          fill="#FEF3C7"
          stroke="#D97706"
          strokeWidth={2.2}
        />
        <Line x1={12} y1={9} x2={12} y2={13} stroke="#D97706" strokeWidth={2.2} />
        <Circle cx={12} cy={17} r={1.2} fill="#D97706" />
      </Svg>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#92400E", marginBottom: 3 }}>
          HiPo Exception Detected
        </Text>
        <Text style={{ fontSize: 8.5, color: "#92400E", lineHeight: 1.45 }}>
          Total score qualifies as{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>High Potential (HiPo)</Text>, but{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{countLabel}</Text> are rated 1 or 2. Final
          classification is downgraded to{" "}
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Promotable/Expandable.</Text>
        </Text>
      </View>
    </View>
  );
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ── Page dimensions (A4) ─────────────────────────────────────────────────────
const PAGE_H_PAD = 40;
const CONTENT_W = 515; // 595 - 2×40

// ── Shared styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily:        "Helvetica",
    backgroundColor:   C.WHITE,
    paddingHorizontal: PAGE_H_PAD,
    paddingTop:        48,
    paddingBottom:     52,
    fontSize:          9,
    color:             C.NAVY,
  },
  coverPage: {
    fontFamily:        "Helvetica",
    backgroundColor:   C.WHITE,
    padding:           0,
    fontSize:          9,
    color:             C.NAVY,
  },

  // ── Fixed header (appears on every content page) ──────────────────────────
  fixedHeader: {
    position:          "absolute",
    top:               0,
    left:              0,
    right:             0,
    height:            36,
    backgroundColor:   C.BLUE,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: PAGE_H_PAD,
  },
  fixedHeaderLeft: {
    color:             C.WHITE,
    fontSize:          6.8,
    fontFamily:        "Helvetica-Bold",
    letterSpacing:     1.0,
    textTransform:     "uppercase",
    marginRight:       12,
  },
  fixedHeaderRight: {
    color:             "#93C5FD",
    fontSize:          7,
    letterSpacing:     0.4,
    flexShrink:        0,
  },

  // ── Fixed footer ──────────────────────────────────────────────────────────
  fixedFooter: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    height:            38,
    backgroundColor:   C.SLATE_50,
    borderTopWidth:    1,
    borderTopColor:    C.SLATE_200,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: PAGE_H_PAD,
  },
  fixedFooterLeft: {
    color:             C.SLATE_500,
    fontSize:          7,
    letterSpacing:     0.3,
  },
  fixedFooterRight: {
    color:             C.SLATE_500,
    fontSize:          7,
  },

  // ── Section titles ────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily:        "Helvetica-Bold",
    fontSize:          11,
    color:             C.BLUE,
    marginBottom:      10,
    paddingBottom:     6,
    borderBottomWidth: 2,
    borderBottomColor: C.BLUE,
    letterSpacing:     0.5,
  },
  sectionSubtitle: {
    fontFamily:        "Helvetica-Bold",
    fontSize:          8,
    color:             C.SLATE_500,
    letterSpacing:     1.5,
    textTransform:     "uppercase",
    marginBottom:      8,
    marginTop:         14,
  },

  // ── Score cards ───────────────────────────────────────────────────────────
  scoreCardsRow: {
    flexDirection:     "row",
    marginBottom:      16,
  },
  scoreCard: {
    flex:              1,
    backgroundColor:   C.SLATE_50,
    borderWidth:       1,
    borderColor:       C.SLATE_200,
    borderRadius:      6,
    padding:           10,
    alignItems:        "center",
    marginRight:       8,
  },
  scoreCardLast: {
    flex:              1,
    backgroundColor:   C.BLUE_LIGHT,
    borderWidth:       1,
    borderColor:       C.BLUE_BORDER,
    borderRadius:      6,
    padding:           10,
    alignItems:        "center",
  },
  scoreCardLabel: {
    fontSize:          7,
    color:             C.SLATE_500,
    letterSpacing:     1,
    textTransform:     "uppercase",
    marginBottom:      5,
    fontFamily:        "Helvetica-Bold",
  },
  scoreCardValue: {
    fontSize:          20,
    fontFamily:        "Helvetica-Bold",
    color:             C.NAVY,
    marginBottom:      2,
  },
  scoreCardValueBlue: {
    fontSize:          20,
    fontFamily:        "Helvetica-Bold",
    color:             C.BLUE,
    marginBottom:      2,
  },
  scoreCardMax: {
    fontSize:          7,
    color:             C.SLATE_400,
  },

  // ── Classification pill ───────────────────────────────────────────────────
  classPill: {
    flexDirection:     "row",
    alignItems:        "center",
    alignSelf:         "flex-start",
    borderRadius:      4,
    paddingHorizontal: 8,
    paddingVertical:   4,
    marginBottom:      14,
    borderWidth:       1,
  },
  classPillText: {
    fontSize:          9,
    fontFamily:        "Helvetica-Bold",
  },

  // ── Info grid ─────────────────────────────────────────────────────────────
  infoGrid: {
    flexDirection:     "row",
    flexWrap:          "wrap",
    marginBottom:      12,
  },
  infoCell: {
    width:             "50%",
    marginBottom:      8,
  },
  infoCellFull: {
    width:             "100%",
    marginBottom:      8,
  },
  infoLabel: {
    fontSize:          7,
    color:             C.SLATE_400,
    letterSpacing:     1,
    textTransform:     "uppercase",
    marginBottom:      2,
    fontFamily:        "Helvetica-Bold",
  },
  infoValue: {
    fontSize:          9,
    color:             C.NAVY,
    fontFamily:        "Helvetica-Bold",
  },
  infoValueLight: {
    fontSize:          9,
    color:             C.SLATE_600,
  },

  // ── Competency table ──────────────────────────────────────────────────────
  compTableHeader: {
    flexDirection:     "row",
    backgroundColor:   C.NAVY,
    paddingVertical:   6,
    paddingHorizontal: 8,
    marginBottom:      1,
    borderRadius:      3,
  },
  compTableHeaderText: {
    color:             C.WHITE,
    fontSize:          7,
    fontFamily:        "Helvetica-Bold",
    letterSpacing:     0.8,
    textTransform:     "uppercase",
  },
  compSectionRow: {
    flexDirection:     "row",
    backgroundColor:   C.BLUE,
    paddingVertical:   5,
    paddingHorizontal: 8,
    marginTop:         6,
    marginBottom:      1,
    borderRadius:      3,
  },
  compSectionLabel: {
    color:             C.WHITE,
    fontSize:          8,
    fontFamily:        "Helvetica-Bold",
    letterSpacing:     0.5,
  },
  compRow: {
    flexDirection:     "row",
    borderBottomWidth: 1,
    borderBottomColor: C.SLATE_100,
    paddingVertical:   7,
    paddingHorizontal: 8,
  },
  compRowAlt: {
    flexDirection:     "row",
    borderBottomWidth: 1,
    borderBottomColor: C.SLATE_100,
    paddingVertical:   7,
    paddingHorizontal: 8,
    backgroundColor:   C.SLATE_50,
  },
  compColId: {
    width:             "5%",
    paddingRight:      4,
  },
  compColName: {
    width:             "25%",
    paddingRight:      8,
  },
  compColScore: {
    width:             "6%",
    paddingRight:      6,
  },
  compColRating: {
    width:             "20%",
    paddingRight:      10,
  },
  compColEvidence: {
    width:             "44%",
    paddingLeft:       2,
  },
  compCellText: {
    fontSize:          7.5,
    color:             C.SLATE_700,
    lineHeight:        1.4,
  },
  compCellBold: {
    fontSize:          7.8,
    color:             C.NAVY,
    fontFamily:        "Helvetica-Bold",
  },
  compScoreBadge: {
    borderRadius:      3,
    paddingHorizontal: 4,
    paddingVertical:   2,
    alignSelf:         "flex-start",
  },
  compScoreText: {
    fontSize:          8,
    fontFamily:        "Helvetica-Bold",
  },

  // ── Comments box ──────────────────────────────────────────────────────────
  commentsBox: {
    backgroundColor:   C.SLATE_50,
    borderWidth:       1,
    borderColor:       C.SLATE_200,
    borderRadius:      6,
    padding:           14,
    marginBottom:      14,
  },
  commentsText: {
    fontSize:          9,
    color:             C.SLATE_700,
    lineHeight:        1.7,
  },

  // ── Horizontal rule ───────────────────────────────────────────────────────
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: C.SLATE_200,
    marginBottom:      12,
    marginTop:         4,
  },
});

// ── Score badge color (black small box with white text) ───────────────────────
function scoreBg(): { bg: string; text: string } {
  return { bg: C.NAVY, text: C.WHITE };
}

// ── Truncate evidence text ────────────────────────────────────────────────────
function truncate(text: string, max = 220): string {
  if (!text || text.length <= max) return text || "—";
  return text.slice(0, max) + "…";
}

function formatSubmitter(employee: ExportEmployee, assessment: ExportEmployee["assessment"]) {
  const name = assessment.submittedBy?.name || employee.managerName;
  const email = assessment.submittedBy?.email || employee.managerEmail || "";
  return {
    name,
    email,
    display: email ? `${name} (${email})` : name,
  };
}

const POTENTIAL_BANDS = [
  {
    key: "HIPO" as const,
    range: "37 – 48",
    classification: "High Potential (HiPo)",
    approach:
      "Has the potential to move 1-2 levels up. Excels across all three pillars. Can be considered for promotion immediately, if other promotion criteria are met. Should receive broad organizational exposure, executive mentorship, and rapid development paths.",
  },
  {
    key: "PROMOTABLE" as const,
    range: "24 – 36",
    classification: "Promotable/Expandable",
    approach:
      "Has the potential to move 1 level up with targeted development. Can be considered for larger roles at the same responsibility level immediately. Should receive coaching/mentoring to address the specific gaps on aspects of ability, aspiration or leadership to enable development towards higher-level roles.",
  },
  {
    key: "WELL_PLACED" as const,
    range: "Below 24",
    classification: "Well-placed",
    approach:
      "Not yet ready for larger roles. Consider job enrichment, deep specialization, and retention if the performance is good.",
  },
];

function getActiveBandKey(grandTotal: number, isHiPoException: boolean) {
  if (!isHiPoException && grandTotal >= 37 && grandTotal <= 48) return "HIPO" as const;
  if (isHiPoException || (grandTotal >= 24 && grandTotal <= 36)) return "PROMOTABLE" as const;
  return "WELL_PLACED" as const;
}

function formatSubmittedDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function CoverPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const cls = classColors(assessment.computedResult.classificationCategory);
  const initials = getInitials(employee.name);
  const cycle = formatAssessmentCycle(assessment.cycle);
  const submitter = formatSubmitter(employee, assessment);
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <Page size="A4" style={styles.coverPage}>
      {/* Top branded band (light gray with logos + high-contrast navy/blue text) */}
      <View style={{
        backgroundColor: "#E2E8F0",
        paddingHorizontal: PAGE_H_PAD,
        paddingTop: 28,
        paddingBottom: 32,
      }}>
        {/* Top Logos Row */}
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

        {/* Confidential badge */}
        <View style={{
          alignSelf: "flex-start",
          backgroundColor: C.ROSE,
          borderRadius: 3,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginBottom: 14,
        }}>
          <Text style={{ color: C.WHITE, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
            STRICTLY CONFIDENTIAL
          </Text>
        </View>

        {/* Company & App title */}
        <Text style={{ color: C.NAVY, fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 4 }}>
          {COMPANY_NAME}
        </Text>
        <Text style={{ color: C.BLUE, fontSize: 15, fontFamily: "Helvetica-Bold" }}>
          {PDF_APP_NAME}
        </Text>
      </View>

      {/* Diagonal accent bar */}
      <View style={{ height: 5, backgroundColor: C.BLUE }} />

      {/* Employee identity block */}
      <View style={{
        paddingHorizontal: PAGE_H_PAD,
        paddingTop: 36,
        paddingBottom: 28,
        flex: 1,
      }}>
        {/* Avatar circle */}
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.BLUE_LIGHT,
          borderWidth: 2,
          borderColor: C.BLUE_BORDER,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: C.BLUE }}>
            {initials}
          </Text>
        </View>

        {/* Name */}
        <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: C.NAVY, marginBottom: 4 }}>
          {employee.name}
        </Text>
        <Text style={{ fontSize: 12, color: C.SLATE_600, marginBottom: 18 }}>
          {employee.designation}
        </Text>

        <View style={styles.rule} />

        {/* Employee metadata */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>{employee.id}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Employee Email</Text>
            <Text style={styles.infoValue}>{employee.email || "—"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{employee.department}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Entity</Text>
            <Text style={styles.infoValue}>{employee.entity}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{employee.location}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Line Manager</Text>
            <Text style={styles.infoValue}>{submitter.display}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>HRBP</Text>
            <Text style={styles.infoValue}>{employee.hrbpName || "—"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Impact Level</Text>
            <Text style={styles.infoValue}>{employee.impactLevel}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        {/* Classification highlight */}
        <Text style={{ ...styles.infoLabel, marginBottom: 8 }}>Final Classification</Text>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <View style={{
            ...styles.classPill,
            backgroundColor: cls.bg,
            borderColor: cls.border,
            marginBottom: 0,
          }}>
            <Text style={{ ...styles.classPillText, color: cls.text }}>
              {assessment.computedResult.classificationCategory}
            </Text>
          </View>
          {assessment.computedResult.isHiPoException && <HiPoExceptionBadge />}
        </View>

        {/* Grand total score (matches classification color) */}
        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
          <Text style={{ fontSize: 32, fontFamily: "Helvetica-Bold", color: cls.text }}>
            {assessment.computedResult.grandTotal}
          </Text>
          <Text style={{ fontSize: 14, color: C.SLATE_400, marginLeft: 4 }}>/ 48</Text>
        </View>
        <Text style={{ fontSize: 8, color: C.SLATE_500, marginTop: 2 }}>
          Grand Total Score  ·  Ability + Aspiration + Leadership
        </Text>

        {assessment.computedResult.isHiPoException && (
          <HiPoExceptionBanner lowScoreCount={countLowScoreSubDimensions(assessment.scores)} />
        )}
      </View>

      {/* Cover page footer */}
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
        <View>
          <Text style={{ fontSize: 7, color: C.SLATE_400, marginBottom: 2 }}>
            Generated on {generatedDate}
          </Text>
          <Text style={{ fontSize: 7, color: C.SLATE_500, fontFamily: "Helvetica-Bold" }}>
            {employee.entity}  ·  Talent Management Platform
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 7, color: C.SLATE_400, letterSpacing: 0.8 }}>
            HUMAN RESOURCES  ·  STRICTLY CONFIDENTIAL
          </Text>
          <Text style={{ fontSize: 6.5, color: C.SLATE_400, marginTop: 2 }}>
            Submitted: {formatSubmittedDateTime(assessment.submittedAt)}
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE SUMMARY PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function EmployeeSummaryPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const { computedResult } = assessment;
  const cls = classColors(computedResult.classificationCategory);
  const cycle = formatAssessmentCycle(assessment.cycle);
  const submitter = formatSubmitter(employee, assessment);

  return (
    <Page size="A4" style={styles.page}>
      {/* Fixed header */}
      <View fixed style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderLeft}>{COMPANY_NAME} - {PDF_APP_NAME.toUpperCase()}  ·  {cycle}</Text>
        <Text style={styles.fixedHeaderRight}>{employee.name}</Text>
      </View>

      {/* Fixed footer */}
      <View fixed style={styles.fixedFooter}>
        <View>
          <Text style={styles.fixedFooterLeft}>
            STRICTLY CONFIDENTIAL  ·  {employee.entity}  ·  {cycle}
          </Text>
          <Text style={{ fontSize: 6, color: C.SLATE_400, marginTop: 1 }}>
            Submitted: {formatSubmittedDateTime(assessment.submittedAt)}
          </Text>
        </View>
        <Text
          style={styles.fixedFooterRight}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>

      {/* Page content */}
      <Text style={{ fontSize: 6.8, color: C.SLATE_500, textAlign: "right", marginBottom: 4 }}>
        Line Manager: {submitter.display}
      </Text>
      <Text style={styles.sectionTitle}>Executive Summary</Text>

      {/* 1. Scoring Summary */}
      <Text style={{ ...styles.sectionSubtitle, marginTop: 4 }}>Scoring Summary</Text>
      <View style={{ ...styles.scoreCardsRow, alignItems: "center" }}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>Ability</Text>
          <Text style={styles.scoreCardValue}>{computedResult.abilitySum}</Text>
          <Text style={styles.scoreCardMax}>out of 16</Text>
        </View>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>Aspiration</Text>
          <Text style={styles.scoreCardValue}>{computedResult.aspirationSum}</Text>
          <Text style={styles.scoreCardMax}>out of 16</Text>
        </View>
        <View style={{ ...styles.scoreCard, marginRight: 0 }}>
          <Text style={styles.scoreCardLabel}>Leadership</Text>
          <Text style={styles.scoreCardValue}>{computedResult.leadershipSum}</Text>
          <Text style={styles.scoreCardMax}>out of 16</Text>
        </View>
        <View style={{ width: 22, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: C.SLATE_500 }}>=</Text>
        </View>
        <View style={{ ...styles.scoreCardLast, backgroundColor: cls.bg, borderColor: cls.border }}>
          <Text style={styles.scoreCardLabel}>Grand Total</Text>
          <Text style={{ ...styles.scoreCardValueBlue, color: cls.text }}>{computedResult.grandTotal}</Text>
          <Text style={styles.scoreCardMax}>out of 48</Text>
        </View>
      </View>

      {/* 2. Manager's Comments */}
      <Text style={styles.sectionSubtitle}>Manager&apos;s Comments</Text>
      <View style={styles.commentsBox}>
        <Text style={styles.commentsText}>
          {assessment.managerComments
            ? assessment.managerComments
            : "No manager commentary was recorded for this assessment cycle."}
        </Text>
      </View>

      {/* 3. Potential Classification */}
      <Text style={{ ...styles.sectionSubtitle, marginTop: 8, marginBottom: 6 }}>Potential Classification</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <View style={{ ...styles.classPill, backgroundColor: cls.bg, borderColor: cls.border, marginBottom: 0 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cls.dot, marginRight: 6 }} />
          <Text style={{ ...styles.classPillText, color: cls.text }}>
            {computedResult.classificationCategory}
          </Text>
        </View>
        {computedResult.isHiPoException && <HiPoExceptionBadge />}
      </View>
      {(() => {
        const activeKey = getActiveBandKey(computedResult.grandTotal, computedResult.isHiPoException);
        return (
          <View style={{
            borderWidth: 1,
            borderColor: C.SLATE_300,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 10,
          }}>
            <View style={{
              flexDirection: "row",
              backgroundColor: C.SLATE_100,
              paddingVertical: 7,
              paddingHorizontal: 10,
              borderBottomWidth: 1,
              borderBottomColor: C.SLATE_300,
            }}>
              <Text style={{ width: "14%", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.SLATE_700 }}>TOTAL SCORE</Text>
              <Text style={{ width: "24%", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.SLATE_700 }}>POTENTIAL CLASSIFICATION</Text>
              <Text style={{ width: "62%", fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.SLATE_700 }}>
                DESCRIPTION &amp; BROAD TALENT MANAGEMENT APPROACH
              </Text>
            </View>
            {POTENTIAL_BANDS.map((band, idx) => {
              const isActive = band.key === activeKey;
              return (
                <View
                  key={band.key}
                  style={{
                    flexDirection: "row",
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    backgroundColor: isActive ? cls.bg : C.WHITE,
                    borderBottomWidth: idx < POTENTIAL_BANDS.length - 1 ? 1 : 0,
                    borderBottomColor: C.SLATE_200,
                    borderLeftWidth: isActive ? 4 : 0,
                    borderLeftColor: cls.text,
                  }}
                >
                  <Text style={{
                    width: "14%",
                    fontSize: 8.5,
                    fontFamily: isActive ? "Helvetica-Bold" : "Helvetica",
                    color: isActive ? cls.text : C.SLATE_600,
                    paddingRight: 4,
                  }}>
                    {band.range}
                  </Text>
                  <Text style={{
                    width: "24%",
                    fontSize: 8.5,
                    fontFamily: isActive ? "Helvetica-Bold" : "Helvetica",
                    color: isActive ? cls.text : C.SLATE_700,
                    paddingRight: 8,
                  }}>
                    {band.classification}
                  </Text>
                  <Text style={{
                    width: "62%",
                    fontSize: 8,
                    fontFamily: isActive ? "Helvetica-Bold" : "Helvetica",
                    color: isActive ? C.NAVY : C.SLATE_600,
                    lineHeight: 1.45,
                  }}>
                    {band.approach}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })()}

      {/* 4. Section Performance Breakdown (compact at bottom, including Total) */}
      <Text style={{ ...styles.sectionSubtitle, marginTop: 6, marginBottom: 5 }}>Section Performance Breakdown</Text>
      {(
        [
          { label: "Ability",     score: computedResult.abilitySum,     max: 16, isTotal: false },
          { label: "Aspiration",  score: computedResult.aspirationSum,  max: 16, isTotal: false },
          { label: "Leadership",  score: computedResult.leadershipSum,  max: 16, isTotal: false },
          { label: "Total",       score: computedResult.grandTotal,     max: 48, isTotal: true },
        ] as const
      ).map(({ label, score, max, isTotal }) => {
        const pct = max > 0 ? Math.round((score / max) * 100) : 0;
        return (
          <View key={label} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: isTotal ? C.BLUE : C.SLATE_700 }}>
                {label}
              </Text>
              <Text style={{ fontSize: 7.5, fontFamily: isTotal ? "Helvetica-Bold" : "Helvetica", color: isTotal ? C.BLUE : C.SLATE_500 }}>
                {score} / {max} ({pct}%)
              </Text>
            </View>
            <View style={{ height: 5, backgroundColor: C.SLATE_100, borderRadius: 3 }}>
              <View style={{
                height: 5,
                width: `${pct}%`,
                backgroundColor: isTotal ? C.NAVY : C.BLUE,
                borderRadius: 3,
              }} />
            </View>
          </View>
        );
      })}
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPETENCY MATRIX PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function EmployeeCompetencyPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const cycle = formatAssessmentCycle(assessment.cycle);
  const submitter = formatSubmitter(employee, assessment);
  const sections: Array<{ key: keyof typeof SUB_DIMENSIONS; label: string }> = [
    { key: "ability",    label: "Ability" },
    { key: "aspiration", label: "Aspiration" },
    { key: "leadership", label: "Leadership" },
  ];

  return (
    <Page size="A4" style={styles.page}>
      {/* Fixed header */}
      <View fixed style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderLeft}>{COMPANY_NAME} - {PDF_APP_NAME.toUpperCase()}  ·  {cycle}</Text>
        <Text style={styles.fixedHeaderRight}>{employee.name}</Text>
      </View>

      {/* Fixed footer */}
      <View fixed style={styles.fixedFooter}>
        <View>
          <Text style={styles.fixedFooterLeft}>
            STRICTLY CONFIDENTIAL  ·  {employee.entity}  ·  {cycle}
          </Text>
          <Text style={{ fontSize: 6, color: C.SLATE_400, marginTop: 1 }}>
            Submitted: {formatSubmittedDateTime(assessment.submittedAt)}
          </Text>
        </View>
        <Text
          style={styles.fixedFooterRight}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>

      <Text style={{ fontSize: 6.8, color: C.SLATE_500, textAlign: "right", marginBottom: 4 }}>
        Line Manager: {submitter.display}
      </Text>
      <Text style={styles.sectionTitle}>TALENT POTENTIAL ASSESSMENT</Text>

      {/* Table header */}
      <View style={styles.compTableHeader}>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColId }}>#</Text>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColName }}>Behavioural Indicators</Text>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColScore }}>Score</Text>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColRating }}>Rating</Text>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColEvidence }}>Manager's Observation</Text>
      </View>

      {sections.map(({ key, label }) => {
        const dims = SUB_DIMENSIONS[key];
        const scoresForSection = (assessment.scores[key] || {}) as Record<string, number>;
        const evidence = (assessment.evidence || {}) as Record<string, string>;

        return (
          <View key={key}>
            {/* Section group header */}
            <View style={styles.compSectionRow}>
              <Text style={styles.compSectionLabel}>{label.toUpperCase()}</Text>
            </View>

            {dims.map((dim, idx) => {
              const score = scoresForSection[dim.id] ?? 0;
              const scoreColors = scoreBg();
              const rowStyle = idx % 2 === 0 ? styles.compRow : styles.compRowAlt;
              const evidenceText = evidence[dim.id] ? truncate(evidence[dim.id]) : "—";
              const ratingLabel = score > 0 ? (RATING_SHORT_LABELS[score as 1 | 2 | 3 | 4] || "—") : "Not Rated";

              return (
                <View key={dim.id} style={rowStyle}>
                  <Text style={{ ...styles.compCellText, ...styles.compColId }}>{dim.id}</Text>
                  <Text style={{ ...styles.compCellBold, ...styles.compColName }}>{dim.title}</Text>
                  <View style={{ ...styles.compColScore, alignItems: "flex-start" }}>
                    {score > 0 ? (
                      <View style={{
                        ...styles.compScoreBadge,
                        backgroundColor: scoreColors.bg,
                      }}>
                        <Text style={{ ...styles.compScoreText, color: scoreColors.text }}>
                          {score}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 8, color: C.SLATE_400 }}>—</Text>
                    )}
                  </View>
                  <Text style={{ ...styles.compCellText, ...styles.compColRating, color: C.SLATE_600 }}>
                    {ratingLabel}
                  </Text>
                  <Text style={{ ...styles.compCellText, ...styles.compColEvidence }}>
                    {evidenceText}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT (3 Pages: Cover, Executive Summary, Competency Matrix)
// ─────────────────────────────────────────────────────────────────────────────
export function EmployeeAppraisalTemplate({
  employee,
}: {
  employee: ExportEmployee;
}) {
  const assessment = employee.assessment;

  const cycle = formatAssessmentCycle(assessment.cycle);

  return (
    <Document
      title={`${PDF_APP_NAME} — ${employee.name} — ${cycle}`}
      author={employee.entity}
      subject={`Confidential ${PDF_APP_NAME}`}
      creator="Talent Management Platform"
      producer="Talent Management Platform"
    >
      <CoverPage              employee={employee} assessment={assessment} />
      <EmployeeSummaryPage    employee={employee} assessment={assessment} />
      <EmployeeCompetencyPage employee={employee} assessment={assessment} />
    </Document>
  );
}
