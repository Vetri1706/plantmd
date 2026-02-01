import React, { useState, useEffect } from 'react';
import { DiagnosisResult } from '../types';
import { AlertTriangle, Shield, Clock, FileDown, UserPlus, Save, Check, Share2, MessageCircle, Volume2, Search, Loader2, MapPin, Video, ExternalLink, Youtube } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateSpeech, playGeneratedAudio, getLatestResearch, getTreatmentVideos } from '../services/geminiService';

interface ResultsViewProps {
  result: DiagnosisResult;
  image: File | null;
  onReset: () => void;
  onChat: () => void;
  onFindTreatment: (treatment: string) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ result, image, onReset, onChat, onFindTreatment }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [groundingInfo, setGroundingInfo] = useState<{text: string, sources: any[]} | null>(null);
  const [loadingGrounding, setLoadingGrounding] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // If image (File) exists, create URL. Otherwise use result.image (Base64 from history).
  const imageUrl = image ? URL.createObjectURL(image) : result.image;
  
  // Determine if content is video based on File type OR Base64 prefix
  const isVideo = image 
    ? image.type.startsWith('video') 
    : (result.image && result.image.startsWith('data:video'));

  // Fetch videos on mount/change
  useEffect(() => {
      const fetchVideos = async () => {
          setLoadingVideos(true);
          const vids = await getTreatmentVideos(result.diseaseName);
          setVideos(vids);
          setLoadingVideos(false);
      };
      if (result.diseaseName) {
          fetchVideos();
      }
  }, [result.diseaseName]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text('PlantMD Diagnosis Report', 20, 20);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Disease: ${result.diseaseName}`, 20, 40);
    doc.text(`Severity: ${result.severity}`, 20, 50);
    
    doc.setFontSize(12);
    const splitDesc = doc.splitTextToSize(result.description, 170);
    doc.text(splitDesc, 20, 70);
    
    doc.save(`PlantMD-${result.diseaseName.replace(/\s+/g, '-')}.pdf`);
  };

  const playAudio = async () => {
      if (isPlaying) return;
      setIsPlaying(true);
      try {
          const text = `Diagnosis: ${result.diseaseName}. Severity: ${result.severity}. ${result.description}`;
          const audioBase64 = await generateSpeech(text);
          await playGeneratedAudio(audioBase64);
      } catch (e) {
          alert("Could not generate speech.");
          console.error(e);
      } finally {
          setIsPlaying(false);
      }
  };

  const fetchGrounding = async () => {
      setLoadingGrounding(true);
      const info = await getLatestResearch(result.diseaseName);
      setGroundingInfo(info);
      setLoadingGrounding(false);
  }

  // --- MARKDOWN RENDERING HELPER ---
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Parse Bold Text: **text**
    const parseBold = (str: string) => {
       return str.split(/(\*\*.*?\*\*)/g).map((part, i) => {
           if (part.startsWith('**') && part.endsWith('**')) {
               return <strong key={i} className="font-bold text-blue-900">{part.slice(2, -2)}</strong>;
           }
           return part;
       });
    };

    return text.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2" />;

      // 1. Headers (### or just bold lines that look like headers)
      if (trimmed.startsWith('###')) {
         return <h4 key={index} className="text-blue-900 font-bold mt-4 mb-2 text-lg border-b border-blue-200 pb-1">{parseBold(trimmed.replace(/^###\s*/, ''))}</h4>;
      }

      // 2. Bullet points (*, -, •)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
         return (
           <div key={index} className="flex items-start gap-2 mb-2 ml-1">
              <span className="text-blue-500 mt-1.5 text-[10px] shrink-0">●</span>
              <p className="text-blue-800 text-sm leading-relaxed">{parseBold(trimmed.replace(/^[\*\-•]\s*/, ''))}</p>
           </div>
         );
      }

      // 3. Numbered lists (1., 2.)
      if (/^\d+\./.test(trimmed)) {
         const numberMatch = trimmed.match(/^(\d+\.)\s*/);
         const number = numberMatch ? numberMatch[1] : '';
         const content = trimmed.replace(/^\d+\.\s*/, '');
         return (
           <div key={index} className="flex items-start gap-2 mb-2 ml-1">
              <span className="text-blue-700 font-bold text-sm mt-0.5 shrink-0 min-w-[1.5em]">{number}</span>
              <p className="text-blue-800 text-sm leading-relaxed">{parseBold(content)}</p>
           </div>
         );
      }

      // 4. Standard Paragraphs (with bold headers check)
      // Sometimes headers come as **Header:** without ###
      if (trimmed.startsWith('**') && trimmed.includes('**') && trimmed.length < 60 && !trimmed.endsWith('.')) {
          return <h4 key={index} className="text-blue-900 font-bold mt-4 mb-2 text-base">{parseBold(trimmed)}</h4>;
      }

      return <p key={index} className="text-blue-800 text-sm mb-2 leading-relaxed">{parseBold(trimmed)}</p>;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-slide-in">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT PANEL */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
            <div className="relative aspect-square bg-slate-100 flex items-center justify-center">
               {imageUrl ? (
                   isVideo ? (
                       <video src={imageUrl} controls className="w-full h-full object-cover" />
                   ) : (
                       <img src={imageUrl} alt="Analyzed Plant" className="w-full h-full object-cover" />
                   )
               ) : (
                   <div className="text-slate-400 flex flex-col items-center">
                       <Video className="w-12 h-12 mb-2" />
                       <span>Preview not saved</span>
                   </div>
               )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                {result.date ? new Date(result.date).toLocaleDateString() : new Date().toLocaleDateString()}
              </div>
            </div>
            <div className="p-6 space-y-3">
              <button 
                onClick={onChat} 
                className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                title="Chat with an AI expert about this specific diagnosis"
              >
                <MessageCircle className="w-4 h-4" /> Ask Expert AI
              </button>
              <button 
                onClick={playAudio} 
                disabled={isPlaying}
                className="w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                title="Listen to the diagnosis report (Text-to-Speech)"
              >
                {isPlaying ? <Loader2 className="w-4 h-4 animate-spin"/> : <Volume2 className="w-4 h-4" />}
                {isPlaying ? "Playing..." : "Listen to Diagnosis"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                 <button 
                    onClick={generatePDF} 
                    className="py-2 border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-50"
                    title="Download detailed report as PDF"
                 >
                    <FileDown className="w-4 h-4" /> PDF
                 </button>
                 <button 
                    className="py-2 border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-50"
                    title="Share this diagnosis via link"
                 >
                    <Share2 className="w-4 h-4" /> Share
                 </button>
              </div>
              <button 
                onClick={onReset} 
                className="w-full text-slate-500 text-sm hover:underline mt-2"
                title="Start a new diagnosis process"
              >
                Analyze Another Plant
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:w-2/3 space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">{result.diseaseName}</h1>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${result.severity === 'Severe' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                        {result.severity} Severity
                    </span>
                    <span className="text-slate-500 font-medium">{result.confidence}% Match</span>
                  </div>
               </div>
            </div>
            <p className="text-slate-700 leading-relaxed text-lg mb-6">{result.description}</p>
            
            {/* GROUNDING SECTION (UPDATED with Formatter) */}
            <div className="mb-6">
                {!groundingInfo && !loadingGrounding && (
                    <button 
                        onClick={fetchGrounding} 
                        className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
                        title="Search Google for real-time research and news"
                    >
                        <Search className="w-4 h-4" /> Check latest research (Search Grounding)
                    </button>
                )}
                {loadingGrounding && <div className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Searching web...</div>}
                {groundingInfo && (
                    <div className="bg-blue-50 p-6 rounded-xl text-sm border border-blue-100 shadow-sm">
                        <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-lg pb-2 border-b border-blue-200">
                            <Search className="w-5 h-5"/> Latest Research (Google Search)
                        </h4>
                        
                        {/* Render Formatted Text Here */}
                        <div className="space-y-1">
                            {renderFormattedText(groundingInfo.text)}
                        </div>

                        {groundingInfo.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-blue-200/50">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Sources</p>
                                <div className="flex flex-wrap gap-2">
                                    {groundingInfo.sources.map((s:any, i) => (
                                        <a key={i} href={s.web?.uri} target="_blank" className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-100 hover:border-blue-300 transition-colors truncate max-w-[200px]" title={s.web?.title}>
                                            {s.web?.title || 'External Link'}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-900 mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Causes</h4>
                    <p className="text-sm text-orange-800">{result.causes}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Timeline</h4>
                    <p className="text-sm text-blue-800">{result.recoveryTimeline} expected recovery</p>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Shield className="w-6 h-6 text-emerald-600"/> Treatments</h2>
             <div className="space-y-6">
                <div>
                   <h3 className="text-lg font-semibold text-emerald-800 mb-3">Organic Solutions</h3>
                   <ul className="space-y-3">
                      {result.organicTreatment.map((t, i) => (
                          <li key={i} className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                              <div className="flex items-start gap-3">
                                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span className="text-emerald-900">{t}</span>
                              </div>
                              <button 
                                onClick={() => onFindTreatment(t)}
                                className="text-xs bg-white text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1 font-medium whitespace-nowrap ml-2"
                                title={`Find stores selling ${t}`}
                              >
                                  <MapPin className="w-3 h-3" /> Find
                              </button>
                          </li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h3 className="text-lg font-semibold text-slate-800 mb-3">Chemical Options</h3>
                   <ul className="space-y-3">
                      {result.chemicalTreatment.map((t, i) => (
                          <li key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i+1}</div>
                                  <span className="text-slate-700">{t}</span>
                              </div>
                              <button 
                                onClick={() => onFindTreatment(t)}
                                className="text-xs bg-white text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors flex items-center gap-1 font-medium whitespace-nowrap ml-2"
                                title={`Find stores selling ${t}`}
                              >
                                  <MapPin className="w-3 h-3" /> Find
                              </button>
                          </li>
                      ))}
                   </ul>
                </div>
             </div>
          </div>
          
          {/* VIDEO TUTORIALS SECTION */}
          {videos.length > 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                 <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                     <Youtube className="w-6 h-6 text-red-600"/> Video Tutorials
                 </h2>
                 <p className="text-slate-500 text-sm mb-4">Curated videos on how to apply treatments effectively.</p>
                 <div className="grid md:grid-cols-2 gap-4">
                     {videos.map((video, idx) => (
                         <a 
                            key={idx} 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col p-4 rounded-xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all group bg-slate-50 hover:bg-white"
                         >
                             <div className="flex items-start gap-3">
                                 <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 group-hover:bg-red-600 transition-colors">
                                     <Youtube className="w-5 h-5 text-red-600 group-hover:text-white" />
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-slate-800 text-sm line-clamp-2 group-hover:text-red-600 transition-colors">
                                         {video.title}
                                     </h4>
                                     <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                         Watch on YouTube <ExternalLink className="w-3 h-3" />
                                     </span>
                                 </div>
                             </div>
                         </a>
                     ))}
                 </div>
              </div>
          )}
          {loadingVideos && (
               <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 gap-2">
                   <Loader2 className="animate-spin w-5 h-5"/> Finding relevant tutorials...
               </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsView;