
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, Cell 
} from 'recharts';
import { 
  ArrowLeft, BarChart3, TrendingUp, MousePointer2, UserMinus, 
  MailCheck, Info, ShieldCheck, Zap, AlertCircle, RefreshCcw
} from 'lucide-react';
import { AnalyticsSummary, CampaignPerformance } from '../types';

interface AnalyticsPageProps {
  onBack: () => void;
  onPricingClick: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack, onPricingClick }) => {
  const [summaryData, setSummaryData] = useState<AnalyticsSummary[]>([]);
  const [performanceData, setPerformanceData] = useState<CampaignPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Fetch Summary Data from Go + Echo Backend
      const summaryRes = await fetch('/api/v1/analytics/summary', { headers, signal: controller.signal, credentials: 'include' });
      if (!summaryRes.ok) throw new Error(`Summary API Error: ${summaryRes.status} ${summaryRes.statusText}`);
      const summary = await summaryRes.json();
      
      // Fetch Performance Data from Go + Echo Backend
      const performanceRes = await fetch('/api/v1/analytics/performance', { headers, signal: controller.signal, credentials: 'include' });
      if (!performanceRes.ok) throw new Error(`Performance API Error: ${performanceRes.status} ${performanceRes.statusText}`);
      const performance = await performanceRes.json();

      setSummaryData(summary);
      setPerformanceData(performance);
    } catch (err: any) {
      console.error('Analytics Fetch Error:', err);
      if (err.name === 'AbortError') {
        setError('Connection timed out. The backend is taking too long to respond.');
      } else {
        setError(err.message || 'Failed to execute \'fetch\' on \'Window\'. Please ensure your Go + Echo backend is running and accessible.');
      }
      setSummaryData([]);
      setPerformanceData([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 animate-pulse font-medium">Establishing connection...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Editor
          </button>
          
          <button 
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/20">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Campaign Analytics</h1>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl px-6 text-center">
            {error.includes('403') ? (
              <>
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                  <Zap className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Subscription Required</h2>
                <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
                  Analytics are available exclusively to subscribed users. Please upgrade your plan to access detailed campaign insights.
                </p>
                <button 
                  onClick={onPricingClick}
                  className="w-full max-w-xs py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  View Subscription Plans
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Backend Connection Failed</h2>
                <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
                  {error}
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button 
                    onClick={fetchAnalytics}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Try Again
                  </button>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Expected Endpoints</p>
                    <code className="text-[11px] text-blue-400 block">GET /api/v1/analytics/summary</code>
                    <code className="text-[11px] text-blue-400 block">GET /api/v1/analytics/performance</code>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {summaryData
                .filter(stat => !['Delivered', 'Unique Opens', 'Total Clicks', 'Bounces'].includes(stat.name))
                .map((stat) => (
                <div key={stat.name} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-colors">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.name}</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-3xl font-bold">{stat.value.toLocaleString()}</h3>
                    <div className="p-2 rounded-lg bg-slate-800">
                      {stat.name.includes('Sent') && <MailCheck className="w-4 h-4 text-slate-400" />}
                      {stat.name.includes('Delivered') && <ShieldCheck className="w-4 h-4 text-green-400" />}
                      {stat.name.includes('Opens') && <TrendingUp className="w-4 h-4 text-purple-400" />}
                      {stat.name.includes('Clicks') && <MousePointer2 className="w-4 h-4 text-blue-400" />}
                      {stat.name.includes('Bounces') && <Info className="w-4 h-4 text-amber-400" />}
                      {stat.name.includes('Complaints') && <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Engagement Over Time
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Legend iconType="circle" />
                      <Line type="monotone" dataKey="opens" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Interaction Breakdown
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {summaryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-blue-600/10 border border-blue-500/30 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold">2026 Compliance & Deliverability</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Zap className="w-4 h-4 fill-blue-400" />
                One-Click Unsubscribe
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                To comply with 2026 email standards, updateer ai automatically includes <strong>List-Unsubscribe</strong> and <strong>List-Unsubscribe-Post</strong> headers. This allows email clients like Gmail to show an "Unsubscribe" button at the top of the app, improving your sender reputation.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <MailCheck className="w-4 h-4" />
                BIMI Adoption
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your brand logo is automatically formatted for BIMI (Brand Indicators for Message Identification). This ensures your verified logo appears in the recipient's inbox, increasing trust and open rates by up to 15%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
