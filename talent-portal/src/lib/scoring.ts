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
  category: "High Potential (HiPo)" | "Promotable/Expandable" | "Well-placed" | "Pending Rating";
  description: string;
  forcedExclusion?: boolean;
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
  let lowCount = 0;
  const allScores = {
    ...(scores.ability ?? {}),
    ...(scores.aspiration ?? {}),
    ...(scores.leadership ?? {}),
  };
  Object.values(allScores).forEach((val) => {
    if (val !== undefined && val !== null && Number(val) < 3) {
      lowCount++;
    }
  });
  return lowCount;
}

export function getTalentClassification(
  totalScore: number,
  lowScoresCount: number
): TalentClassification {
  if (totalScore === 0) {
    return {
      category: "Pending Rating",
      description: "Complete evaluation indicators to compute classification.",
    };
  }

  if (lowScoresCount > 2) {
    if (totalScore >= 37) {
      return {
        category: "Promotable/Expandable",
        description:
          "Excluded from High Potential (HiPo) status due to scoring below 3 on more than 2 sub-dimensions. Strong performance aggregate, but requires targeted development on specific behavior blocks.",
        forcedExclusion: true,
      };
    }
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
        "Has the potential to move 1 level up with targeted development. Can be considered for larger roles at the same responsibility level immediately. Should receive coaching/mentoring to address the specific gaps on aspects of ability, aspiration or leadership.",
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
  const lowScoresCount = getLowScoresCount(scores);
  const classification = getTalentClassification(grandTotal, lowScoresCount);

  return {
    abilitySum: ab.sum,
    aspirationSum: asp.sum,
    leadershipSum: lead.sum,
    grandTotal,
    lowScoresCount,
    classification,
  };
}
