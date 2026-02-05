import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Image as ImageIcon, Video, X, AlertCircle, Film, AlertTriangle } from 'lucide-react';

interface UploadViewProps {
  onAnalyze: (file: File, type: string, symptoms: string, location: string) => void;
  isProcessing: boolean;
  initialFile?: File | null;
  externalError?: string | null;
}

const UploadView: React.FC<UploadViewProps> = ({ onAnalyze, isProcessing, initialFile, externalError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [plantType, setPlantType] = useState('Tomato');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore state if provided (e.g. when coming back from a failed analysis to preserve user context)
  useEffect(() => {
    if (initialFile) {
        handleFile(initialFile);
    }
  }, [initialFile]);

  const handleFile = (selectedFile: File) => {
    // Support Image AND Video (Gemini 3 Pro)
    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        setLocalError('Please upload a valid image or video file.');
        return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
        setLocalError('File size too large. Max 20MB for browser-based analysis.');
        return;
    }
    setLocalError(null);
    setFile(selectedFile);
    setIsVideo(selectedFile.type.startsWith('video/'));
    setPreview(URL.createObjectURL(selectedFile));
  };

  const toggleSymptom = (sym: string) => {
    setSymptoms(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]);
  };

  const displayError = externalError || localError;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-6 md:p-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">New Diagnosis</h2>
          <p className="text-slate-500 mb-6">Upload a photo OR video (Gemini 3 Pro) to identify diseases.</p>

          {/* SPECIFIC ERROR FEEDBACK CARD */}
          {displayError && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-start gap-4 animate-shake">
                <div className="bg-red-100 p-3 rounded-full shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-red-800 font-bold text-lg mb-1">Analysis Failed</h3>
                    <p className="text-red-700 leading-relaxed mb-2">
                        {displayError}
                    </p>
                    {file && (
                        <div className="text-sm text-red-600/80 font-mono bg-red-100/50 px-3 py-1.5 rounded-lg inline-block border border-red-200/50">
                            File attempted: <strong>{file.name}</strong>
                        </div>
                    )}
                </div>
                <button onClick={() => setLocalError(null)} className="text-red-500 hover:text-red-700">
                    <X className="w-5 h-5" />
                </button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {!preview ? (
                <div 
                  className={`border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center cursor-pointer transition-all group relative ${displayError ? 'border-red-300 bg-red-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-emerald-500'}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Click or drag and drop to upload an image or video"
                >
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className={`h-8 w-8 ${displayError ? 'text-red-400' : 'text-emerald-500'}`} />
                  </div>
                  <p className="text-slate-900 font-medium">Upload Image or Video</p>
                  <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG, MP4</p>
                  
                  <div className="absolute bottom-4 flex gap-2">
                     <button 
                        className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                        title="Open camera to take a photo"
                        onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                     >
                        <Camera className="w-4 h-4" /> Camera
                     </button>
                  </div>
                </div>
              ) : (
                <div className={`relative h-80 rounded-2xl overflow-hidden group shadow-md bg-black ${displayError ? 'ring-4 ring-red-100 border-red-400' : ''}`}>
                  {isVideo ? (
                      <video src={preview} controls className="w-full h-full object-contain" />
                  ) : (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  {/* Overlay Error Indicator on Image if relevant */}
                  {displayError && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                          <X className="w-3 h-3" /> FAILED
                      </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                        onClick={() => { setFile(null); setPreview(null); setLocalError(null); }} 
                        className="bg-white text-red-500 px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-red-50 shadow-lg"
                        title="Remove current file"
                    >
                      <X className="w-4 h-4" /> Remove & Retry
                    </button>
                  </div>
                </div>
              )}
              {/* Accept Image AND Video */}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Plant Type</label>
                <select 
                    value={plantType} 
                    onChange={(e) => setPlantType(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    title="Select the type of plant for more accurate diagnosis"
                >
                  {['Tomato', 'Potato', 'Wheat', 'Corn', 'Rice', 'Citrus', 'Apple', 'Grape', 'Pepper', 'Cotton', 'Soybean', 'Other'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Symptoms</label>
                <div className="flex flex-wrap gap-2">
                    {['Spots', 'Wilting', 'Yellowing', 'Mold', 'Rot', 'Holes', 'Curling', 'Stunted'].map(s => (
                        <button 
                            key={s} 
                            onClick={() => toggleSymptom(s)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                symptoms.includes(s) 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'
                            }`}
                            title={`Select if the plant shows signs of ${s.toLowerCase()}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                <input 
                    type="text" 
                    value={location} 
                    onChange={e => setLocation(e.target.value)} 
                    placeholder="City, Region" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    title="Enter location to help AI consider local weather/pest data"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => file && onAnalyze(file, plantType, symptoms.join(', '), location)}
                  disabled={!file || isProcessing}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    !file || isProcessing 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/20'
                  }`}
                  title={!file ? "Upload a file first" : "Start AI analysis with Gemini Pro"}
                >
                   {isVideo ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                   {isProcessing ? 'Analyzing...' : `Analyze ${isVideo ? 'Video' : 'Image'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadView;