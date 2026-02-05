import React from 'react';
import { PlantHistoryItem } from '../types';
import { Clock, ChevronRight, FileVideo, Sprout } from 'lucide-react';

interface HistoryViewProps {
    onViewReport: (item: PlantHistoryItem) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onViewReport }) => {
  // Only use local storage data (Real User History)
  const displayData: PlantHistoryItem[] = JSON.parse(localStorage.getItem('plantHistory') || '[]');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Diagnosis History</h1>
          <p className="text-slate-500 mt-1">Your past AI analysis results.</p>
        </div>
        {displayData.length > 0 && (
            <button 
                className="text-emerald-600 font-semibold hover:text-emerald-700"
                onClick={() => alert("Export feature coming soon!")}
            >
                Export All (PDF)
            </button>
        )}
      </div>

      {displayData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sprout className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No history yet</h3>
              <p className="text-slate-500">Upload a plant photo to start your diagnosis history.</p>
          </div>
      ) : (
        <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg shadow-emerald-900/10">
                <h3 className="text-emerald-100 font-medium mb-1">Total Diagnoses</h3>
                <p className="text-4xl font-bold">{displayData.length}</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                {displayData.map((item, index) => (
                    <div 
                        key={item.id || index} 
                        className="p-4 md:p-6 flex items-center hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => onViewReport(item)}
                    >
                    {item.image ? (
                        <img src={item.image} alt={item.plantType} className="w-16 h-16 rounded-lg object-cover mr-6 shadow-sm" />
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center mr-6 text-slate-400">
                            <FileVideo className="w-8 h-8" />
                        </div>
                    )}
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-slate-900 text-lg">{item.plantType}</h4>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.date ? new Date(item.date).toLocaleDateString() : 'Recent'}
                        </span>
                        </div>
                        <div className="flex items-center gap-2">
                        <p className="text-slate-600 text-sm line-clamp-1">{item.diseaseName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            item.severity === 'Severe' ? 'bg-red-50 text-red-600 border-red-100' :
                            item.severity === 'Moderate' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-yellow-50 text-yellow-600 border-yellow-100'
                        }`}>
                            {item.severity}
                        </span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 mr-6">
                        <button 
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewReport(item);
                            }}
                        >
                            View Report
                        </button>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                ))}
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default HistoryView;