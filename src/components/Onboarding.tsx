"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target, CheckCircle2, Brain, Clock, ChevronRight, Sparkles, Check, Zap, Award, TrendingUp, Flame } from "lucide-react";

type OnboardingData = {
  identity: string;
  goal: string;
  goalOther?: string;
  focusAreas: string[];
  coachTone: "strict" | "balanced" | "encouraging";
  reminderTime: string;
  fallBehindReminder: boolean;
};

type OnboardingProps = {
  onComplete: (data: OnboardingData) => void;
};

const IDENTITIES = [
  { id: "consistent", label: "Consistent" },
  { id: "focused", label: "Focused" },
  { id: "disciplined", label: "Disciplined" },
  { id: "organized", label: "Organized" },
  { id: "confident", label: "Confident" },
];

const GOALS = [
  { id: "discipline", label: "Build daily discipline" },
  { id: "tasks", label: "Stay on top of tasks" },
  { id: "habits", label: "Improve habits & routines" },
  { id: "procrastination", label: "Reduce procrastination" },
  { id: "fitness", label: "Fitness & health structure" },
];

const FOCUS_AREAS = [
  "Procrastination",
  "Overthinking",
  "No structure",
  "Low energy",
  "Bad sleep schedule",
  "Distractions / phone",
  "Inconsistency",
  "Stress / overwhelm",
];

const COACH_TONES = [
  { 
    id: "strict", 
    label: "Strict", 
    desc: "Tough love",
    preview: "No excuses. You said you'd do it, so do it. Discipline isn't negotiable."
  },
  { 
    id: "balanced", 
    label: "Balanced", 
    desc: "Firm + supportive",
    preview: "You're capable of more. Let's push through this together, one step at a time."
  },
  { 
    id: "encouraging", 
    label: "Encouraging", 
    desc: "Calm + positive",
    preview: "You're doing great. Every small step forward is progress worth celebrating."
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    identity: "",
    goal: "",
    focusAreas: [],
    coachTone: "balanced",
    reminderTime: "09:00",
    fallBehindReminder: false,
  });
  const [showGoalOther, setShowGoalOther] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState("");

  // Auto-advance from splash screen
  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => {
        setStep(1);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const totalSteps = 6;
  const progress = step === 0 ? 0 : ((step - 1) / totalSteps) * 100;

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else if (step === 6) {
      // Complete onboarding and redirect to paywall
      onComplete(data);
      router.push('/paywall');
    }
  };

  const handleSkip = () => {
    if (step >= 2) {
      onComplete(data);
      router.push('/paywall');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.identity !== "";
      case 2:
        return data.goal !== "" || (showGoalOther && data.goalOther && data.goalOther.trim() !== "");
      case 3:
        return data.focusAreas.length >= 1 && data.focusAreas.length <= 3;
      case 4:
        return data.coachTone !== "";
      case 5:
        return data.reminderTime !== "";
      case 6:
        return true;
      default:
        return false;
    }
  };

  const toggleFocusArea = (area: string) => {
    if (data.focusAreas.includes(area)) {
      setData({ ...data, focusAreas: data.focusAreas.filter(a => a !== area) });
    } else if (data.focusAreas.length < 3) {
      setData({ ...data, focusAreas: [...data.focusAreas, area] });
    }
  };

  const selectIdentity = (id: string) => {
    setSelectedIdentity(id);
    setTimeout(() => {
      setData({ ...data, identity: id });
    }, 300);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Bar */}
      {step > 0 && (
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50">
          <div className="max-w-md mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-500">Step {step} of {totalSteps}</span>
              {step >= 3 && (
                <button
                  onClick={handleSkip}
                  className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
              )}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-6 pt-24 pb-32 overflow-y-auto">
        {/* Screen 0: Brand Splash */}
        {step === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fadeIn">
            <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center shadow-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-5xl font-bold text-black">Flow AI</h1>
              <p className="text-2xl text-gray-600 font-medium">Discipline, simplified.</p>
              <p className="text-base text-gray-400 pt-4">Let's build your plan.</p>
            </div>
          </div>
        )}

        {/* Screen 1: Identity Hook */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-black leading-tight">What do you want to become?</h1>
              <p className="text-lg text-gray-500">Pick the version of you we're building.</p>
            </div>

            <div className="space-y-3">
              {IDENTITIES.map((identity) => {
                const isSelected = data.identity === identity.id;
                const isAnimating = selectedIdentity === identity.id;
                return (
                  <button
                    key={identity.id}
                    onClick={() => selectIdentity(identity.id)}
                    className={`w-full rounded-2xl p-6 flex items-center justify-between transition-all duration-300 active:scale-[0.98] ${
                      isSelected
                        ? "bg-black text-white shadow-2xl scale-105"
                        : "bg-gray-50 text-black hover:bg-gray-100 border border-gray-200"
                    } ${isAnimating ? "animate-glow" : ""}`}
                  >
                    <span className="text-xl font-bold">{identity.label}</span>
                    {isSelected && (
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Screen 2: Goal */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-black leading-tight">What's your main goal?</h1>
              <p className="text-lg text-gray-500">Choose what matters most.</p>
            </div>

            <div className="space-y-3">
              {GOALS.map((goal) => {
                const isSelected = data.goal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => {
                      setData({ ...data, goal: goal.id });
                      setShowGoalOther(false);
                    }}
                    className={`w-full rounded-2xl p-5 flex items-center justify-between transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? "bg-black text-white shadow-lg"
                        : "bg-gray-50 text-black hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <span className="text-base font-semibold text-left">{goal.label}</span>
                    {isSelected && <Check className="w-6 h-6" strokeWidth={3} />}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setShowGoalOther(true);
                  setData({ ...data, goal: "other" });
                }}
                className={`w-full rounded-2xl p-5 flex items-center justify-between transition-all duration-200 active:scale-[0.98] ${
                  showGoalOther
                    ? "bg-black text-white shadow-lg"
                    : "bg-gray-50 text-black hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span className="text-base font-semibold">Other</span>
                {showGoalOther && <Check className="w-6 h-6" strokeWidth={3} />}
              </button>

              {showGoalOther && (
                <input
                  type="text"
                  value={data.goalOther || ""}
                  onChange={(e) => setData({ ...data, goalOther: e.target.value })}
                  placeholder="Describe your goal..."
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-colors text-base"
                  autoFocus
                />
              )}
            </div>
          </div>
        )}

        {/* Screen 3: Focus Areas */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-black leading-tight">Where do you struggle most?</h1>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">Pick up to 3 so we can personalize your plan.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FOCUS_AREAS.map((area) => {
                const isSelected = data.focusAreas.includes(area);
                const isDisabled = !isSelected && data.focusAreas.length >= 3;
                return (
                  <button
                    key={area}
                    onClick={() => toggleFocusArea(area)}
                    disabled={isDisabled}
                    className={`rounded-2xl p-4 text-sm font-semibold transition-all duration-200 active:scale-[0.95] ${
                      isSelected
                        ? "bg-black text-white shadow-lg"
                        : isDisabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-50 text-black hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>

            {data.focusAreas.length > 0 && (
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-sm text-blue-700 text-center font-medium">
                  {data.focusAreas.length} area{data.focusAreas.length > 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>
        )}

        {/* Screen 4: Coaching Style */}
        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-black leading-tight">How should Flow AI coach you?</h1>
              <p className="text-lg text-gray-500">Choose your style.</p>
            </div>

            <div className="space-y-3">
              {COACH_TONES.map((tone) => {
                const isSelected = data.coachTone === tone.id;
                return (
                  <button
                    key={tone.id}
                    onClick={() => setData({ ...data, coachTone: tone.id as any })}
                    className={`w-full rounded-2xl p-6 transition-all duration-200 active:scale-[0.98] text-left ${
                      isSelected
                        ? "bg-black text-white shadow-lg"
                        : "bg-gray-50 text-black hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xl font-bold block mb-1">{tone.label}</span>
                        <span className={`text-sm ${isSelected ? "text-white/70" : "text-gray-500"}`}>
                          {tone.desc}
                        </span>
                      </div>
                      {isSelected && <Check className="w-6 h-6" strokeWidth={3} />}
                    </div>
                    <p className={`text-sm italic leading-relaxed ${isSelected ? "text-white/80" : "text-gray-600"}`}>
                      "{tone.preview}"
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Screen 5: Daily Rhythm */}
        {step === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-black leading-tight">When should we check in with you?</h1>
              <p className="text-lg text-gray-500">Set your daily reminder.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Daily reminder time</label>
                <input
                  type="time"
                  value={data.reminderTime}
                  onChange={(e) => setData({ ...data, reminderTime: e.target.value })}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-colors text-lg font-semibold"
                />
              </div>

              <label className="flex items-center gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={data.fallBehindReminder}
                  onChange={(e) => setData({ ...data, fallBehindReminder: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Also remind me if I fall behind</span>
              </label>
            </div>
          </div>
        )}

        {/* Screen 6: Value Preview */}
        {step === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
              <h1 className="text-4xl font-bold text-black leading-tight">Your Flow Plan is ready</h1>
              <p className="text-lg text-gray-500">Here's what we built for you.</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Identity</p>
                    <p className="text-base font-bold text-black capitalize">{data.identity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Goal</p>
                    <p className="text-base font-bold text-black">
                      {data.goal === "other" ? data.goalOther : GOALS.find(g => g.id === data.goal)?.label}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Focus Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {data.focusAreas.map((area) => (
                        <span key={area} className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-black border border-gray-200">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Coach Tone</p>
                    <p className="text-base font-bold text-black capitalize">{data.coachTone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">Daily Check-in</p>
                    <p className="text-base font-bold text-black">{data.reminderTime}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-black mb-4">What you'll get:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">Daily plan + reminders</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">Habit & task streak tracking</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">AI Coach that adapts to you</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-100">
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#e0e7ff" strokeWidth="4" fill="none" />
                    <circle
                      cx="32" cy="32" r="28" stroke="#4f46e5" strokeWidth="4" fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * 0.25}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-900">Your Starting Plan</p>
                  <p className="text-xs text-indigo-700 mt-1">Based on your choices, we'll start with 1 priority + 3 daily tasks.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
          <div className="max-w-md mx-auto px-6 py-4">
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full bg-black text-white rounded-full py-4 px-6 flex items-center justify-center gap-2 font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <span>{step === 6 ? "Continue" : "Next"}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        .animate-glow {
          animation: glow 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
