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
  StyleSheet,
} from "@react-pdf/renderer";
import { SUB_DIMENSIONS, RATING_SHORT_LABELS } from "@/lib/constants";
import type { ExportEmployee } from "@/types/export-report";

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
function classColors(category: string): { bg: string; text: string; border: string } {
  if (category.includes("High Potential")) {
    return { bg: C.BLUE_LIGHT,    text: C.BLUE,         border: C.BLUE_BORDER };
  }
  if (category.includes("Promotable")) {
    return { bg: C.EMERALD_LIGHT, text: C.EMERALD_DARK, border: "#A7F3D0" };
  }
  if (category.includes("Well-placed")) {
    return { bg: C.SLATE_100,     text: C.SLATE_700,    border: C.SLATE_300 };
  }
  return   { bg: C.AMBER_LIGHT,   text: C.AMBER,        border: "#FDE68A" };
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
    fontSize:          7,
    fontFamily:        "Helvetica-Bold",
    letterSpacing:     1.5,
    textTransform:     "uppercase",
  },
  fixedHeaderRight: {
    color:             "#93C5FD",
    fontSize:          7,
    letterSpacing:     0.5,
  },

  // ── Fixed footer ──────────────────────────────────────────────────────────
  fixedFooter: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    height:            32,
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
  },
  compColName: {
    width:             "18%",
  },
  compColScore: {
    width:             "8%",
  },
  compColRating: {
    width:             "19%",
  },
  compColEvidence: {
    width:             "50%",
  },
  compCellText: {
    fontSize:          8,
    color:             C.SLATE_700,
    lineHeight:        1.4,
  },
  compCellBold: {
    fontSize:          8,
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

// ── Score badge color ─────────────────────────────────────────────────────────
function scoreBg(score: number): { bg: string; text: string } {
  if (score >= 4) return { bg: "#1E3A8A", text: C.WHITE };
  if (score === 3) return { bg: C.EMERALD_LIGHT, text: C.EMERALD_DARK };
  if (score === 2) return { bg: C.AMBER_LIGHT, text: C.AMBER };
  return { bg: C.ROSE_LIGHT, text: C.ROSE };
}

// ── Truncate evidence text ────────────────────────────────────────────────────
function truncate(text: string, max = 220): string {
  if (!text || text.length <= max) return text || "—";
  return text.slice(0, max) + "…";
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function CoverPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const cls = classColors(assessment.computedResult.classificationCategory);
  const initials = getInitials(employee.name);
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <Page size="A4" style={styles.coverPage}>
      {/* Top branded band */}
      <View style={{
        backgroundColor: C.NAVY,
        paddingHorizontal: PAGE_H_PAD,
        paddingTop: 50,
        paddingBottom: 44,
      }}>
        {/* Confidential badge */}
        <View style={{
          alignSelf: "flex-start",
          backgroundColor: C.ROSE,
          borderRadius: 3,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginBottom: 20,
        }}>
          <Text style={{ color: C.WHITE, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1.5 }}>
            STRICTLY CONFIDENTIAL
          </Text>
        </View>

        {/* Main title */}
        <Text style={{ color: C.WHITE, fontSize: 26, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 8 }}>
          Talent Assessment{"\n"}Report
        </Text>
        <Text style={{ color: "#93C5FD", fontSize: 11, letterSpacing: 0.5 }}>
          {assessment.cycle} Performance Evaluation Cycle
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
            <Text style={styles.infoLabel}>Direct Manager</Text>
            <Text style={styles.infoValue}>{employee.managerName}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>HRBP</Text>
            <Text style={styles.infoValue}>{employee.hrbpName || "—"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Impact Level</Text>
            <Text style={styles.infoValue}>{employee.impactLevel}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Assessment Cycle</Text>
            <Text style={styles.infoValue}>{assessment.cycle}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        {/* Classification highlight */}
        <Text style={{ ...styles.infoLabel, marginBottom: 8 }}>Final Classification</Text>
        <View style={{
          ...styles.classPill,
          backgroundColor: cls.bg,
          borderColor: cls.border,
        }}>
          <Text style={{ ...styles.classPillText, color: cls.text }}>
            {assessment.computedResult.classificationCategory}
            {assessment.computedResult.isHiPoException ? "  ⚡ HiPo Exception" : ""}
          </Text>
        </View>

        {/* Grand total score */}
        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
          <Text style={{ fontSize: 32, fontFamily: "Helvetica-Bold", color: C.BLUE }}>
            {assessment.computedResult.grandTotal}
          </Text>
          <Text style={{ fontSize: 14, color: C.SLATE_400, marginLeft: 4 }}>/ 48</Text>
        </View>
        <Text style={{ fontSize: 8, color: C.SLATE_500, marginTop: 2 }}>
          Grand Total Score  ·  Ability + Aspiration + Leadership
        </Text>
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
        </View>
      </View>
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE SUMMARY PAGE
// ─────────────────────────────────────────────────────────────────────────────
function SummaryPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const { computedResult } = assessment;
  const cls = classColors(computedResult.classificationCategory);

  return (
    <Page size="A4" style={styles.page}>
      {/* Fixed header */}
      <View fixed style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderLeft}>Talent Assessment Report  ·  {assessment.cycle}</Text>
        <Text style={styles.fixedHeaderRight}>{employee.name}  ·  {employee.id}</Text>
      </View>

      {/* Fixed footer */}
      <View fixed style={styles.fixedFooter}>
        <Text style={styles.fixedFooterLeft}>
          STRICTLY CONFIDENTIAL  ·  {employee.entity}  ·  {assessment.cycle}
        </Text>
        <Text
          style={styles.fixedFooterRight}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>

      {/* Page content */}
      <Text style={styles.sectionTitle}>Executive Summary</Text>

      {/* Score cards */}
      <View style={styles.scoreCardsRow}>
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
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>Leadership</Text>
          <Text style={styles.scoreCardValue}>{computedResult.leadershipSum}</Text>
          <Text style={styles.scoreCardMax}>out of 16</Text>
        </View>
        <View style={styles.scoreCardLast}>
          <Text style={styles.scoreCardLabel}>Grand Total</Text>
          <Text style={styles.scoreCardValueBlue}>{computedResult.grandTotal}</Text>
          <Text style={styles.scoreCardMax}>out of 48</Text>
        </View>
      </View>

      {/* Classification */}
      <Text style={styles.sectionSubtitle}>Talent Classification</Text>
      <View style={{ ...styles.classPill, backgroundColor: cls.bg, borderColor: cls.border }}>
        <Text style={{ ...styles.classPillText, color: cls.text }}>
          ● {"  "}{computedResult.classificationCategory}
          {computedResult.isHiPoException ? "  (HiPo Exception)" : ""}
        </Text>
      </View>
      <View style={styles.commentsBox}>
        <Text style={styles.commentsText}>{computedResult.classificationDescription}</Text>
      </View>

      {/* Employee info grid */}
      <Text style={styles.sectionSubtitle}>Employee Details</Text>
      <View style={styles.infoGrid}>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>{employee.name}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Employee ID</Text>
          <Text style={styles.infoValue}>{employee.id}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Designation</Text>
          <Text style={styles.infoValueLight}>{employee.designation}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValueLight}>{employee.department}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Entity</Text>
          <Text style={styles.infoValueLight}>{employee.entity}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={styles.infoValueLight}>{employee.location}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Direct Manager</Text>
          <Text style={styles.infoValue}>{employee.managerName}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>HRBP</Text>
          <Text style={styles.infoValueLight}>{employee.hrbpName || "—"}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Impact Level</Text>
          <Text style={styles.infoValueLight}>{employee.impactLevel}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>Submitted</Text>
          <Text style={styles.infoValueLight}>
            {assessment.submittedAt
              ? new Date(assessment.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "—"}
          </Text>
        </View>
      </View>

      {/* Section score breakdown bars */}
      <Text style={styles.sectionSubtitle}>Section Performance Breakdown</Text>
      {(
        [
          { label: "Ability",     score: computedResult.abilitySum,     max: 16 },
          { label: "Aspiration",  score: computedResult.aspirationSum,  max: 16 },
          { label: "Leadership",  score: computedResult.leadershipSum,  max: 16 },
        ] as const
      ).map(({ label, score, max }) => {
        const pct = max > 0 ? (score / max) : 0;
        return (
          <View key={label} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.SLATE_700 }}>{label}</Text>
              <Text style={{ fontSize: 8, color: C.SLATE_500 }}>{score} / {max}</Text>
            </View>
            {/* Bar track */}
            <View style={{ height: 7, backgroundColor: C.SLATE_100, borderRadius: 4 }}>
              {/* Bar fill */}
              <View style={{
                height: 7,
                width: `${Math.round(pct * 100)}%`,
                backgroundColor: C.BLUE,
                borderRadius: 4,
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
function CompetencyPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const sections: Array<{ key: keyof typeof SUB_DIMENSIONS; label: string }> = [
    { key: "ability",    label: "Ability" },
    { key: "aspiration", label: "Aspiration" },
    { key: "leadership", label: "Leadership" },
  ];

  return (
    <Page size="A4" style={styles.page}>
      {/* Fixed header */}
      <View fixed style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderLeft}>Talent Assessment Report  ·  {assessment.cycle}</Text>
        <Text style={styles.fixedHeaderRight}>{employee.name}  ·  {employee.id}</Text>
      </View>

      {/* Fixed footer */}
      <View fixed style={styles.fixedFooter}>
        <Text style={styles.fixedFooterLeft}>
          STRICTLY CONFIDENTIAL  ·  {employee.entity}  ·  {assessment.cycle}
        </Text>
        <Text
          style={styles.fixedFooterRight}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>

      <Text style={styles.sectionTitle}>Competency Assessment Matrix</Text>

      {/* Table header */}
      <View style={styles.compTableHeader}>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColId }}>#</Text>
        <Text style={{ ...styles.compTableHeaderText, ...styles.compColName }}>Competency</Text>
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
              const scoreColors = scoreBg(score);
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
// FEEDBACK & METADATA PAGE
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackPage({ employee, assessment }: { employee: ExportEmployee; assessment: ExportEmployee["assessment"] }) {
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <Page size="A4" style={styles.page}>
      {/* Fixed header */}
      <View fixed style={styles.fixedHeader}>
        <Text style={styles.fixedHeaderLeft}>Talent Assessment Report  ·  {assessment.cycle}</Text>
        <Text style={styles.fixedHeaderRight}>{employee.name}  ·  {employee.id}</Text>
      </View>

      {/* Fixed footer */}
      <View fixed style={styles.fixedFooter}>
        <Text style={styles.fixedFooterLeft}>
          STRICTLY CONFIDENTIAL  ·  {employee.entity}  ·  {assessment.cycle}
        </Text>
        <Text
          style={styles.fixedFooterRight}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>

      {/* Manager Feedback */}
      <Text style={styles.sectionTitle}>Manager's Assessment Commentary</Text>

      <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 3, height: 14, backgroundColor: C.BLUE, borderRadius: 2, marginRight: 8 }} />
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.SLATE_700 }}>
          Assessed by {employee.managerName}
        </Text>
      </View>

      <View style={styles.commentsBox}>
        <Text style={styles.commentsText}>
          {assessment.managerComments
            ? assessment.managerComments
            : "No manager commentary was recorded for this assessment cycle."}
        </Text>
      </View>

      {/* Classification rationale */}
      <Text style={styles.sectionSubtitle}>Classification Rationale</Text>
      <View style={styles.commentsBox}>
        <Text style={styles.commentsText}>
          {assessment.computedResult.classificationDescription}
        </Text>
      </View>

      {/* Review metadata */}
      <Text style={styles.sectionSubtitle}>Review Metadata</Text>
      <View style={{
        borderWidth: 1,
        borderColor: C.SLATE_200,
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        {[
          ["Assessment Cycle",       assessment.cycle],
          ["Assessment Status",      "Completed"],
          ["Direct Manager",         employee.managerName],
          ["HRBP",                   employee.hrbpName || "—"],
          ["Classification",         assessment.computedResult.classificationCategory],
          ["HiPo Exception",         assessment.computedResult.isHiPoException ? "Yes" : "No"],
          ["Submission Date",        assessment.submittedAt
            ? new Date(assessment.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
            : "—"],
          ["Report Generated",       generatedDate],
        ].map(([label, value], i) => (
          <View key={label} style={{
            flexDirection:     "row",
            paddingHorizontal: 12,
            paddingVertical:   7,
            backgroundColor:   i % 2 === 0 ? C.SLATE_50 : C.WHITE,
            borderBottomWidth: i < 7 ? 1 : 0,
            borderBottomColor: C.SLATE_100,
          }}>
            <Text style={{ width: "40%", fontSize: 8, color: C.SLATE_500, fontFamily: "Helvetica-Bold" }}>
              {label}
            </Text>
            <Text style={{ width: "60%", fontSize: 8, color: C.NAVY }}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      {/* Final confidential notice */}
      <View style={{
        backgroundColor: "#FFF1F2",
        borderWidth: 1,
        borderColor: "#FECDD3",
        borderRadius: 6,
        padding: 10,
        marginTop: 8,
      }}>
        <Text style={{ fontSize: 7.5, color: C.ROSE, fontFamily: "Helvetica-Bold", marginBottom: 3 }}>
          CONFIDENTIALITY NOTICE
        </Text>
        <Text style={{ fontSize: 7.5, color: "#9F1239", lineHeight: 1.6 }}>
          This document contains confidential and proprietary information belonging to {employee.entity} and its affiliates.
          It is intended solely for the use of authorised HR personnel. Any reproduction, distribution, or disclosure
          of this information to unauthorised parties is strictly prohibited.
        </Text>
      </View>
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function EmployeeAppraisalTemplate({
  employee,
}: {
  employee: ExportEmployee;
}) {
  const assessment = employee.assessment;

  return (
    <Document
      title={`Talent Assessment Report — ${employee.name} — ${assessment.cycle}`}
      author={employee.entity}
      subject="Confidential Talent Assessment Report"
      creator="Talent Management Platform"
      producer="Talent Management Platform"
    >
      <CoverPage       employee={employee} assessment={assessment} />
      <SummaryPage     employee={employee} assessment={assessment} />
      <CompetencyPage  employee={employee} assessment={assessment} />
      <FeedbackPage    employee={employee} assessment={assessment} />
    </Document>
  );
}
