"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { SUB_DIMENSIONS } from "@/lib/constants";

// Register fonts if needed, currently using default Helvetica
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    color: "#0f172a",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4f46e5",
    marginBottom: 8,
    backgroundColor: "#e0e7ff",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "30%",
    fontSize: 10,
    color: "#475569",
    fontWeight: "bold",
  },
  value: {
    width: "70%",
    fontSize: 10,
    color: "#0f172a",
  },
  scoreBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  scoreItem: {
    flexDirection: "column",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 10,
    color: "#64748b",
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 4,
  },
  comment: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.5,
    marginTop: 5,
  },
  pageBreak: {
    marginBottom: 20,
  },
  managerHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 10,
    marginTop: 20,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: "#4f46e5",
  }
});

function EmployeeReport({ assessment }: { assessment: any }) {
  return (
    <View style={styles.pageBreak} break>
      <View style={styles.header}>
        <Text style={styles.title}>Talent Assessment Report</Text>
        <Text style={styles.subtitle}>FY2026 Cycle</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{assessment.employee.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>{assessment.employee.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Designation:</Text>
          <Text style={styles.value}>{assessment.employee.designation}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Department:</Text>
          <Text style={styles.value}>{assessment.employee.department}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{assessment.employee.location}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Manager:</Text>
          <Text style={styles.value}>{assessment.submittedBy?.name || assessment.employee.managerEmail}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Final Classification</Text>
        <View style={styles.scoreBox}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            <Text style={styles.scoreValue}>{assessment.overallScore} / 4.0</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>HiPo Status</Text>
            <Text style={styles.scoreValue}>{assessment.hipoStatus}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Promotability</Text>
            <Text style={styles.scoreValue}>{assessment.promotability}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Placement</Text>
            <Text style={styles.scoreValue}>{assessment.wellPlaced}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manager Comments</Text>
        <Text style={styles.comment}>{assessment.managerComments}</Text>
      </View>
    </View>
  );
}

export function AssessmentReportPDF({ data, mode }: { data: any[], mode: "single" | "clubbed" }) {
  if (mode === "clubbed") {
    // Group by manager
    const grouped = data.reduce((acc, curr) => {
      const managerEmail = curr.employee.managerEmail;
      if (!acc[managerEmail]) acc[managerEmail] = [];
      acc[managerEmail].push(curr);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <Document>
        {(Object.entries(grouped) as [string, any[]][]).map(([manager, assessments]) => (
          <Page size="A4" style={styles.page} key={manager}>
            <Text style={styles.managerHeader}>Manager: {assessments[0].submittedByUser?.name || manager}</Text>
            <Text style={styles.subtitle}>Total Direct Reports Evaluated: {assessments.length}</Text>
            {assessments.map((assessment: any) => (
              <EmployeeReport key={assessment.id} assessment={assessment} />
            ))}
          </Page>
        ))}
      </Document>
    );
  }

  return (
    <Document>
      {data.map(assessment => (
        <Page size="A4" style={styles.page} key={assessment.id}>
          <EmployeeReport assessment={assessment} />
        </Page>
      ))}
    </Document>
  );
}
