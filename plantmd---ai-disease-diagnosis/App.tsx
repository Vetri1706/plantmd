import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LandingView from './views/LandingView';
import UploadView from './views/UploadView';
import AnalysisView from './views/AnalysisView';
import ResultsView from './views/ResultsView';
import ExpertView from './views/ExpertView';
import HistoryView from './views/HistoryView';
import DashboardView from './views/DashboardView';
import ARScannerView from './views/ARScannerView';
import VoiceAssistantView from './views/VoiceAssistantView';
import { AppView, DiagnosisResult, PlantHistoryItem } from './types';
import { diagnosePlantMedia } from './services/geminiService';

const App: React.FC = () => {
  // Navigation History Stack
  const [history, setHistory] = useState<AppView[]>([AppView.LANDING]);
  const currentView = history[history.length - 1];

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<File | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // State to pass specific search queries to dashboard (e.g. "Copper Fungicide")
  const [dashboardQuery, setDashboardQuery] = useState<string | undefined>(undefined);

  // Unified Navigation Handler
  const navigate = (view: AppView) => {
    const rootViews = [AppView.LANDING, AppView.DASHBOARD, AppView.EXPERTS, AppView.HISTORY, AppView.VOICE_ASSISTANT];
    
    if (rootViews.includes(view)) {
      // If navigating to a root view, reset the stack
      setHistory([view]);
    } else {
      // Otherwise push to stack
      setHistory(prev => [...prev, view]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
    } else {
      // If we are at the top of the stack but not on Landing, go to Landing
      setHistory([AppView.LANDING]);
    }
  };

  const handleAnalyze = async (file: File, type: string, symptoms: string, location: string) => {
    setIsProcessing(true);
    setCurrentImage(file);
    setUploadError(null);
    
    // Push Analysis View
    setHistory(prev => [...prev, AppView.ANALYSIS]);

    try {
      const result = await diagnosePlantMedia(file, type, symptoms, location, demoMode);
      setDiagnosisResult(result);
      
      const historyItems = JSON.parse(localStorage.getItem('plantHistory') || '[]');
      localStorage.setItem('plantHistory', JSON.stringify([result, ...historyItems]));
      
      // Replace Analysis with Results in history so "Back" goes to Upload, not Analysis
      setHistory(prev => [...prev.slice(0, -1), AppView.RESULTS]);
      
    } catch (err: any) {
      // Specific Error Handling for better UX
      let userMessage = "Analysis failed due to an unexpected error. Please try again.";
      
      if (err.message === "NOT_A_PLANT") {
          userMessage = "The uploaded image does not appear to contain a plant, crop, or fruit. Please upload a clear agricultural photo.";
      } else if (err.message === "QUOTA_EXCEEDED") {
          userMessage = "You have exceeded the daily AI usage limit (Quota Exceeded). Please try again in a few minutes or switch to a paid API key.";
      } else if (err.message === "INVALID_API_KEY") {
          userMessage = "The API Key provided is invalid, expired, or not set correctly. Please check your configuration.";
      } else if (err.message.includes('Fetch failure')) {
          userMessage = "Network error. Please check your internet connection.";
      }

      setUploadError(userMessage);
      
      // Go back to Upload on error to show the message
      setHistory(prev => prev.slice(0, -1));
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to switch to dashboard searching for a specific product
  const handleFindProduct = (product: string) => {
      setDashboardQuery(product);
      navigate(AppView.DASHBOARD);
  };

  // Handle viewing a report from history
  const handleViewReport = (item: PlantHistoryItem) => {
      setDiagnosisResult(item);
      setCurrentImage(null); // Clear current file since we are loading from history (base64 is in item.image)
      setHistory(prev => [...prev, AppView.RESULTS]);
  };

  // Callback for AR Snapshot
  const handleARAnalyze = (file: File) => {
     // Trigger analysis with auto-detected defaults
     handleAnalyze(file, 'Auto-Detect', 'Visual Symptoms Detected via AR', 'Current Location');
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING: return <LandingView onStart={() => navigate(AppView.UPLOAD)} />;
      case AppView.UPLOAD: return (
        <UploadView 
            onAnalyze={handleAnalyze} 
            isProcessing={isProcessing} 
            initialFile={currentImage} // Pass back file so it persists on error
            externalError={uploadError} // Display specific error message
        />
      );
      case AppView.ANALYSIS: return <AnalysisView />;
      case AppView.RESULTS: return diagnosisResult ? (
        <ResultsView 
            result={diagnosisResult} 
            image={currentImage} 
            onReset={() => navigate(AppView.UPLOAD)} 
            onChat={() => navigate(AppView.VOICE_ASSISTANT)}
            onFindTreatment={handleFindProduct}
        />
      ) : <div>Error: No result loaded.</div>;
      case AppView.EXPERTS: return <ExpertView />;
      case AppView.HISTORY: return <HistoryView onViewReport={handleViewReport} />;
      case AppView.DASHBOARD: return <DashboardView initialQuery={dashboardQuery} />;
      case AppView.AR_SCANNER: return <ARScannerView onBack={goBack} onAnalyze={handleARAnalyze} />;
      case AppView.VOICE_ASSISTANT: return <VoiceAssistantView />;
      default: return <LandingView onStart={() => navigate(AppView.UPLOAD)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar handles top-level nav and back button */}
      {currentView !== AppView.AR_SCANNER && (
        <Navbar 
          currentView={currentView} 
          setView={navigate} 
          goBack={goBack}
          // Show back button on any page that is not the Landing page
          canGoBack={currentView !== AppView.LANDING}
        />
      )}
      
      <main>
        {renderView()}
      </main>

      {currentView !== AppView.AR_SCANNER && (
        <footer className="bg-white border-t border-slate-200 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-4 text-center text-slate-400">
            <p className="mb-2">&copy; 2026 PlantMD. Powered by Google Gemini.</p>
            <div className="mt-2">
                 <button onClick={() => setDemoMode(!demoMode)} className="text-xs text-slate-300 hover:text-slate-500 underline">
                    {demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
                 </button>
            </div>
            {demoMode && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-2 inline-block">Demo Mode Active</span>}
            </div>
        </footer>
      )}
    </div>
  );
};

export default App;