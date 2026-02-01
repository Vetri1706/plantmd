import React, { useEffect, useState } from 'react';
import { Loader2, ScanLine, BrainCircuit, Stethoscope } from 'lucide-react';

const steps = [
  { text: "Scanning leaf structure...", icon: ScanLine },
  { text: "Comparing with pathogen database...", icon: BrainCircuit },
  { text: "Generating treatment plan...", icon: Stethoscope },
];

const AnalysisView: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 50); // 5 seconds total

    // Text step animation
    const stepInterval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % steps.length);
    }, 1800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const ActiveIcon = steps[activeStep].icon;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div 
            className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"
          ></div>
          <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
             <ActiveIcon className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">
          AI Diagnosis in Progress
        </h3>
        <p className="text-emerald-600 font-medium h-6 mb-8 transition-all">
          {steps[activeStep].text}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
          <div 
            className="bg-emerald-500 h-3 rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-400">Powered by Gemini Neural Engine</p>
      </div>
    </div>
  );
};

export default AnalysisView;