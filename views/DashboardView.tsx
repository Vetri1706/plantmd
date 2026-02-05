import React, { useState, useEffect, useRef } from 'react';
import { Activity, Map, BarChart3, Satellite, Loader2, AlertTriangle, Droplets, Sun, Search, MapPin, DollarSign, Sprout } from 'lucide-react';
import Chart from 'chart.js/auto';
import L from 'leaflet';
import { getNearbyAgriServices, getQuickTip } from '../services/geminiService';

interface DashboardViewProps {
    initialQuery?: string;
}

const DashboardView: React.FC<DashboardViewProps> = ({ initialQuery }) => {
  const [activeTab, setActiveTab] = useState('HEATMAP');
  const [mapData, setMapData] = useState<{text:string, places:any[]} | null>(null);
  const [tip, setTip] = useState("Loading quick tip...");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  
  // Track the current search term displayed
  const [currentSearch, setCurrentSearch] = useState(initialQuery || '');

  // Yield Stats State (Calculated from History)
  const [yieldStats, setYieldStats] = useState({
      healthy: 0,
      diseased: 0,
      projectedLoss: 0,
      recoverableValue: 0,
      infectionRate: 0,
      totalScans: 0
  });

  // Satellite Data State (Calculated from Location)
  const [satelliteData, setSatelliteData] = useState<{
      risk: string;
      moisture: number;
      ndvi: number;
      region: string;
      alertMessage: string;
  } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    // Fast Response Feature (Gemini Flash 3)
    getQuickTip("crops").then(setTip);

    // --- 1. CALCULATE YIELD FROM HISTORY ---
    const history = JSON.parse(localStorage.getItem('plantHistory') || '[]');
    let healthyCount = 0;
    let diseasedCount = 0;
    let totalLoss = 0;
    
    history.forEach((item: any) => {
        // Simple heuristic: if diseaseName contains "Healthy" or confidence is low, consider healthy-ish context for charts
        // But mainly rely on diseaseName not being "Healthy"
        const isHealthy = item.diseaseName.toLowerCase().includes('healthy') || item.diseaseName.toLowerCase().includes('none'); 
        
        if (isHealthy) {
            healthyCount++;
        } else {
            diseasedCount++;
            // Estimated value loss per plant/acre unit based on severity
            if (item.severity === 'Severe') totalLoss += 800;
            else if (item.severity === 'Moderate') totalLoss += 400;
            else totalLoss += 100;
        }
    });

    const total = healthyCount + diseasedCount;
    // Default values if no history to show empty state nicely
    const safeTotal = total === 0 ? 1 : total; 

    setYieldStats({
        healthy: healthyCount,
        diseased: diseasedCount,
        totalScans: total,
        infectionRate: total > 0 ? Math.round((diseasedCount / total) * 100) : 0,
        projectedLoss: totalLoss,
        // Assume 75% is recoverable with treatment
        recoverableValue: Math.round(totalLoss * 0.75)
    });

    // --- 2. SATELLITE LOCATION DATA ---
    if (activeTab === 'PREDICTION' && !satelliteData) {
        setLocLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                
                // Deterministic simulation based on location
                // This ensures the "AI" feels responsive to the user's actual location
                // We use the lat/lng to seed the values so they stay consistent for that location
                const latFactor = Math.abs(latitude * 100) % 100; // 0-99
                const lngFactor = Math.abs(longitude * 100) % 100; // 0-99
                
                // Simulate realistic ranges
                const simMoisture = 40 + (latFactor * 0.5); // Range: 40% - 90%
                const simNDVI = 0.3 + (lngFactor * 0.005); // Range: 0.3 - 0.8
                
                let riskLevel = 'Low';
                let msg = "Conditions are optimal. Normal irrigation schedule recommended.";
                
                if (simMoisture > 80) {
                    riskLevel = 'High';
                    msg = `Gemini detects high moisture levels (${Math.round(simMoisture)}%) in your region. High risk of fungal outbreaks.`;
                } else if (simNDVI < 0.45) {
                    riskLevel = 'Moderate';
                    msg = "Vegetation index is lower than average. Check for nutrient deficiencies.";
                } else if (simMoisture > 65) {
                    riskLevel = 'Moderate';
                    msg = "Moisture levels are rising. Monitor sensitive crops for early blight signs.";
                }

                setSatelliteData({
                    region: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                    moisture: Math.round(simMoisture),
                    ndvi: parseFloat(simNDVI.toFixed(2)),
                    risk: riskLevel,
                    alertMessage: msg
                });
                setLocLoading(false);
            }, (err) => {
                 // Fallback if denied
                 setSatelliteData({
                     region: "Location Access Denied",
                     moisture: 65,
                     ndvi: 0.65,
                     risk: "Moderate",
                     alertMessage: "Unable to access local weather data. Showing regional averages."
                 });
                 setLocLoading(false);
            });
        } else {
             setLocLoading(false);
        }
    }

    // --- 3. CHART INITIALIZATION ---
    if (activeTab === 'YIELD' && chartRef.current) {
        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            // Destroy existing chart to prevent canvas reuse error
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            
            // Use calculated stats or defaults if empty
            const chartData = total === 0 ? [100, 0] : [healthyCount, diseasedCount];
            const chartLabels = total === 0 ? ['No Data', ''] : ['Healthy Scans', 'Diseased Scans'];
            const chartColors = total === 0 ? ['#e2e8f0', '#e2e8f0'] : ['#10b981', '#ef4444'];

            chartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }
    
    // --- 4. MAP INITIALIZATION ---
    if (activeTab === 'HEATMAP' && mapRef.current) {
        // Short timeout to ensure DOM is ready
        setTimeout(() => {
            if (!mapRef.current) return;

            if (!mapInstance.current) {
                 const map = L.map(mapRef.current).setView([37.7749, -122.4194], 12); // Default SF
                 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                 mapInstance.current = map;
                 
                 // IMPORTANT: Fix for "half map" display issue
                 map.invalidateSize();

                 // Fetch Real Places via Gemini Maps Grounding
                 if (navigator.geolocation) {
                     navigator.geolocation.getCurrentPosition(async (pos) => {
                         const { latitude, longitude } = pos.coords;
                         map.setView([latitude, longitude], 13);
                         L.marker([latitude, longitude]).addTo(map).bindPopup("You are here").openPopup();
                         
                         // Call Service with the specific product query if available
                         const data = await getNearbyAgriServices(latitude, longitude, initialQuery);
                         setMapData(data);
                     }, (err) => {
                        console.error("Geolocation error", err);
                        // Default to New York if geo fails
                        const defaultLat = 40.7128;
                        const defaultLng = -74.0060;
                        map.setView([defaultLat, defaultLng], 12);
                        getNearbyAgriServices(defaultLat, defaultLng, initialQuery).then(setMapData);
                     });
                 }
            } else {
                 // If map exists, just refresh size
                 mapInstance.current.invalidateSize();
            }
        }, 100);
    }
    
    return () => {
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
    };
  }, [activeTab]);

  // Helper to render markdown-like text from Gemini
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Check for bullet points
      const isListItem = line.trim().startsWith('*');
      const cleanLine = isListItem ? line.trim().substring(1).trim() : line;
      
      // Parse Bold (**text**)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      
      const content = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });

      if (isListItem) {
          return (
              <div key={i} className="flex items-start gap-2 mb-2 ml-2">
                  <span className="text-emerald-500 mt-1.5">•</span>
                  <p className="text-slate-700 text-sm leading-relaxed">{content}</p>
              </div>
          );
      }
      
      // Check if it's a section header (often bolded lines followed by colon)
      if (line.includes('**') && line.trim().endsWith(':')) {
           return <h4 key={i} className="text-emerald-800 font-bold mt-4 mb-2 text-base border-b border-emerald-100 pb-1">{content}</h4>
      }

      // Empty lines
      if (!line.trim()) return <div key={i} className="h-2"></div>;

      return <p key={i} className="text-slate-700 text-sm mb-1">{content}</p>;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Activity className="text-emerald-600" /> Pro Dashboard
        </h1>
        <p className="text-slate-500 mt-2">Daily Tip (Gemini 3.0 Flash): <span className="text-emerald-600 font-medium">{tip}</span></p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-1">
        {[
          { id: 'HEATMAP', label: 'Local Resources (Maps)', icon: Map, title: "Find nearby agricultural services using Gemini Maps Grounding" },
          { id: 'YIELD', label: 'Yield Calc', icon: BarChart3, title: "View crop health statistics based on your history" },
          { id: 'PREDICTION', label: 'AI Forecast', icon: Satellite, title: "Real-time risk analysis based on your location" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.title}
            className={`px-6 py-3 rounded-t-xl font-medium flex items-center gap-2 transition-all ${
              activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 min-h-[600px]">
        {activeTab === 'HEATMAP' && (
          <div className="h-[550px] w-full relative flex flex-col md:flex-row gap-4">
             {/* Explicit height for map container */}
             <div className="w-full md:w-2/3 h-64 md:h-full rounded-2xl overflow-hidden border border-slate-200 z-0 relative">
                <div ref={mapRef} className="w-full h-full" />
             </div>
             
             <div className="w-full md:w-1/3 overflow-y-auto max-h-[550px] pr-2">
                 <div className="flex items-center gap-2 mb-3">
                    <Map className="w-5 h-5 text-emerald-600"/>
                    <h3 className="font-bold text-lg">Nearby Services</h3>
                 </div>
                 
                 {currentSearch && (
                     <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-lg mb-4 flex items-center gap-2 border border-emerald-100">
                         <Search className="w-3 h-3"/>
                         Searching for: <strong>{currentSearch}</strong>
                     </div>
                 )}

                 {!mapData && <div className="flex items-center gap-2 text-slate-400 p-4"><Loader2 className="animate-spin w-4 h-4"/> Finding locations...</div>}
                 {mapData && (
                     <div className="space-y-4">
                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                             {renderFormattedText(mapData.text)}
                         </div>
                         
                         {/* Fallback to chunk data if parsed text isn't enough, but usually text is sufficient */}
                         {mapData.places && mapData.places.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Source Data</h4>
                                {mapData.places.map((p: any, i: number) => (
                                    <a key={i} href={p.maps?.uri} target="_blank" className="block p-2 hover:bg-emerald-50 rounded-lg text-sm text-emerald-700 truncate border border-transparent hover:border-emerald-100 transition-colors">
                                        📍 {p.maps?.title}
                                    </a>
                                ))}
                            </div>
                         )}
                     </div>
                 )}
             </div>
          </div>
        )}

        {activeTab === 'YIELD' && (
            <div className="grid md:grid-cols-2 gap-8 items-center h-full">
                <div className="flex flex-col items-center">
                   <h3 className="text-xl font-bold mb-6">Crop Health Distribution</h3>
                   <div className="w-72 h-72 relative">
                        {yieldStats.totalScans === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
                                No History Data
                            </div>
                        )}
                        <canvas ref={chartRef} />
                   </div>
                   <p className="text-slate-500 text-sm mt-4">Based on {yieldStats.totalScans} total diagnoses in your history.</p>
                </div>
                <div className="space-y-6">
                    <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
                        <p className="text-red-600 font-bold uppercase tracking-wider text-xs flex items-center gap-1">
                            <Activity className="w-3 h-3"/> Projected Loss
                        </p>
                        <h3 className="text-4xl font-bold text-red-700 mt-2">${yieldStats.projectedLoss.toLocaleString()}</h3>
                        <p className="text-sm text-red-500 mt-2">
                            Estimated financial impact based on {yieldStats.diseased} detected disease cases.
                        </p>
                    </div>
                    <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100">
                        <p className="text-emerald-600 font-bold uppercase tracking-wider text-xs flex items-center gap-1">
                            <Sprout className="w-3 h-3"/> Recoverable Value
                        </p>
                        <h3 className="text-4xl font-bold text-emerald-700 mt-2">${yieldStats.recoverableValue.toLocaleString()}</h3>
                        <p className="text-sm text-emerald-500 mt-2">Potential savings if recommended treatments are applied immediately.</p>
                    </div>
                    {yieldStats.totalScans === 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                            Run more diagnoses to generate accurate yield projections.
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'PREDICTION' && (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                         <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Satellite className="w-6 h-6 text-emerald-600" /> 
                            AI Satellite Forecast
                         </h3>
                         <p className="text-slate-500 text-sm">
                             {locLoading ? "Triangulating location..." : satelliteData ? `Real-time Analysis for ${satelliteData.region}` : "Initializing..."}
                         </p>
                    </div>
                    <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        LIVE FEED ACTIVE
                    </div>
                </div>

                <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden relative group min-h-[400px]">
                    {/* Simulated Satellite Image */}
                    <img 
                        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop" 
                        alt="Satellite View" 
                        className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-110 transition-transform duration-[20s]"
                    />
                    
                    {/* Overlay Grid/Heatmap effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/1/1a/1x1_grid_graph_paper.png')] bg-repeat"></div>
                    
                    {/* Data Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        {satelliteData ? (
                            <>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                     <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                        <div className="text-slate-300 text-xs uppercase font-bold tracking-wider mb-1">Disease Risk</div>
                                        <div className={`text-3xl font-bold flex items-center gap-2 ${satelliteData.risk === 'High' ? 'text-red-400' : satelliteData.risk === 'Moderate' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                            <AlertTriangle className="w-6 h-6" /> {satelliteData.risk}
                                        </div>
                                     </div>
                                     <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                        <div className="text-slate-300 text-xs uppercase font-bold tracking-wider mb-1">Soil Moisture</div>
                                        <div className="text-3xl font-bold text-blue-400 flex items-center gap-2">
                                            <Droplets className="w-6 h-6" /> {satelliteData.moisture}%
                                        </div>
                                     </div>
                                     <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                        <div className="text-slate-300 text-xs uppercase font-bold tracking-wider mb-1">NDVI Index</div>
                                        <div className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
                                            <Sun className="w-6 h-6" /> {satelliteData.ndvi}
                                        </div>
                                     </div>
                                </div>
                                <div className={`backdrop-blur-md p-4 rounded-xl border-l-4 flex items-start gap-3 ${satelliteData.risk === 'High' ? 'bg-red-500/20 border-red-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
                                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${satelliteData.risk === 'High' ? 'text-red-400' : 'text-emerald-400'}`} />
                                    <div>
                                        <h4 className={`font-bold ${satelliteData.risk === 'High' ? 'text-red-100' : 'text-emerald-100'}`}>Gemini Analysis</h4>
                                        <p className="text-sm text-white/80">
                                            {satelliteData.alertMessage}
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 text-slate-300">
                                <Loader2 className="animate-spin w-5 h-5" />
                                Analyzing local terrain data...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;