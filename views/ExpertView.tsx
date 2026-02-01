import React, { useEffect, useState } from 'react';
import { Star, MapPin, Phone, Mail, Calendar, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { ExpertProfile } from '../types';
import { findExpertsNearby } from '../services/geminiService';

const ExpertView: React.FC = () => {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const results = await findExpertsNearby(pos.coords.latitude, pos.coords.longitude);
                if (results.length === 0) {
                     setError("No specific experts found nearby. Try checking the Map in Dashboard.");
                }
                setExperts(results);
            } catch (err) {
                setError("Failed to load expert data.");
            } finally {
                setLoading(false);
            }
        }, (err) => {
             setError("Location access needed to find local experts.");
             setLoading(false);
        });
    } else {
        setError("Geolocation not supported.");
        setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Expert Network (Real-Time)</h1>
        <p className="text-slate-500 mt-2">Connect with verified professionals near you found via Google Maps.</p>
      </div>

      {loading && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
              <p>Searching for agronomists near you...</p>
          </div>
      )}

      {error && !loading && (
          <div className="bg-yellow-50 p-6 rounded-2xl text-center border border-yellow-100">
              <p className="text-yellow-700 font-medium">{error}</p>
          </div>
      )}

      {!loading && !error && experts.length === 0 && (
          <div className="text-center text-slate-500 py-12">No experts found in this area.</div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experts.map(expert => (
          <div key={expert.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg transition-all group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                    <img src={expert.imageUrl} alt={expert.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white" title="Verified Location">
                        <CheckCircle className="w-3 h-3" />
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-slate-700">{expert.rating?.toFixed(1)}</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1" title={expert.name}>{expert.name}</h3>
              <p className="text-emerald-600 font-medium text-sm mb-1">{expert.role}</p>
              
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-6 bg-slate-50 p-2 rounded-lg inline-block">
                <MapPin className="w-3 h-3 inline mr-1" />
                <span>{expert.distance}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a 
                  href={(expert as any).mapsUri} 
                  target="_blank"
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  title="View on Google Maps"
                >
                  <ExternalLink className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">View on Maps</span>
                </a>
                <button 
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 transition-colors border border-transparent hover:border-emerald-100 cursor-not-allowed opacity-60"
                    title="Booking coming soon"
                >
                  <Calendar className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">Book</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpertView;