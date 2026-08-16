import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  BarChart3
} from 'lucide-react';
import { apiFetch } from '../services/apiClient';

interface RiskScoreTabProps {
  onAddLog?: (action: string, severity: 'low' | 'medium' | 'high' | 'critical') => void;
}

interface RiskCategory {
  name: string;
  score: number;
  weight: number;
  trend: 'up' | 'down' | 'stable';
  details: string;
}

export default function RiskScoreTab({ onAddLog }: RiskScoreTabProps) {
  const [overallScore, setOverallScore] = useState(0);
  const [historicalScores, setHistoricalScores] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [riskCategories, setRiskCategories] = useState<RiskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [factors, setFactors] = useState({ criticalVulnerabilities: 0, highRiskItems: 0, mediumRiskItems: 0, lowRiskItems: 0, lastAssessment: '' });

  const fetchRiskScore = async () => {
    try {
      setApiError(null);
      const res = await apiFetch('/api/analytics/risk-score');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setOverallScore(data.overallScore);
        setHistoricalScores(data.historicalScores || []);
        setRiskCategories(data.categories || []);
        if (data.factors) setFactors(data.factors);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to fetch risk score data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskScore();
    const interval = setInterval(fetchRiskScore, 10000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Medium Risk';
    if (score >= 40) return 'High Risk';
    return 'Critical Risk';
  };

  const getGaugeColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const gaugeRotation = (overallScore / 100) * 180 - 90;
  const maxHistorical = Math.max(...historicalScores);
  const minHistorical = Math.min(...historicalScores);

  return (
    <div className="space-y-6" id="risk-score-tab">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-bold">
          Failed to load risk score data: {apiError}
        </div>
      )}
      {loading ? (
        <div className="bg-[#121212] rounded-2xl p-12 border border-zinc-800/80 shadow-xs flex items-center justify-center">
          <span className="text-xs text-zinc-400 font-bold">Loading risk assessment...</span>
        </div>
      ) : (
        <div className="bg-[#121212] rounded-2xl p-6 border border-zinc-800/80 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">Risk Score</h2>
                <p className="text-xs text-zinc-400 font-semibold">Overall server security risk assessment</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#27272a" strokeWidth="16" />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={getGaugeColor(overallScore)}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallScore / 100) * 502} 502`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black ${getScoreColor(overallScore)}`}>{overallScore}</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{getScoreLabel(overallScore)}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {overallScore >= 80 ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : overallScore >= 60 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldX className="w-5 h-5 text-red-400" />
                )}
                <span className="text-sm font-bold text-zinc-300">
                  {overallScore >= 80 ? 'Security posture is strong' : overallScore >= 60 ? 'Moderate improvements needed' : 'Immediate action required'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Historical Trend (30 days)
            </h3>
            <div className="h-48 flex items-end gap-1">
              {historicalScores.map((score, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-indigo-500/80 rounded-t hover:bg-indigo-400 transition-all cursor-pointer relative group"
                  style={{ height: `${(score / 100) * 100}%`, minHeight: '4px' }}
                  title={`Day ${idx + 1}: ${score}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {score}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500 font-medium">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">Risk Breakdown by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riskCategories.map(category => (
              <div
                key={category.name}
                className={`bg-[#18181b] rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === category.name ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-zinc-800/60'
                }`}
                onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-300">{category.name}</span>
                  <div className="flex items-center gap-2">
                    {category.trend === 'up' ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : category.trend === 'down' ? (
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full bg-zinc-600" />
                    )}
                    <span className={`text-sm font-black ${getScoreColor(category.score)}`}>{category.score}</span>
                  </div>
                </div>
                <div className="w-full bg-[#27272a] h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${getScoreColor(category.score).replace('text-', 'bg-')}`}
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                {selectedCategory === category.name && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-xs text-zinc-400 leading-relaxed">{category.details}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500">
                      <Info className="w-3 h-3" />
                      <span>Weight: {(category.weight * 100).toFixed(0)}% of overall score</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Risk Factor Details</h3>
          <div className="bg-[#18181b] rounded-xl border border-zinc-800/60 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Critical Vulnerabilities</span>
                <span className="text-xs font-black text-red-400">{factors.criticalVulnerabilities}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">High Risk Items</span>
                <span className="text-xs font-black text-orange-400">{factors.highRiskItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Medium Risk Items</span>
                <span className="text-xs font-black text-amber-400">{factors.mediumRiskItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Low Risk Items</span>
                <span className="text-xs font-black text-emerald-400">{factors.lowRiskItems}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs font-bold text-zinc-300">Last Assessment</span>
                <span className="text-xs font-black text-zinc-100">{factors.lastAssessment}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
