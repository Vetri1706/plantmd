import React, { useState } from 'react';
import { Menu, Mic, Scan, Sprout, X, ChevronLeft } from 'lucide-react';
import { AppView } from '../types';
import Logo from '../ui/logo';

interface NavbarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, goBack, canGoBack }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
             {/* Back Button */}
             {canGoBack && (
                 <button 
                    onClick={goBack}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-800 transition-colors mr-2 flex items-center justify-center border border-slate-100 shadow-sm hover:shadow-md active:scale-95"
                    title="Go Back"
                    aria-label="Go Back"
                 >
                    <ChevronLeft className="w-5 h-5" />
                 </button>
             )}

             {/* Logo */}
             <div className="flex items-center cursor-pointer" onClick={() => handleNavClick(AppView.LANDING)}>
                <Logo size={40} />
             </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <button onClick={() => handleNavClick(AppView.LANDING)} className={`nav-link font-medium ${currentView === AppView.LANDING ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>Home</button>
            <button onClick={() => handleNavClick(AppView.DASHBOARD)} className={`nav-link font-medium ${currentView === AppView.DASHBOARD ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>Dashboard</button>
            <button onClick={() => handleNavClick(AppView.EXPERTS)} className={`nav-link font-medium ${currentView === AppView.EXPERTS ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>Experts</button>
            <button onClick={() => handleNavClick(AppView.VOICE_ASSISTANT)} className={`nav-link font-medium ${currentView === AppView.VOICE_ASSISTANT ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>AI Expert</button>
            <button onClick={() => handleNavClick(AppView.HISTORY)} className={`nav-link font-medium ${currentView === AppView.HISTORY ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>History</button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Kept Mic icon for quick access on mobile/smaller screens where menu collapses, or just general quick access */}
            <button onClick={() => handleNavClick(AppView.VOICE_ASSISTANT)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 lg:hidden" title="Voice Assistant">
               <Mic className="w-5 h-5" />
            </button>
            <button onClick={() => handleNavClick(AppView.AR_SCANNER)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600" title="AR Scanner">
               <Scan className="w-5 h-5" />
            </button>
            <button 
                onClick={() => handleNavClick(AppView.UPLOAD)}
                className="hidden md:flex items-center bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              <Sprout className="w-4 h-4 mr-2" />
              New Diagnosis
            </button>
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg animate-slide-in-top">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <button onClick={() => handleNavClick(AppView.LANDING)} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-md">
              Home
            </button>
            <button onClick={() => handleNavClick(AppView.DASHBOARD)} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-md">
              Dashboard
            </button>
            <button onClick={() => handleNavClick(AppView.EXPERTS)} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-md">
              Find Experts
            </button>
            <button onClick={() => handleNavClick(AppView.VOICE_ASSISTANT)} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-md">
              AI Expert
            </button>
            <button onClick={() => handleNavClick(AppView.HISTORY)} className="block w-full text-left px-3 py-3 text-base font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-md">
              My History
            </button>
            <button onClick={() => handleNavClick(AppView.UPLOAD)} className="block w-full text-left px-3 py-3 text-base font-bold text-emerald-600 bg-emerald-50 rounded-md mt-2">
              Start New Diagnosis
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;