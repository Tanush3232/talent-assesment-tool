"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assessmentSubmitSchema } from "@/lib/validators";
import { SUB_DIMENSIONS, RATING_LABELS, RATING_SHORT_LABELS } from "@/lib/constants";
import { calculateSectionScore, computeFullAssessmentResult } from "@/lib/scoring";
import { saveAssessmentDraft, submitAssessment } from "@/app/actions/assessment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Save, Send, AlertCircle, RefreshCw, BookOpen, Lock, Unlock, AlertTriangle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";

type AssessmentFormProps = {
  employee: any;
  initialData?: any;
  isReadOnly?: boolean;
};

const METRICS_MAP: Record<string, { title: string, desc: string }> = {
  ability: { title: "Section 1: Ability", desc: "(Cognitive capacity, agility, and emotional intelligence required for complex, higher-level roles)" },
  aspiration: { title: "Section 2: Aspiration", desc: "(Drive, ambition, and motivation for taking on significantly larger responsibilities)" },
  leadership: { title: "Section 3: Leadership", desc: "(Influence, resilience, and capability to build organizations and lead large teams)" },
};

export default function AssessmentForm({ employee, initialData, isReadOnly = false }: AssessmentFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("guidelines");
  const [lastSaved, setLastSaved] = useState<Date | null>(initialData?.updatedAt ? new Date(initialData.updatedAt) : null);

  const defaultValues = {
    scores: {
      ability: initialData?.scores?.ability || {},
      aspiration: initialData?.scores?.aspiration || {},
      leadership: initialData?.scores?.leadership || {},
    },
    evidence: initialData?.evidence || {},
    managerComments: initialData?.managerComments || "",
  };

  const form = useForm<any>({
    resolver: zodResolver(assessmentSubmitSchema),
    defaultValues,
    mode: "onChange",
  });

  const { watch, control, handleSubmit, formState: { errors, isDirty } } = form;
  const watchScores = watch("scores");
  const watchEvidence = watch("evidence");

  // Calculations
  const abilityScore = calculateSectionScore("ability", watchScores).sum;
  const aspirationScore = calculateSectionScore("aspiration", watchScores).sum;
  const leadershipScore = calculateSectionScore("leadership", watchScores).sum;
  
  const result = computeFullAssessmentResult(watchScores);
  const overallScore = result.grandTotal;
  const hipoStatus = result.classification.category;
  const promotability = result.classification.category === "Promotable/Expandable" ? "Ready Next" : "N/A";
  const wellPlaced = result.classification.category === "Well-placed" ? "Yes" : "No";

  // Calculate completion percentage
  const totalQuestions = Object.keys(SUB_DIMENSIONS).length;
  const answeredQuestions = Object.values(watchScores).flatMap((cat: any) => Object.values(cat)).filter(val => val !== undefined && val !== null).length;
  const progress = Math.round((answeredQuestions / totalQuestions) * 100);

  // Auto-save
  useEffect(() => {
    if (isReadOnly) return;
    
    const interval = setInterval(async () => {
      if (isDirty) {
        await handleSaveDraft(form.getValues(), true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isDirty, isReadOnly]);

  const handleSaveDraft = async (data: any, silent = false) => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      await saveAssessmentDraft(employee.id, data);
      setLastSaved(new Date());
      form.reset(data, { keepValues: true }); // Reset isDirty
      if (!silent) toast.success("Draft saved successfully");
    } catch (error) {
      if (!silent) toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (isReadOnly) return;
    setIsSubmitting(true);
    try {
      await submitAssessment(employee.id, data);
      toast.success("Assessment submitted successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit assessment. Please check all required fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingButtons = (categoryId: "ability" | "aspiration" | "leadership", subId: string) => (
    <div className="flex gap-2 justify-end">
      {[1, 2, 3, 4].map((rating) => {
        const isSelected = watchScores[categoryId]?.[subId] === rating;
        return (
          <Button
            key={rating}
            type="button"
            disabled={isReadOnly}
            variant={isSelected ? "default" : "outline"}
            className={`w-12 h-12 text-lg font-bold ${
              isSelected ? `bg-indigo-900 hover:bg-indigo-900 text-white` : `bg-white hover:bg-slate-50 text-slate-600 border-slate-300 shadow-sm`
            }`}
            onClick={() => {
              form.setValue(`scores.${categoryId}.${subId}`, rating, { shouldValidate: true, shouldDirty: true });
            }}
          >
            {rating}
          </Button>
        );
      })}
    </div>
  );

  const renderSection = (categoryId: "ability" | "aspiration" | "leadership") => {
    const questions = SUB_DIMENSIONS[categoryId];
    const catScore = categoryId === "ability" ? abilityScore : categoryId === "aspiration" ? aspirationScore : leadershipScore;
    const meta = METRICS_MAP[categoryId];

    return (
      <TabsContent value={categoryId} className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-800 text-white p-6 rounded-t-xl flex justify-between items-start">
          <div>
            <div className="text-amber-500 font-bold text-xs tracking-widest mb-2 uppercase">REFINING PARAMETERS</div>
            <h2 className="text-2xl font-bold mb-1">{meta.title}</h2>
            <p className="text-slate-300 text-sm">{meta.desc}</p>
          </div>
          <div className="bg-white/10 px-4 py-3 rounded-lg text-center min-w-[140px]">
            <div className="text-slate-300 text-xs font-semibold mb-1 uppercase tracking-wider">RUNNING SUBTOTAL</div>
            <div className="text-3xl font-bold text-white">{catScore} <span className="text-lg text-slate-400 font-medium">/ 16</span></div>
          </div>
        </div>
        
        <div className="space-y-6">
          {questions.map((q, index) => {
            const evLength = (watchEvidence?.[q.id] || "").length;
            const hasError = (errors?.scores as any)?.[categoryId]?.[q.id];
            
            return (
              <Card key={q.id} className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-4">
                    <span className="uppercase tracking-wider">Indicator {q.id}</span>
                    <span className="text-slate-400">|</span>
                    <span className="uppercase tracking-wider text-slate-800">SUB-DIMENSION & BEHAVIOR</span>
                  </div>
                  <div className="hidden md:flex gap-4 font-normal text-slate-500">
                    <span>1 = Rarely / Never</span>
                    <span>2 = Sometimes</span>
                    <span>3 = Most of the time</span>
                    <span>4 = Consistently</span>
                  </div>
                </div>
                
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row border-b border-slate-100">
                    <div className="p-6 md:w-2/3 border-r border-slate-100">
                      <h3 className="text-lg font-bold text-indigo-900 mb-2">{q.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {q.description}
                      </p>
                    </div>
                    <div className="p-6 md:w-1/3 bg-slate-50 flex flex-col justify-center items-center md:items-end">
                      <span className="text-xs font-bold text-slate-500 mb-3 tracking-wider">ASSIGN SCORE</span>
                      {renderRatingButtons(categoryId, q.id)}
                      {hasError && (
                        <p className="text-xs text-zuari-red mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white relative group">
                    <div className="flex justify-between items-end mb-2">
                      <Label htmlFor={`evidence-${q.id}`} className="text-xs font-bold text-slate-700 tracking-wider">
                        EVIDENCE / BEHAVIOR EXAMPLES OBSERVED <span className="text-zuari-red">*</span>
                      </Label>
                      <div className={`text-xs font-medium flex items-center gap-1 ${evLength >= 100 ? 'text-zuari-green' : 'text-slate-400'}`}>
                        {evLength} / 100 characters min
                        {evLength >= 100 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <Controller
                      name={`evidence.${q.id}`}
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          id={`evidence-${q.id}`}
                          disabled={isReadOnly}
                          placeholder="Please provide specific situations, actions taken by the employee, and the results achieved..."
                          className="min-h-[120px] resize-y bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 shadow-inner text-sm"
                        />
                      )}
                    />
                    {evLength > 0 && evLength < 100 && (
                      <p className="text-xs text-amber-600 mt-2">Evidence must be at least 100 characters.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar Profile & Summary */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-slate-200 shadow-sm sticky top-28">
          <CardHeader className="pb-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-400">{employee.name.charAt(0)}</span>
              </div>
              <div>
                <CardTitle className="text-xl">{employee.name}</CardTitle>
                <CardDescription className="mt-1 font-medium text-zuari-blue">{employee.designation}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">ID</span>
                <span className="font-medium text-slate-900">{employee.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-900 text-right">{employee.department}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-900 text-right">{employee.location}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zuari-green" />
                Live Assessment Stats
              </h4>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Overall Score</span>
                  <Badge variant="outline" className="bg-white">{overallScore}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">HiPo Status</span>
                  <Badge className={hipoStatus === "High Potential (HiPo)" ? "bg-zuari-green/15 text-zuari-green/90 hover:bg-zuari-green/15" : "bg-slate-100 text-slate-700 hover:bg-slate-100"}>
                    {hipoStatus}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Promotability</span>
                  <Badge className={promotability === "Ready Next" ? "bg-zuari-blue/20 text-zuari-blue/90 hover:bg-zuari-blue/20" : "bg-slate-100 text-slate-700 hover:bg-slate-100"}>
                    {promotability}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-medium">Completion Progress</span>
                <span className="text-slate-700 font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Form Area */}
      <div className="lg:col-span-3">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-24 z-30">
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zuari-green" />
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {isDirty && !isSaving && (
                <span className="text-xs font-medium text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved changes
                </span>
              )}
              {isSaving && (
                <span className="text-xs font-medium text-zuari-blue/80 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              )}
            </div>
            
            {!isReadOnly && (
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleSaveDraft(form.getValues())}
                  disabled={isSaving || isSubmitting}
                  className="bg-white text-indigo-900 border-zuari-blue/30 hover:bg-zuari-blue/10"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Draft
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || progress < 100}
                  className="bg-indigo-900 hover:bg-indigo-950 text-white shadow-md"
                >
                  <Send className="w-4 h-4 mr-2" /> Submit Review
                </Button>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-5 bg-slate-50 border border-slate-200 rounded-xl p-1 mb-6 h-auto gap-1">
              <TabsTrigger value="guidelines" className="!h-full group py-3 px-4 flex flex-col items-start text-left data-active:bg-white data-active:shadow-sm rounded-lg border border-transparent data-active:border-slate-200 transition-all">
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-data-active:text-slate-500">Verbatim Scope</span>
                  <Lock className="w-4 h-4 text-slate-300 group-data-active:text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-data-active:text-slate-900">Guidelines</span>
              </TabsTrigger>
              <TabsTrigger value="ability" className="!h-full group py-3 px-4 flex flex-col items-start text-left data-active:bg-white data-active:shadow-sm rounded-lg border border-transparent data-active:border-slate-200 transition-all">
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-data-active:text-slate-500">Cognitive Capacity</span>
                  {abilityScore > 0 ? <Unlock className="w-4 h-4 text-zuari-green" /> : <Lock className="w-4 h-4 text-slate-300 group-data-active:text-slate-400" />}
                </div>
                <span className="text-sm font-bold text-slate-600 group-data-active:text-slate-900">1. Ability</span>
              </TabsTrigger>
              <TabsTrigger value="aspiration" className="!h-full group py-3 px-4 flex flex-col items-start text-left data-active:bg-white data-active:shadow-sm rounded-lg border border-transparent data-active:border-slate-200 transition-all">
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-data-active:text-slate-500">Internal Drive</span>
                  {aspirationScore > 0 ? <Unlock className="w-4 h-4 text-zuari-green" /> : <Lock className="w-4 h-4 text-slate-300 group-data-active:text-slate-400" />}
                </div>
                <span className="text-sm font-bold text-slate-600 group-data-active:text-slate-900">2. Aspiration</span>
              </TabsTrigger>
              <TabsTrigger value="leadership" className="!h-full group py-3 px-4 flex flex-col items-start text-left data-active:bg-white data-active:shadow-sm rounded-lg border border-transparent data-active:border-slate-200 transition-all">
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-data-active:text-slate-500">Discretionary Effort</span>
                  {leadershipScore > 0 ? <Unlock className="w-4 h-4 text-zuari-green" /> : <Lock className="w-4 h-4 text-slate-300 group-data-active:text-slate-400" />}
                </div>
                <span className="text-sm font-bold text-slate-600 group-data-active:text-slate-900">3. Leadership</span>
              </TabsTrigger>
              <TabsTrigger value="overall" className="!h-full group py-3 px-4 flex flex-col items-start text-left data-active:bg-white data-active:shadow-sm rounded-lg border border-transparent data-active:border-slate-200 transition-all">
                <div className="w-full flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-data-active:text-slate-500">Exclusions Profile</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-300 group-data-active:text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-data-active:text-slate-900">Summary</span>
              </TabsTrigger>
            </TabsList>

            {/* GUIDELINES TAB CONTENT */}
            <TabsContent value="guidelines" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 p-5">
                  <h2 className="text-white text-xl font-bold">Potential Evaluation Framework Guidelines</h2>
                </div>
                <CardContent className="p-8 space-y-10">
                  
                  <section>
                    <h3 className="text-indigo-900 font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="bg-zuari-blue/20 text-indigo-900 w-7 h-7 rounded-full flex items-center justify-center text-sm">1</span>
                      PURPOSE & SCOPE OF POTENTIAL CALIBRATION
                    </h3>
                    <div className="bg-zuari-blue/10 border border-zuari-blue/20 rounded-lg p-5 text-slate-700 text-sm leading-relaxed shadow-inner">
                      This framework helps leaders identify and calibrate employee potential beyond current performance. Potential refers to the likelihood, trajectory, and readiness of an employee to take on broader, more complex, and significantly different responsibilities in the future. Evaluate the individual based on observable behaviors over the past 12-18 months.
                    </div>
                  </section>

                  <section>
                    <h3 className="text-indigo-900 font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="bg-zuari-blue/20 text-indigo-900 w-7 h-7 rounded-full flex items-center justify-center text-sm">2</span>
                      BEHAVIORAL EVALUATION SCALE (1-4)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="border border-slate-200 rounded-lg p-4 shadow-sm bg-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-300"></div>
                        <div className="text-3xl font-black text-slate-300 mb-2">1</div>
                        <h4 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide">Rarely or never</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Demonstrates this behavior rarely or not at all. Requires significant development in this area to take on broader roles.</p>
                      </div>
                      <div className="border border-zuari-blue/30 rounded-lg p-4 shadow-sm bg-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-300"></div>
                        <div className="text-3xl font-black text-zuari-blue/30 mb-2">2</div>
                        <h4 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide">Demonstrates sometimes</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Exhibits this behavior in familiar situations but lacks consistency when faced with ambiguity or high pressure.</p>
                      </div>
                      <div className="border border-zuari-green/30 rounded-lg p-4 shadow-sm bg-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-zuari-green/80"></div>
                        <div className="text-3xl font-black text-zuari-green/30 mb-2">3</div>
                        <h4 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide">Demonstrates most of the time</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Consistently shows this behavior across various situations. A reliable indicator of readiness for the next level.</p>
                      </div>
                      <div className="border border-amber-200 rounded-lg p-4 shadow-sm bg-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
                        <div className="text-3xl font-black text-amber-200 mb-2">4</div>
                        <h4 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide">Consistently / Role Model</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Exemplifies this behavior effortlessly, even in highly complex scenarios. Serves as a role model for others.</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-indigo-900 font-bold text-lg mb-3 flex items-center gap-2">
                      <span className="bg-zuari-blue/20 text-indigo-900 w-7 h-7 rounded-full flex items-center justify-center text-sm">3</span>
                      POTENTIAL CLASSIFICATION TABLE
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-bold tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Total Score Range</th>
                            <th className="px-6 py-4">Potential Category</th>
                            <th className="px-6 py-4">Definition & Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="bg-white hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-zuari-green whitespace-nowrap">39 – 48</td>
                            <td className="px-6 py-4 font-bold text-slate-900">High Potential (HiPo)</td>
                            <td className="px-6 py-4 text-slate-600">Capable of advancing 2+ roles in 3 years. Needs fast-tracked development & exposure.</td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-zuari-blue whitespace-nowrap">29 – 38</td>
                            <td className="px-6 py-4 font-bold text-slate-900">Promotable / Expandable</td>
                            <td className="px-6 py-4 text-slate-600">Ready for the next level or expanded scope within 1-2 years. Focus on closing specific gaps.</td>
                          </tr>
                          <tr className="bg-white hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-slate-600 whitespace-nowrap">12 – 28</td>
                            <td className="px-6 py-4 font-bold text-slate-900">Well-placed</td>
                            <td className="px-6 py-4 text-slate-600">Performing well in current role but may not show clear signals for higher complexity yet. Focus on mastery.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <div className="bg-zuari-red/10 border border-zuari-red/30 rounded-xl p-5 shadow-sm flex items-start gap-4">
                      <div className="bg-white p-2 rounded-full shadow-sm text-zuari-red shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-zuari-red/90 font-bold text-sm mb-1 uppercase tracking-wide">4. Talent Progression Exclusion Rules Notice</h4>
                        <p className="text-zuari-red/90 text-sm leading-relaxed">
                          An employee cannot be classified as <strong>High Potential</strong> if they score a <strong>'1' or '2'</strong> on more than <strong>two (2)</strong> separate sub-dimensions, regardless of their overall total score. A broad base of foundational potential is required to mitigate derailment risks.
                        </p>
                      </div>
                    </div>
                  </section>
                </CardContent>
              </Card>
            </TabsContent>

            {renderSection("ability")}
            {renderSection("aspiration")}
            {renderSection("leadership")}

            <TabsContent value="overall" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-800 text-white rounded-t-xl pb-6">
                  <div className="text-amber-500 font-bold text-xs tracking-widest mb-2 uppercase">EXCLUSIONS PROFILE</div>
                  <CardTitle className="text-2xl">Summary & Verification</CardTitle>
                  <CardDescription className="text-slate-300 text-sm">Review the final potential calculations and provide qualitative justification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Final Total Score</div>
                      <div className="text-4xl font-black text-indigo-900">{overallScore} <span className="text-xl text-slate-300 font-medium">/ 48</span></div>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-full h-1 ${hipoStatus === "High Potential (HiPo)" ? "bg-zuari-green" : "bg-slate-300"}`}></div>
                      <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">HiPo Classification</div>
                      <div className={`text-2xl font-bold ${hipoStatus === "High Potential (HiPo)" ? "text-zuari-green" : "text-slate-800"}`}>{hipoStatus}</div>
                      {result.classification.forcedExclusion && (
                        <div className="text-xs text-zuari-red mt-2 font-bold bg-zuari-red/10 px-2 py-1 rounded-md">Exclusion rule triggered (&gt;2 scores below 3)</div>
                      )}
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center items-center text-center">
                      <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Placement Status</div>
                      <div className="text-2xl font-bold text-slate-700">{wellPlaced}</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-slate-100">
                    <Label htmlFor="managerComments" className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Manager's Final Justification & Comments <span className="text-zuari-red">*</span>
                    </Label>
                    <p className="text-sm text-slate-500">Summarize strengths, development areas, and readiness for next roles based on the scores provided.</p>
                    <Controller
                      name="managerComments"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          id="managerComments"
                          disabled={isReadOnly}
                          placeholder="Provide detailed qualitative feedback to support the calibration..."
                          className="min-h-[150px] resize-y bg-slate-50 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/20 shadow-inner"
                        />
                      )}
                    />
                    {errors.managerComments && (
                      <p className="text-sm text-zuari-red mt-1 font-medium">{(errors.managerComments as any).message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  );
}
