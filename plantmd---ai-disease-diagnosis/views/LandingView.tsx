import React, { useState } from 'react';
import { Camera, Zap, FileText, CheckCircle, ArrowRight, ShieldCheck, TrendingUp, Users, Play, X } from 'lucide-react';
import { AppView } from '../types';

interface LandingViewProps {
  onStart: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onStart }) => {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=2787&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="lg:w-2/3">
            <div className="inline-flex items-center bg-emerald-800/50 rounded-full px-4 py-1.5 mb-6 border border-emerald-500/30">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></span>
              <span className="text-emerald-100 text-sm font-medium">Powered by Gemini 3.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
              Save Your Crops with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-100">AI-Powered Diagnosis</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-100 mb-8 max-w-2xl leading-relaxed">
              Instantly identify over 50+ plant diseases with 99% accuracy. Get professional-grade treatment plans, organic solutions, and connect with experts in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStart}
                className="flex items-center justify-center bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20"
              >
                Start Free Diagnosis
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button 
                onClick={() => setShowVideo(true)}
                className="flex items-center justify-center bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-white/20 transition-all border border-white/10 group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-emerald-200">
            <div className="p-4">
              <div className="text-4xl font-bold text-emerald-800 mb-1">10,000+</div>
              <div className="text-emerald-600 font-medium">Farmers Can Be Helped</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-emerald-800 mb-1">2.5M+</div>
              <div className="text-emerald-600 font-medium">Plants Can Be Diagnosed</div>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-emerald-800 mb-1">40%</div>
              <div className="text-emerald-600 font-medium">Avg. Crops Can Be Saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How PlantMD Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Three simple steps to save your plants from disease.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Camera, title: "1. Upload Photo", desc: "Take a clear photo of the affected leaf or stem." },
              { icon: Zap, title: "2. AI Analysis", desc: "Our Gemini-powered AI identifies the pathogen in seconds." },
              { icon: FileText, title: "3. Get Treatment", desc: "Receive a detailed organic and chemical treatment plan." }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "99% Accuracy", desc: "Trained on 100k+ validated images.", icon: CheckCircle },
              { title: "50+ Diseases", desc: "Covers all major crop types.", icon: ShieldCheck },
              { title: "Instant Results", desc: "Diagnosis in < 5 seconds.", icon: Zap },
              { title: "Expert Connect", desc: "Direct link to agronomists.", icon: Users },
            ].map((feat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <feat.icon className="h-8 w-8 text-emerald-500 mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button 
                onClick={() => setShowVideo(false)}
                className="absolute top-6 right-6 z-20 p-2 bg-black/60 text-white rounded-full hover:bg-white/20 transition-colors"
            >
                <X className="w-8 h-8" />
            </button>
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Embedded Gemini Demo Video */}
                <iframe 
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/jV1vkHv4zq8?autoplay=1&rel=0" 
                    title="Gemini AI Demo" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingView;