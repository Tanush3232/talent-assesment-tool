"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assessmentSubmitSchema } from "@/lib/validators";
import { SUB_DIMENSIONS, getClassificationTheme } from "@/lib/constants";
import { calculateSectionScore, computeFullAssessmentResult, getUniformSectionRating, type SectionKey } from "@/lib/scoring";
import { saveAssessmentDraft, submitAssessment } from "@/app/actions/assessment";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Save, Send, AlertCircle, RefreshCw, Lock, AlertTriangle, XCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS_ORDER = ["guidelines", "ability", "aspiration", "leadership", "overall"] as const;
const isSectionKey = (tab: string): tab is SectionKey =>
  tab === "ability" || tab === "aspiration" || tab === "leadership";

type AssessmentFormProps = {
  employee: any;
  initialData?: any;
  isReadOnly?: boolean;
};

const METRICS_MAP: Record<string, { title: string; label: string; desc: string }> = {
  ability: { title: "Section 1: Ability", label: "Cognitive Capacity", desc: "Cognitive capacity, agility, and emotional intelligence required for complex, higher-level roles" },
  aspiration: { title: "Section 2: Aspiration", label: "Internal Drive", desc: "Drive, ambition, and motivation for taking on significantly larger responsibilities" },
  leadership: { title: "Section 3: Leadership", label: "Discretionary Effort", desc: "Influence, resilience, and capability to build organizations and lead large teams" },
};

export default function AssessmentForm({ employee, initialData, isReadOnly = false }: AssessmentFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("guidelines");
  const [attemptNext, setAttemptNext] = useState<Record<string, boolean>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(
    initialData?.updatedAt ? new Date(initialData.updatedAt) : null
  );

  // Separate state for selected ratings — avoids react-hook-form dot-path bug ("1.1" parsed as nested path)
  const [selectedScores, setSelectedScores] = useState<Record<string, Record<string, number>>>(() => ({
    ability: initialData?.scores?.ability || {},
    aspiration: initialData?.scores?.aspiration || {},
    leadership: initialData?.scores?.leadership || {},
  }));
  const latestScoresRef = useRef(selectedScores);
  latestScoresRef.current = selectedScores;

  const isSavingRef = useRef(false);
  const pendingResaveRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showLowScoreModal, setShowLowScoreModal] = useState(false);
  const [modalItems, setModalItems] = useState<any[]>([]);
  // Ephemeral per-visit acknowledgment so Leaving/Next Session re-arms the warning
  const [acknowledgedUniform, setAcknowledgedUniform] = useState<Partial<Record<SectionKey, boolean>>>({});
  const [uniformPrompt, setUniformPrompt] = useState<{
    section: SectionKey;
    rating: number;
    targetTab: string;
  } | null>(null);

  const defaultValues = {
    scores: {
      ability: initialData?.scores?.ability || {},
      aspiration: initialData?.scores?.aspiration || {},
      leadership: initialData?.scores?.leadership || {},
    },
    evidence: initialData?.evidence
      ? Object.fromEntries(Object.entries(initialData.evidence).map(([k, v]) => [k.replace(".", "_"), v]))
      : {},
    managerComments: initialData?.managerComments || "",
  };

  const form = useForm<any>({
    defaultValues,
    mode: "onChange",
  });

  const { watch, control, handleSubmit, formState: { errors } } = form;
  const watchEvidence = watch("evidence");
  const watchComments = watch("managerComments");

  // Scores & classification — use selectedScores (reliable) not watchScores (path bug)
  const abilityScore = calculateSectionScore("ability", selectedScores).sum;
  const aspirationScore = calculateSectionScore("aspiration", selectedScores).sum;
  const leadershipScore = calculateSectionScore("leadership", selectedScores).sum;
  const result = computeFullAssessmentResult(selectedScores);
  const overallScore = result.grandTotal;
  const hipoStatus = result.classification.category;

  useEffect(() => {
    if (showLowScoreModal) {
      setModalItems(result.lowScoreDetails || []);
    } else {
      setModalItems([]);
    }
  }, [showLowScoreModal]);
  
  // Section completion check
  const checkSectionComplete = (categoryId: SectionKey) =>
    SUB_DIMENSIONS[categoryId].every((q) => {
      const score = selectedScores[categoryId]?.[q.id];
      const hasScore = typeof score === "number" && score >= 1 && score <= 4;
      const evLen = (watchEvidence?.[q.id.replace(".", "_")] || "").trim().length;
      return hasScore && evLen >= 40 && evLen <= 150;
    });

  const isAbilityComplete = checkSectionComplete("ability");
  const isAspirationComplete = checkSectionComplete("aspiration");
  const isLeadershipComplete = checkSectionComplete("leadership");

  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = (current: string) => {
    const idx = TABS_ORDER.indexOf(current as (typeof TABS_ORDER)[number]);
    if (idx >= 0 && idx < TABS_ORDER.length - 1) navigateToTab(TABS_ORDER[idx + 1]);
  };
  const handleBack = (current: string) => {
    const idx = TABS_ORDER.indexOf(current as (typeof TABS_ORDER)[number]);
    if (idx > 0) navigateToTab(TABS_ORDER[idx - 1]);
  };

  const handleForwardFromSection = (fromSection: SectionKey, targetTab: string) => {
    setAttemptNext((prev) => ({ ...prev, [fromSection]: true }));
    if (!checkSectionComplete(fromSection)) {
      toast.error("Please complete all ratings and ensure evidence is 40–150 characters for each indicator.");
      return;
    }
    const uniformRating = !isReadOnly ? getUniformSectionRating(fromSection, selectedScores) : null;
    if (uniformRating !== null && !acknowledgedUniform[fromSection]) {
      setUniformPrompt({ section: fromSection, rating: uniformRating, targetTab });
      return;
    }
    navigateToTab(targetTab);
  };

  const handleNextAction = (categoryId: SectionKey) => {
    const idx = TABS_ORDER.indexOf(categoryId);
    if (idx >= 0 && idx < TABS_ORDER.length - 1) {
      handleForwardFromSection(categoryId, TABS_ORDER[idx + 1]);
    }
  };

  const handleTabChange = (nextTab: string) => {
    if (nextTab === activeTab) return;
    const currentIdx = TABS_ORDER.indexOf(activeTab as (typeof TABS_ORDER)[number]);
    const nextIdx = TABS_ORDER.indexOf(nextTab as (typeof TABS_ORDER)[number]);
    if (nextIdx > currentIdx && isSectionKey(activeTab)) {
      handleForwardFromSection(activeTab, nextTab);
      return;
    }
    navigateToTab(nextTab);
  };

  const handleDismissUniformModal = () => {
    if (!uniformPrompt) return;
    const { section } = uniformPrompt;
    setAcknowledgedUniform((prev) => ({ ...prev, [section]: true }));
    setUniformPrompt(null);
  };

  const handleContinueUniformModal = () => {
    if (!uniformPrompt) return;
    const { section, targetTab } = uniformPrompt;
    setAcknowledgedUniform((prev) => ({ ...prev, [section]: true }));
    setUniformPrompt(null);
    navigateToTab(targetTab);
  };

  const buildDraftPayload = useCallback((raw: any) => {
    const cleanEvidence = Object.fromEntries(
      Object.entries(raw?.evidence || {})
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => [k.replace("_", "."), v])
    );
    return {
      scores: latestScoresRef.current,
      evidence: cleanEvidence,
      managerComments: typeof raw?.managerComments === "string" ? raw.managerComments : "",
    };
  }, []);

  const handleSaveDraft = useCallback(async (data?: any, silent = false) => {
    if (isReadOnly) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (isSavingRef.current) {
      pendingResaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const payload = buildDraftPayload(data ?? form.getValues());
      await saveAssessmentDraft(employee.id, payload);
      setLastSaved(new Date());
      if (!silent) toast.success("Draft saved successfully");
    } catch {
      if (!silent) toast.error("Failed to save draft");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      if (pendingResaveRef.current) {
        pendingResaveRef.current = false;
        void handleSaveDraft(undefined, true);
      }
    }
  }, [buildDraftPayload, employee.id, form, isReadOnly]);

  const scheduleAutoSave = useCallback(() => {
    if (isReadOnly) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void handleSaveDraft(undefined, true);
    }, 1200);
  }, [handleSaveDraft, isReadOnly]);

  // Auto-save whenever any form text field (evidence or partial managerComments) changes
  useEffect(() => {
    if (isReadOnly) return;
    const subscription = watch((_values, { type }) => {
      if (type) scheduleAutoSave();
    });
    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isReadOnly, scheduleAutoSave, watch]);

  const updateScore = useCallback((categoryId: SectionKey, subId: string, rating: number) => {
    if (isReadOnly) return;
    if (latestScoresRef.current[categoryId]?.[subId] === rating) return;
    const next = {
      ...latestScoresRef.current,
      [categoryId]: { ...latestScoresRef.current[categoryId], [subId]: rating },
    };
    latestScoresRef.current = next;
    setSelectedScores(next);
    setAcknowledgedUniform((prev) => {
      if (!prev[categoryId]) return prev;
      const updated = { ...prev };
      delete updated[categoryId];
      return updated;
    });
    form.setValue(`scores.${categoryId}.${subId.replace(".", "_")}`, rating, {
      shouldValidate: true,
      shouldDirty: true,
    });
    scheduleAutoSave();
  }, [form, isReadOnly, scheduleAutoSave]);

  const onSubmit = async (data: any) => {
    if (isReadOnly) return;
    
    if (!isAbilityComplete || !isAspirationComplete || !isLeadershipComplete) {
      setAttemptNext({ ability: true, aspiration: true, leadership: true });
      toast.error("Please complete all sections before submitting.");
      return;
    }
    
    const commentsLen = (data.managerComments || "").trim().length;
    if (commentsLen < 40 || commentsLen > 100) {
      toast.error("Manager comments must be between 40 and 100 characters.");
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsSubmitting(true);
    const payload = {
      ...data,
      scores: latestScoresRef.current,
      evidence: data.evidence
        ? Object.fromEntries(
            Object.entries(data.evidence)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k.replace("_", "."), v])
          )
        : {},
    };
    try {
      await submitAssessment(employee.id, payload);
      toast.success("Assessment submitted successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rating buttons — inline styles bypass Tailwind purging
  const renderRatingButtons = (categoryId: "ability" | "aspiration" | "leadership", subId: string) => (
    <div style={{ display: "flex", gap: "8px" }}>
      {[1, 2, 3, 4].map((rating) => {
        const isSelected = selectedScores[categoryId]?.[subId] === rating;
        return (
          <button
            key={rating}
            type="button"
            disabled={isReadOnly}
            style={
              isSelected
                ? {
                    border: "3px solid #1e3a8a",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    boxShadow: "0 0 0 2px #bfdbfe",
                    borderRadius: "8px",
                    width: "44px",
                    height: "44px",
                    fontSize: "1rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }
                : {
                    border: "1.5px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#64748b",
                    borderRadius: "8px",
                    width: "44px",
                    height: "44px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: isReadOnly ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }
            }
            onClick={() => {
              if (!isSelected && !isReadOnly) {
                updateScore(categoryId, subId, rating);
              }
            }}
          >
            {rating}
          </button>
        );
      })}
    </div>
  );

  // Bottom action bar shared by all sections
  const renderBottomActions = (categoryId: string, isSection = true) => (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => handleBack(categoryId)} className="text-slate-600 border-slate-200 hover:bg-slate-50">
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveDraft(form.getValues())}
              disabled={isSaving || isSubmitting}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Draft
            </Button>
          )}
          {isSection ? (
            <Button
              type="button"
              className="bg-indigo-900 hover:bg-indigo-950 text-white"
              onClick={() => handleNextAction(categoryId as "ability" | "aspiration" | "leadership")}
            >
              Next →
            </Button>
          ) : (
            !isReadOnly && (
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => {
                  if (!isAbilityComplete || !isAspirationComplete || !isLeadershipComplete) {
                    setAttemptNext({ ability: true, aspiration: true, leadership: true });
                  }
                }}
                className="bg-indigo-900 hover:bg-indigo-950 text-white"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );

  const renderSection = (categoryId: "ability" | "aspiration" | "leadership") => {
    const questions = SUB_DIMENSIONS[categoryId];
    const catScore =
      categoryId === "ability" ? abilityScore : categoryId === "aspiration" ? aspirationScore : leadershipScore;
    const meta = METRICS_MAP[categoryId];

    return (
      <TabsContent value={categoryId} className="mt-0 animate-in fade-in duration-300">
        {/* Clean section header */}
        <div className="px-1 pt-6 pb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{meta.label}</p>
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-slate-900">{meta.title}</h2>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900">{catScore}</span>
              <span className="text-slate-400 text-base"> / 16</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1">{meta.desc}</p>
        </div>

        {/* Scale legend */}
        <div className="flex gap-4 mb-5 px-1 flex-wrap">
          {["1 = Rarely/Never", "2 = Sometimes", "3 = Most of the time", "4 = Consistently"].map((label) => (
            <span key={label} className="text-xs text-slate-400 font-medium">{label}</span>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q) => {
            const hasScore = selectedScores[categoryId]?.[q.id] !== undefined;
            const evLength = (watchEvidence?.[q.id.replace(".", "_")] || "").trim().length;
            const isValidEv = evLength >= 40 && evLength <= 150;
            const showEmptyError = attemptNext[categoryId] && (!hasScore || !isValidEv);

            const cardBorder = showEmptyError
              ? "border-red-400"
              : hasScore && isValidEv
              ? "border-emerald-400"
              : hasScore
              ? "border-indigo-300"
              : "border-slate-200";

            return (
              <div
                key={q.id}
                className={`bg-white rounded-xl border ${cardBorder} transition-colors`}
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              >
                {/* Question header row */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: question content */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Indicator {q.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5 mb-1.5">{q.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{q.description}</p>
                    </div>

                    {/* Right: score buttons */}
                    <div className="shrink-0 flex flex-col items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                      {renderRatingButtons(categoryId, q.id)}
                      {showEmptyError && !hasScore && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3" /> Required
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence area */}
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor={`evidence-${q.id}`} className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Evidence / Behavior Observed <span className="text-red-500">*</span>
                    </Label>
                    <span
                      className={`text-xs font-medium flex items-center gap-1 ${
                        isValidEv ? "text-emerald-600" : evLength > 0 ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      {evLength} / 40–150
                      {isValidEv ? <CheckCircle2 className="w-3 h-3" /> : evLength > 0 ? <XCircle className="w-3 h-3" /> : null}
                    </span>
                  </div>
                  <Controller
                    name={`evidence.${q.id.replace(".", "_")}`}
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        id={`evidence-${q.id}`}
                        disabled={isReadOnly}
                        placeholder="Describe specific situations, actions taken, and results achieved..."
                        className={`min-h-[100px] resize-y text-sm ${
                          !isValidEv && (evLength > 0 || showEmptyError)
                            ? "bg-red-50 border-red-300 focus:border-red-400"
                            : "bg-slate-50 border-slate-200 focus:border-indigo-400"
                        }`}
                      />
                    )}
                  />
                  {!isValidEv && (evLength > 0 || showEmptyError) && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {evLength === 0 ? "Evidence is required." : "Must be between 40 and 150 characters."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {renderBottomActions(categoryId, true)}
      </TabsContent>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* ── Sidebar ── */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border border-slate-200 sticky top-[108px]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Avatar */}
          <div className="flex flex-col items-center text-center px-5 pt-6 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <span className="text-2xl font-bold text-slate-400">{employee.name.charAt(0)}</span>
            </div>
            <p className="font-bold text-slate-900 text-base leading-tight">{employee.name}</p>
            <p className="text-xs text-indigo-700 font-semibold mt-0.5">{employee.designation}</p>
          </div>

          {/* Employee meta */}
          <div className="px-5 py-4 space-y-2.5 text-sm">
            {[
              { label: "ID", value: employee.id },
              { label: "Department", value: employee.department },
              { label: "Location", value: employee.location },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-2">
                <span className="text-slate-400 shrink-0">{label}</span>
                <span className="font-medium text-slate-800 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main form ── */}
      <div className="lg:col-span-3">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            {/* ── Tabs Navigation Card (Not sticky, white background) ── */}
            <div className="bg-white border border-slate-200 rounded-xl mb-6 shadow-sm overflow-hidden p-2">
              <TabsList 
                variant="line" 
                style={{ height: 'auto' }}
                className="w-full grid grid-cols-5 bg-transparent rounded-none p-0 border-0 gap-2"
              >
                {[
                  { value: "guidelines", label: "Guidelines", sublabel: "Verbatim Scope", icon: <Lock className="w-3.5 h-3.5" />, disabled: false },
                  { value: "ability", label: "1. Ability", sublabel: "Cognitive Capacity", icon: isAbilityComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-data-[active]:text-indigo-200" /> : <Lock className="w-3.5 h-3.5" />, disabled: false },
                  { value: "aspiration", label: "2. Aspiration", sublabel: "Internal Drive", icon: isAspirationComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-data-[active]:text-indigo-200" /> : <Lock className="w-3.5 h-3.5" />, disabled: !isAbilityComplete },
                  { value: "leadership", label: "3. Leadership", sublabel: "Discretionary Effort", icon: isLeadershipComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 group-data-[active]:text-indigo-200" /> : <Lock className="w-3.5 h-3.5" />, disabled: !isAbilityComplete || !isAspirationComplete },
                  { value: "overall", label: "Summary", sublabel: "Classification", icon: <CheckCircle2 className="w-3.5 h-3.5" />, disabled: !isAbilityComplete || !isAspirationComplete || !isLeadershipComplete },
                ].map((tab) => {
                  const isTabSelected = activeTab === tab.value;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      disabled={tab.disabled}
                      style={isTabSelected ? {
                        height: 'auto',
                        backgroundColor: '#1e3a8a',
                        color: '#ffffff',
                        borderColor: '#1e3a8a',
                      } : {
                        height: 'auto',
                        backgroundColor: '#ffffff',
                        color: '#64748b',
                        borderColor: '#e2e8f0',
                      }}
                      className={cn(
                        "group px-4 py-3.5 flex flex-col items-start text-left rounded-lg border transition-all disabled:opacity-40 cursor-pointer after:!opacity-0",
                        !isTabSelected && "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between w-full gap-1.5 mb-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest truncate",
                          isTabSelected ? "text-blue-200" : "text-slate-400"
                        )}>
                          {tab.sublabel}
                        </span>
                        <span className={cn(
                          "shrink-0",
                          isTabSelected ? "text-blue-200" : "text-slate-300"
                        )}>
                          {tab.icon}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[13px] font-bold mt-0.5",
                        isTabSelected ? "text-white" : "text-slate-700"
                      )}>
                        {tab.label}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* ── Guidelines Tab ── */}
            <TabsContent value="guidelines" className="mt-0 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="px-8 py-6 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Assessment Framework</p>
                  <h2 className="text-xl font-bold text-slate-900">Potential Evaluation Guidelines</h2>
                </div>
                <div className="px-8 py-6 space-y-8">
                  {/* Section 1 */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center justify-center">1</span>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Purpose & Scope</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-5 py-4">
                      This framework helps leaders identify and calibrate employee potential beyond current performance. Potential refers to the likelihood, trajectory, and readiness of an employee to take on broader, more complex, and significantly different responsibilities in the future. Evaluate the individual based on observable behaviors over the past 12–18 months.
                    </p>
                  </section>

                  {/* Section 2 */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center justify-center">2</span>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Behavioral Evaluation Scale (1–4)</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { n: 1, label: "Rarely / Never", color: "#94a3b8", bg: "#f8fafc" },
                        { n: 2, label: "Sometimes", color: "#6366f1", bg: "#eef2ff" },
                        { n: 3, label: "Most of the time", color: "#059669", bg: "#ecfdf5" },
                        { n: 4, label: "Consistently", color: "#d97706", bg: "#fffbeb" },
                      ].map(({ n, label, color, bg }) => (
                        <div key={n} className="rounded-lg border border-slate-100 p-4 text-center" style={{ background: bg }}>
                          <p className="text-3xl font-black mb-1" style={{ color, opacity: 0.5 }}>{n}</p>
                          <p className="text-xs font-bold text-slate-700">{label}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Section 3 */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center justify-center">3</span>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Potential Classification</h3>
                    </div>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Definition</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="px-5 py-3 font-bold text-emerald-600 whitespace-nowrap">37 – 48</td>
                            <td className="px-5 py-3 font-semibold text-slate-900">High Potential (HiPo)</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">Can move 1–2 levels up. Excels across all three pillars. Immediate promotion candidate.</td>
                          </tr>
                          <tr>
                            <td className="px-5 py-3 font-bold text-indigo-600 whitespace-nowrap">24 – 36</td>
                            <td className="px-5 py-3 font-semibold text-slate-900">Promotable / Expandable</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">Can move 1 level up with targeted development. Coaching recommended for gaps.</td>
                          </tr>
                          <tr>
                            <td className="px-5 py-3 font-bold text-slate-500 whitespace-nowrap">Below 24</td>
                            <td className="px-5 py-3 font-semibold text-slate-900">Well-placed</td>
                            <td className="px-5 py-3 text-slate-500 text-xs">Not yet ready for larger roles. Consider job enrichment and deep specialization.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <div className="flex justify-end pt-2">
                    <Button type="button" className="bg-indigo-900 hover:bg-indigo-950 text-white" onClick={() => handleNext("guidelines")}>
                      Start Assessment →
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {renderSection("ability")}
            {renderSection("aspiration")}
            {renderSection("leadership")}

            {/* ── Summary Tab ── */}
            <TabsContent value="overall" className="mt-0 animate-in fade-in duration-300">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="px-8 py-6 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Classification Summary</p>
                  <h2 className="text-xl font-bold text-slate-900">Summary & Verification</h2>
                  <p className="text-sm text-slate-500 mt-1">Review the final potential calculations and provide qualitative justification.</p>
                </div>

                <div className="px-8 py-6 space-y-6">
                  {/* Score cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Ability", val: abilityScore, max: 16 },
                      { label: "Aspiration", val: aspirationScore, max: 16 },
                      { label: "Leadership", val: leadershipScore, max: 16 },
                    ].map(({ label, val, max }) => (
                      <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-2xl font-black text-slate-800">{val}<span className="text-slate-300 text-sm font-medium"> / {max}</span></p>
                      </div>
                    ))}
                    <div className="bg-indigo-900 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Grand Total</p>
                      <p className="text-2xl font-black text-white">{overallScore}<span className="text-indigo-400 text-sm font-medium"> / 48</span></p>
                    </div>
                  </div>

                  {/* Classification result */}
                  {(() => {
                    const clsUi = getClassificationTheme(hipoStatus).ui;
                    return (
                      <div className={`rounded-xl border p-5 ${result.classification.isHiPoException ? "border-amber-200 bg-amber-50/40" : clsUi.card}`}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Official Potential Classification</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className={`text-2xl font-black ${result.classification.isHiPoException ? "text-amber-800" : clsUi.cardText}`}>
                            {hipoStatus}
                          </p>
                          {result.classification.isHiPoException && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 border border-amber-300 text-amber-700 px-2.5 py-1 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              HiPo Exception
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── HiPo Exception Warning Banner ── */}
                  {result.classification.isHiPoException && (
                    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 flex gap-3 items-start shadow-sm mt-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-amber-800 leading-snug">
                          HiPo Exception Detected
                        </p>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          Total score qualifies as <strong>High Potential (HiPo)</strong>, but <strong>{result.lowScoreDetails.length} sub-dimensions</strong> are rated 1 or 2. Final classification is downgraded to <strong>Promotable/Expandable</strong>. You can use the{" "}
                          <button
                            type="button"
                            onClick={() => setShowLowScoreModal(true)}
                            className="underline font-bold text-amber-900 hover:text-amber-950"
                          >
                            Show Result
                          </button>{" "}
                          button below to review the ratings.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Clean banner for low scores count */}
                  {(() => {
                    const lowScoresCount = result.lowScoreDetails ? result.lowScoreDetails.length : 0;
                    return (
                      <>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                          <span className="text-sm font-semibold text-slate-700">
                            Sub-dimensions scoring below Rating 3:
                          </span>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className="bg-slate-100 border-slate-200 text-slate-700 font-mono text-sm px-2.5 py-0.5 rounded-md"
                            >
                              {lowScoresCount} detected
                            </Badge>
                            {lowScoresCount > 0 && (
                              <Button 
                                type="button" 
                                size="sm"
                                variant="outline"
                                onClick={() => setShowLowScoreModal(true)}
                                className="text-xs h-7 px-2.5 border-slate-200 text-slate-600 hover:bg-slate-100"
                              >
                                Show Result
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* ── Modal Popup for Low Score Details ── */}
                        {showLowScoreModal && modalItems.length > 0 && (
                          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              {/* Header */}
                              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    Indicators Scoring Below Rating 3
                                  </h3>
                                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                                    Detailed Inspection Sheet for Behavior Evidence
                                  </p>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setShowLowScoreModal(false)}
                                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                                >
                                  ✕
                                </button>
                              </div>
                              
                              {/* Body (Table Layout) */}
                              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                        <th className="px-4 py-3 w-[15%]">Section</th>
                                        <th className="px-4 py-3 w-[30%]">Subdimension</th>
                                        <th className="px-4 py-3 w-[15%]">Rating</th>
                                        <th className="px-4 py-3 w-[40%]">Evidence / Justification Text</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150 text-sm">
                                      {modalItems.map((item: any, i: number) => {
                                        const sectionItems = SUB_DIMENSIONS[item.section as "ability" | "aspiration" | "leadership"];
                                        const question = sectionItems.find((q) => q.id === item.id);
                                        const rating = selectedScores[item.section as keyof typeof selectedScores]?.[item.id] || 1;
                                        
                                        const evKey = item.id.replace(".", "_");
                                        const evVal = watchEvidence?.[evKey] || "";
                                        const evLen = evVal.trim().length;
                                        const isValidEv = evLen >= 40 && evLen <= 150;

                                        return (
                                          <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                                            {/* Section */}
                                            <td className="px-4 py-4 font-bold text-slate-700 capitalize align-top text-xs tracking-wider">
                                              {item.section}
                                            </td>

                                            {/* Subdimension info */}
                                            <td className="px-4 py-4 align-top">
                                              <div className="space-y-1">
                                                <span className="inline-block bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-bold px-2 py-0.5 rounded">
                                                  Indicator {item.id}
                                                </span>
                                                <div className="font-extrabold text-slate-900 text-[13px]">{question?.title}</div>
                                              </div>
                                            </td>

                                            {/* Rating Dropdown */}
                                            <td className="px-4 py-4 align-top">
                                              <select
                                                value={rating}
                                                disabled={isReadOnly}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value, 10);
                                                  updateScore(
                                                    item.section as "ability" | "aspiration" | "leadership",
                                                    item.id,
                                                    val
                                                  );
                                                }}
                                                className={cn(
                                                  "w-14 h-9 font-bold rounded-lg focus:outline-none focus:ring-2 cursor-pointer text-xs pl-3.5 pr-2 border transition-all",
                                                  rating < 3
                                                    ? "text-amber-600 bg-amber-50 border-amber-300 focus:ring-amber-500/20 focus:border-amber-400"
                                                    : "text-emerald-600 bg-emerald-50 border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-400"
                                                )}
                                              >
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                                <option value="4">4</option>
                                              </select>
                                            </td>

                                            {/* Evidence Textarea editor */}
                                            <td className="px-4 py-4 align-top">
                                              <div className="space-y-1">
                                                <Textarea
                                                  value={evVal}
                                                  disabled={isReadOnly}
                                                  onChange={(e) => {
                                                    form.setValue(`evidence.${evKey}`, e.target.value, {
                                                      shouldValidate: true,
                                                      shouldDirty: true,
                                                    });
                                                  }}
                                                  placeholder="Describe observed situations, actions, and results..."
                                                  className={cn(
                                                    "w-full min-h-[60px] max-h-[140px] p-2 text-xs font-medium leading-relaxed bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white resize-y transition-all rounded-lg",
                                                    !isValidEv && evLen > 0 
                                                      ? "bg-red-50 border-red-300 focus:border-red-400 focus:ring-red-400/20 text-red-950" 
                                                      : "text-slate-800"
                                                  )}
                                                />
                                                <div className="flex justify-between items-center text-[10px] font-bold mt-1 px-1">
                                                  <span className="text-slate-400">Range: 40-150 chars</span>
                                                  <span className={cn(
                                                    isValidEv ? "text-emerald-600" : (evLen > 0 ? "text-red-500" : "text-slate-400")
                                                  )}>
                                                    {evLen} / 40–150
                                                  </span>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              
                              {/* Footer Actions */}
                              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <Button 
                                  type="button" 
                                  onClick={() => setShowLowScoreModal(false)}
                                  className="bg-indigo-900 hover:bg-indigo-950 text-white text-xs h-8 px-4 font-bold rounded-lg shadow-sm"
                                >
                                  Close
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Manager comments */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                      <Label htmlFor="managerComments" className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Manager's Justification & Comments <span className="text-red-500">*</span>
                      </Label>
                      {(() => {
                        const commentsLength = (watchComments || "").trim().length;
                        const isValidComments = commentsLength >= 40 && commentsLength <= 100;
                        return (
                          <div className={cn(
                            "text-xs font-medium flex items-center gap-1",
                            isValidComments ? "text-emerald-600" : (commentsLength > 0 ? "text-red-500" : "text-slate-400")
                          )}>
                            {commentsLength} / 40–100 chars
                            {isValidComments ? <CheckCircle2 className="w-3.5 h-3.5" /> : (commentsLength > 0 ? <XCircle className="w-3.5 h-3.5" /> : null)}
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-400">Summarize strengths, development areas, and readiness for next roles.</p>
                    <Controller
                      name="managerComments"
                      control={control}
                      render={({ field }) => {
                        const commentsLength = (field.value || "").trim().length;
                        const isValidComments = commentsLength >= 40 && commentsLength <= 100;
                        const hasError = !isValidComments && commentsLength > 0;
                        return (
                          <Textarea
                            {...field}
                            id="managerComments"
                            disabled={isReadOnly}
                            placeholder="Provide detailed qualitative feedback to support the calibration..."
                            className={cn(
                              "min-h-[140px] resize-y text-sm",
                              hasError 
                                ? "bg-red-50 border-red-300 focus:border-red-400 focus:ring-red-400/20" 
                                : "bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                            )}
                          />
                        );
                      }}
                    />
                    {errors.managerComments && (
                      <p className="text-xs text-red-500 mt-1">{(errors.managerComments as any).message}</p>
                    )}
                  </div>

                  {renderBottomActions("overall", false)}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </div>

      {/* ── Uniform Rating Warning Modal ── */}
      {uniformPrompt && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="uniform-rating-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 id="uniform-rating-modal-title" className="text-lg font-bold text-slate-900 leading-tight">
                    Heads up!
                  </h3>
                  <p className="text-xs font-semibold text-amber-700 mt-0.5">
                    Uniform Rating Detected across all indicators
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissUniformModal}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verbatim Body Copy */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                It looks like you&apos;ve selected the same rating across all competencies. Each competency measures a distinct skill. To ensure your feedback is accurate and helpful for your team member&apos;s growth, please double-check that each rating reflects their individual performance in that specific area.
              </p>
            </div>

            {/* Dynamic Assigned Score Highlight */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-amber-800">
                Assigned Score for all 4 Competencies:
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-bold shrink-0">
                Rating {uniformPrompt.rating}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismissUniformModal}
                className="border-slate-200 text-slate-800 hover:bg-slate-50 font-semibold"
              >
                Review Ratings
              </Button>
              <Button
                type="button"
                onClick={handleContinueUniformModal}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold"
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
