import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquare, Loader2, Volume2, AlertCircle, Radio, Upload } from 'lucide-react';
import { chatWithExpert, generateSpeech, playGeneratedAudio, fileToBase64 } from '../services/geminiService';

// Add type definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceAssistantView: React.FC = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // NATIVE: Chrome/Safari Speech Recognition
  const recognitionRef = useRef<any>(null);
  const [mode, setMode] = useState<'NATIVE' | 'FALLBACK'>('NATIVE');

  // FALLBACK: Firefox/Other MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // FILE UPLOAD
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
      { role: 'bot', text: "Hello! I'm your PlantMD assistant powered by Gemini 3 Pro. Ask me anything about your crops." }
  ]);

  useEffect(() => {
    // Check for Native Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Stop after one sentence/phrase for cleaner interaction
      recognitionRef.current.interimResults = true; // Show results as speaking

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Prefer final, fall back to interim
        if (finalTranscript) {
            setTranscript(prev => finalTranscript);
        } else if (interimTranscript) {
            setTranscript(prev => interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            setError("Microphone access denied. Please allow permissions.");
            setListening(false);
        } else if (event.error === 'no-speech') {
            // Ignore no-speech error, just stop listening UI
        } else {
            // Switch to fallback if native fails for other reasons (often happens in some browsers)
             setMode('FALLBACK');
        }
      };

      recognitionRef.current.onend = () => {
        setListening(false);
      };
    } else {
      console.log("Native speech recognition unavailable. Switching to Audio Recording mode.");
      setMode('FALLBACK');
    }

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    };
  }, []);

  // --- FALLBACK: RECORD AUDIO (Firefox) ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Create Audio Blob
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // Stop all tracks to release mic
            stream.getTracks().forEach(track => track.stop());

            // Process with Gemini
            await processAudio(audioBlob);
        };

        mediaRecorder.start();
        setListening(true);
        setError(null);
    } catch (err) {
        console.error("Mic Error:", err);
        setError("Microphone access is required.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && listening) {
          mediaRecorderRef.current.stop();
          setListening(false);
      }
  };

  // --- NATIVE: LISTEN (Chrome) ---
  const toggleListening = () => {
    if (mode === 'FALLBACK') {
        if (listening) stopRecording();
        else startRecording();
    } else {
        // Native Logic
        if (!recognitionRef.current) return;
        if (listening) {
            recognitionRef.current.stop();
            setListening(false);
        } else {
            setError(null);
            setTranscript('');
            try {
                recognitionRef.current.start();
                setListening(true);
            } catch (e) {
                console.error("Failed to start recognition", e);
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            }
        }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
      setIsLoading(true);
      setTranscript("Processing audio...");

      try {
          const base64Data = await fileToBase64(audioBlob);
          // Gemini 3 Pro (Multimodal)
          const result = await chatWithExpert(
              messages, 
              "", // Empty text prompt
              { mimeType: audioBlob.type || 'audio/webm', data: base64Data }
          );

          setTranscript('');
          setMessages(prev => [...prev, { role: 'user', text: result.userText }]);
          setMessages(prev => [...prev, { role: 'bot', text: result.botResponse }]);
          
          speakResponse(result.botResponse);

      } catch (e) {
          console.error(e);
          setError("Failed to process audio.");
          setTranscript("");
      } finally {
          setIsLoading(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          e.target.value = ''; // Reset input
          processAudio(file);
      }
  };

  const handleSendText = async () => {
      if (!transcript) return;
      const userText = transcript;
      setTranscript('');
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
      setIsLoading(true);

      const result = await chatWithExpert(messages, userText);
      
      setMessages(prev => [...prev, { role: 'bot', text: result.botResponse }]);
      setIsLoading(false);

      speakResponse(result.botResponse);
  };

  const speakResponse = async (text: string) => {
      try {
          setIsSpeaking(true);
          const audioData = await generateSpeech(text);
          await playGeneratedAudio(audioData);
      } catch (e) {
          console.error("TTS failed", e);
      } finally {
          setIsSpeaking(false);
      }
  };

  return (
    <div className="max-w-md mx-auto h-[80vh] flex flex-col bg-white rounded-3xl shadow-xl border border-slate-100 my-8 overflow-hidden">
        <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h2 className="font-bold">Expert Chat {mode === 'FALLBACK' && '(Audio Mode)'}</h2>
            </div>
            {isSpeaking && <Volume2 className="w-5 h-5 animate-pulse" />}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                        {m.text}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                </div>
            )}
            
            {listening && (
                <div className={`text-center text-sm animate-pulse font-medium flex items-center justify-center gap-2 ${mode === 'FALLBACK' ? 'text-red-500' : 'text-emerald-600'}`}>
                    {mode === 'FALLBACK' ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {mode === 'FALLBACK' ? 'Recording Audio...' : 'Listening...'}
                </div>
            )}

            {error && <div className="text-center text-red-500 text-xs flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3"/> {error}</div>}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
                {/* Audio File Upload */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="audio/*" 
                    onChange={handleFileUpload} 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-slate-100 transition-colors shadow-sm"
                    title="Upload Audio File"
                    disabled={listening || isLoading}
                >
                    <Upload className="w-5 h-5" />
                </button>

                <button 
                    onClick={toggleListening}
                    className={`p-3 rounded-full transition-all shadow-sm ${listening ? (mode === 'FALLBACK' ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500 text-white scale-110') : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    title={listening ? "Stop" : "Start Voice Input"}
                >
                    {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input 
                    type="text" 
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendText()}
                    placeholder={mode === 'FALLBACK' && listening ? "Recording..." : "Ask Gemini Pro..."}
                    disabled={listening && mode === 'FALLBACK'}
                    className="flex-1 p-3 rounded-full border border-slate-200 outline-none focus:border-emerald-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400"
                    title="Type your question here"
                />
                <button 
                    onClick={handleSendText} 
                    disabled={isLoading || !transcript.trim() || (listening && mode === 'FALLBACK')} 
                    className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                    title="Send message"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};

export default VoiceAssistantView;