
import React, { useState } from 'react';
import { GeneratedEmail, UserProfile } from '../../types';
import { Eye, Code, FileJson, Download, Copy, Check, CreditCard, Save, Send, Zap, Mail, AlertTriangle } from 'lucide-react';

interface PreviewAreaProps {
  data: GeneratedEmail | null;
  loading: boolean;
  user: UserProfile | null;
  onExport: () => boolean;
  onPricingClick: () => void;
  onSave: () => void;
  onSendOut: () => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ data, loading, user, onExport, onPricingClick, onSave, onSendOut }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'metadata'>('preview');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const isExpired = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) < new Date() : false;
  const isTrialFinished = user ? !user.isSubscribed && user.credits <= 0 : false;
  const showSubscriptionPrompt = isExpired || isTrialFinished;

  const handleCopy = () => {
    const text = activeTab === 'code' ? data?.reactCode : JSON.stringify(data?.metadata, null, 2);
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDownload = () => {
    if (!data) return;
    
    const allowed = onExport();
    if (!allowed) return;

    const blob = new Blob([data.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-template-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-12">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-8 h-8 text-blue-500 fill-blue-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Generating...
        </h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-12 text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
          <Mail className="w-10 h-10 text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-300">Ready to Design</h2>
        <p className="text-slate-500 max-w-sm mb-8">
          Fill in the details on the left to generate a high-performance email template instantly.
        </p>
        
        {showSubscriptionPrompt && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-amber-400 text-sm font-medium">
              {isExpired ? 'Your subscription has expired.' : 'Your free trial has ended.'}
            </p>
            <button 
              onClick={onPricingClick}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-xl border border-slate-800 transition-all shadow-lg hover:shadow-blue-900/10 hover:border-blue-500/30"
            >
              <CreditCard className="w-4 h-4" />
              View Subscription Plans
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'preview' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            Live Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'code' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            React Code
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'metadata' ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-4 h-4" />
            Metadata
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-all border border-slate-700"
          >
            {saved ? <Check className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save Design'}
          </button>
          <button
            onClick={onSendOut}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Send className="w-4 h-4" />
            Send Out
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-all border border-slate-700"
          >
            <Download className="w-4 h-4" />
            Export HTML
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
        {activeTab === 'preview' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden min-h-[600px] ring-1 ring-slate-800">
            <iframe
              srcDoc={data.html}
              title="Email Preview"
              className="w-full h-full min-h-[800px] border-none"
            />
          </div>
        )}

        {activeTab === 'code' && (
          <div className="max-w-4xl mx-auto">
            <pre className="bg-slate-900 p-6 rounded-xl border border-slate-800 overflow-x-auto text-sm font-mono text-blue-300 leading-relaxed shadow-2xl">
              <code>{data.reactCode}</code>
            </pre>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
              <h3 className="text-lg font-semibold mb-6 text-slate-200 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-400" />
                Campaign Insights
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Subject Line</span>
                  <span className="text-white font-medium">{data.metadata?.subjectLine || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Category</span>
                  <span className="text-white font-medium">{data.metadata?.category || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Estimated Read Time</span>
                  <span className="text-white font-medium">{data.metadata?.estimatedReadTime || 0} min</span>
                </div>
              </div>
              <div className="mt-8">
                <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-500 font-mono border border-slate-800">
                  {JSON.stringify(data.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewArea;
