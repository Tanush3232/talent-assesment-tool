"use client";

import { useState, useEffect } from "react";
import { BookOpen, ChevronRight, ChevronLeft } from "lucide-react";

const STORAGE_KEY = "manager_onboarding_done";

type HighlightTarget = "stat-cards" | "search-bar" | "team-table" | null;

interface Step {
  title: string;
  highlight: HighlightTarget;
  content: React.ReactNode;
}

function buildSteps(managerName: string): Step[] {
  return [
    {
      title: "Manager Workspace Onboarding Tour — Step 1 of 6",
      highlight: null,
      content: (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-900">
            Welcome to your Calibration Workspace, {managerName.split(" ")[0]}!
          </h2>
          <p className="text-slate-600 leading-relaxed">
            This interactive dashboard is your command center for assessing direct reports across the key
            corporate potential pillars:{" "}
            <strong className="text-slate-900">Ability</strong>,{" "}
            <strong className="text-slate-900">Aspiration</strong>, and{" "}
            <strong className="text-slate-900">Leadership</strong>.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Let&apos;s walk through the basic user interface steps first, then guide you directly into the
            theoretical guidelines and official calibration scales.
          </p>
        </div>
      ),
    },
    {
      title: "Manager Workspace Onboarding Tour — Step 2 of 6",
      highlight: "stat-cards",
      content: (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Step 2: Roster Status Filtering (Highlighted Below)
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Take a look at the highlighted row of metric cards at the top of your screen:{" "}
            <strong>Total Directs</strong>, <strong>Pending</strong>, <strong>Drafts</strong>, and{" "}
            <strong>Completed</strong>.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Clicking any of these cards instantly filters your team roster table. Focus on unfinished cards
            by selecting <strong>Pending</strong> or <strong>Drafts</strong>. Reset the roster filters by
            clicking <strong>Total Directs</strong>.
          </p>
        </div>
      ),
    },
    {
      title: "Manager Workspace Onboarding Tour — Step 3 of 6",
      highlight: "search-bar",
      content: (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Step 3: Real-Time Directory Search (Highlighted Below)
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Look at the search bar currently highlighted on your screen.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Type any part of a reportee&apos;s name, role designation, or office location (e.g.,{" "}
            &lsquo;Bengaluru&rsquo;) to filter and pinpoint team listings dynamically as you type.
          </p>
        </div>
      ),
    },
    {
      title: "Manager Workspace Onboarding Tour — Step 4 of 6",
      highlight: "team-table",
      content: (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Step 4: Launching Evaluations (Table Highlighted)
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Look at the team directory table, where available actions are currently highlighted.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Clicking <strong>&quot;Calibrate / Assess&quot;</strong> launches the multi-step potential wizard. Once
            finalized, the form is locked securely from subsequent edits and transmitted to HR.
          </p>
        </div>
      ),
    },
    {
      title: "Manager Workspace Onboarding Tour — Step 5 of 6",
      highlight: null,
      content: (
        <div className="space-y-5 max-h-72 overflow-y-auto pr-1">
          <h2 className="text-xl font-black text-slate-900">Guidelines</h2>
          <hr className="border-slate-200" />
          <div className="space-y-4">
            <div>
              <p className="font-bold text-slate-900 text-sm">What is the purpose of this tool?</p>
              <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed">
                As a people manager, you will be able to assess the potential of your team members in a
                structured and consistent manner.
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">What is talent potential?</p>
              <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed">
                Potential is the likelihood of an employee being able to move to and be successful in roles
                that are at higher responsibility levels in the organization (as compared to the current
                responsibility level that the employee is in).
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600">
                The potential can be estimated by assessing the employee on the various behavioural
                indicators. They are as follows:
              </p>
              <div className="flex gap-3 mt-3">
                {["Ability", "Aspiration", "Leadership"].map(p => (
                  <div key={p} className="flex-1 text-center px-4 py-2.5 bg-zuari-blue/5 border border-zuari-blue/20 rounded-xl text-sm font-bold text-zuari-blue">
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Manager Workspace Onboarding Tour — Step 6 of 6",
      highlight: null,
      content: (
        <div className="space-y-5 max-h-72 overflow-y-auto pr-1">
          <h2 className="text-xl font-black text-slate-900">Calibration & Scoring Actions</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Manager assessment along with the evidence/justification needs to be discussed and calibrated
            in the leadership team to ensure a higher level of validity.
          </p>
          <div className="space-y-3">
            <p className="font-bold text-slate-900 text-sm">Scale Reference (1–4 Scale)</p>
            <p className="text-sm text-slate-600">
              Based on your observations, please evaluate the employee on each of the behaviour using the
              following 1–4 scale and provide the examples of employee&apos;s behaviour that you have
              observed to support the rating:
            </p>
            <div className="space-y-2">
              {[
                { score: 1, desc: "Rarely or never displays the behaviour" },
                { score: 2, desc: "Demonstrates the behaviour sometimes" },
                { score: 3, desc: "Demonstrates the behaviour most of the time" },
                { score: 4, desc: "Demonstrates the behaviour consistently/role models the behaviour" },
              ].map(({ score, desc }) => (
                <div key={score} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-zuari-blue text-white text-xs font-black flex items-center justify-center">
                    {score}
                  </span>
                  <span className="text-sm text-slate-700">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-slate-900 text-sm">The actions from you as people manager is to:</p>
            <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
              <li>Rating on a scale of 1-4 as per definitions mentioned above</li>
              <li>Provide evidences and examples pertaining to each Sub-dimensions & Behavioural Indicators</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];
}

export default function ManagerOnboardingModal({ managerName }: { managerName: string }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const steps = buildSteps(managerName);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-[2px]" />

      {/* Highlight overlay — punches through for targeted element */}
      {current.highlight && (
        <style>{`
          [data-tour="${current.highlight}"] {
            position: relative;
            z-index: 52;
            box-shadow: 0 0 0 3px #3b5bdb, 0 0 0 6px rgba(59,91,219,0.25);
            border-radius: 12px;
          }
        `}</style>
      )}

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-zuari-blue" />
              <span className="text-sm font-bold text-zuari-blue">{current.title}</span>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {current.content}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-400">Step {step + 1} of {steps.length}</span>
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {isLast ? (
                <button
                  onClick={finish}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm"
                >
                  Got it, Start <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
