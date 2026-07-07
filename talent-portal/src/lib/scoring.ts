// ─────────────────────────────────────────────────────────────────────────────
// SCORING ENGINE — Verbatim from existing frontend, now typed + server-safe
// ─────────────────────────────────────────────────────────────────────────────

export type SectionKey = "ability" | "aspiration" | "leadership";

export type ScoresMap = Record<SectionKey, Record<string, number>>;

export interface SectionScoreResult {
  sum: number;
  counted: number;
  totalInSchema: number;
}

export interface TalentClassification {
  /** The display-facing category label */
  category: "High Potential (HiPo)" | "Promotable/Expandable" | "Well-placed" | "Pending Rating";
  description: string;
  /**
   * True when the employee's grand total was in the HiPo range (≥ 37) but
   * they have 3 or more sub-dimensions rated 1 or 2. Their displayed category
   * becomes "Promotable/Expandable" but they are internally tagged as a
   * HiPo Exception for HR tracking and filtering.
   */
  isHiPoException?: boolean;
}

const SECTION_INDICATORS: Record<SectionKey, string[]> = {
  ability: ["1.1", "1.2", "1.3", "1.4"],
  aspiration: ["2.1", "2.2", "2.3", "2.4"],
  leadership: ["3.1", "3.2", "3.3", "3.4"],
};

export function calculateSectionScore(
  section: SectionKey,
  scoresObj: Partial<ScoresMap>
): SectionScoreResult {
  const indicators = SECTION_INDICATORS[section];
  let total = 0;
  let counted = 0;

  indicators.forEach((id) => {
    const val = scoresObj[section]?.[id];
    if (val !== undefined && val !== null && val !== 0) {
      total += Number(val);
      counted++;
    }
  });

  return { sum: total, counted, totalInSchema: indicators.length };
}

export function getLowScoresCount(scores: Partial<ScoresMap>): number {
  return getLowScoreDetails(scores).length;
}

export function getLowScoreDetails(scores: Partial<ScoresMap>): { id: string; section: SectionKey }[] {
  const lowScores: { id: string; section: SectionKey }[] = [];
  const sections: SectionKey[] = ["ability", "aspiration", "leadership"];
  
  sections.forEach(section => {
    Object.entries(scores[section] || {}).forEach(([id, val]) => {
      if (val !== undefined && val !== null && Number(val) < 3) {
        lowScores.push({ id, section });
      }
    });
  });
  
  return lowScores;
}

export function getTalentClassification(
  totalScore: number
): TalentClassification {
  if (totalScore === 0) {
    return {
      category: "Pending Rating",
      description: "Complete evaluation indicators to compute classification.",
    };
  }

  if (totalScore >= 37) {
    return {
      category: "High Potential (HiPo)",
      description:
        "Has the potential to move 1-2 levels up. Excels across all three pillars. Can be considered for promotion immediately, if other promotion criteria are met. Should receive broad organizational exposure, executive mentorship, and rapid development paths.",
    };
  } else if (totalScore >= 24) {
    return {
      category: "Promotable/Expandable",
      description:
        "Has the potential to move 1 level up with targeted development. Can be considered for larger roles at the same responsibility level immediately. Should receive coaching/mentoring to address the specific gaps on aspects of ability, aspiration or leadership to enable development towards higher-level roles.",
    };
  } else {
    return {
      category: "Well-placed",
      description:
        "Not yet ready for larger roles. Consider job enrichment, deep specialization, and retention if the performance is good.",
    };
  }
}

export function computeFullAssessmentResult(scores: Partial<ScoresMap>) {
  const ab = calculateSectionScore("ability", scores);
  const asp = calculateSectionScore("aspiration", scores);
  const lead = calculateSectionScore("leadership", scores);
  const grandTotal = ab.sum + asp.sum + lead.sum;
  
  let classification = getTalentClassification(grandTotal);
  const lowScoreDetails = getLowScoreDetails(scores);

  // ── HiPo Exception Rule ───────────────────────────────────────────────────
  // If the employee's score qualifies as HiPo (≥ 37) BUT they have 3 or more
  // sub-dimensions rated 1 or 2, their final display category becomes
  // Promotable/Expandable and they are flagged as a HiPo Exception.
  // ─────────────────────────────────────────────────────────────────────────
  if (grandTotal >= 37 && lowScoreDetails.length >= 3) {
    classification = {
      category: "Promotable/Expandable",
      description:
        "This employee's total score falls in the High Potential range, but they have 3 or more sub-dimensions rated 1 or 2. As a result their classification is Promotable/Expandable (HiPo Exception). Review the low-scoring indicators and update ratings if appropriate.",
      isHiPoException: true,
    };
  }

  return {
    abilitySum: ab.sum,
    aspirationSum: asp.sum,
    leadershipSum: lead.sum,
    grandTotal,
    classification,
    lowScoreDetails,
  };
}
