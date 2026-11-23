import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe } from '../types/recipe';

interface CookingModeModalProps {
  recipe: Recipe;
  servings: number;
  isOpen: boolean;
  onClose: () => void;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({
  recipe,
  servings,
  isOpen,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const steps = recipe.instructions || [];
  const currentStep = steps[currentStepIndex];

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      } catch (e) {
        // ignore
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Set default timer when step changes if step has duration
  useEffect(() => {
    if (currentStep?.durationMinutes) {
      setTimerSeconds(currentStep.durationMinutes * 60);
      setIsTimerRunning(false);
    } else {
      setTimerSeconds(null);
      setIsTimerRunning(false);
    }
  }, [currentStepIndex, currentStep]);

  if (!isOpen || !currentStep) return null;

  const toggleStepCompleted = (index: number) => {
    const next = { ...completedSteps, [index]: !completedSteps[index] };
    setCompletedSteps(next);
    if (index === steps.length - 1 && !completedSteps[index]) {
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-8 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
            Mode Cuisine • {servings} portions
          </span>
          <h2 className="text-lg sm:text-2xl font-bold text-white line-clamp-1">{recipe.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Step Display */}
      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col justify-center py-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3.5 py-1 rounded-full bg-orange-600 text-white font-extrabold text-sm sm:text-base">
            Étape {currentStepIndex + 1} / {steps.length}
          </span>
          {completedSteps[currentStepIndex] && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Validée
            </span>
          )}
        </div>

        {/* Step Instruction Text */}
        <p className="text-xl sm:text-3xl lg:text-4xl font-medium leading-relaxed sm:leading-snug text-slate-100 mb-8">
          {currentStep.text}
        </p>

        {/* Step Timer if detected */}
        {timerSeconds !== null && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 max-w-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Minuteur étape</p>
                <p className="text-2xl sm:text-3xl font-mono font-bold text-white">
                  {formatTimer(timerSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold transition-all ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  if (currentStep.durationMinutes) {
                    setTimerSeconds(currentStep.durationMinutes * 60);
                  }
                }}
                className="w-11 h-11 rounded-2xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="max-w-3xl mx-auto w-full pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
          disabled={currentStepIndex === 0}
          className="px-4 sm:px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-semibold flex items-center gap-2 text-sm sm:text-base transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Précédent</span>
        </button>

        <button
          onClick={() => toggleStepCompleted(currentStepIndex)}
          className={`px-5 sm:px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 text-sm sm:text-base transition-all ${
            completedSteps[currentStepIndex]
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{completedSteps[currentStepIndex] ? 'Étape faite' : 'Marquer comme faite'}</span>
        </button>

        <button
          onClick={() => setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1))}
          disabled={currentStepIndex === steps.length - 1}
          className="px-4 sm:px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-30 disabled:hover:bg-orange-600 text-white font-semibold flex items-center gap-2 text-sm sm:text-base transition-colors"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
