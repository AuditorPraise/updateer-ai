
import React, { useState } from 'react';
import { SavedEmail } from '../types';
import { 
  Layout, 
  Trash2, 
  ArrowLeft, 
  Download, 
  Eye, 
  Search, 
  Calendar,
  FileCode,
  ExternalLink
} from 'lucide-react';

interface SavedDesignsPageProps {
  designs: SavedEmail[];
  onDeleteDesign: (id: string) => void;
  onLoadDesign: (design: SavedEmail) => void;
  onBack: () => void;
}

const SavedDesignsPage: React.FC<SavedDesignsPageProps> = ({ 
  designs, 
  onDeleteDesign, 
  onLoadDesign, 
  onBack 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredDesigns = designs.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchFullDesign = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/designs/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch design');
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleDownload = async (design: SavedEmail) => {
    let html = design.html;
    if (!html) {
      setLoadingId(design.id);
      const full = await fetchFullDesign(design.id);
      setLoadingId(null);
      if (!full) return;
      html = full.html;
    }

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.name.replace(/\s+/g, '_')}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoad = async (design: SavedEmail) => {
    let full = design;
    if (!design.html) {
      setLoadingId(design.id);
      const fetched = await fetchFullDesign(design.id);
      setLoadingId(null);
      if (!fetched) return;
      full = fetched;
    }
    onLoadDesign(full);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Editor
          </button>
        </div>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/20">
            <Layout className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Saved Designs</h1>
            <p className="text-slate-400">Manage and reuse your previously generated email templates.</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search designs by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Design Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDesigns.length > 0 ? (
                  filteredDesigns.map((design) => (
                    <tr key={design.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <FileCode className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-slate-200 truncate max-w-xs">{design.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Calendar className="w-4 h-4" />
                          {new Date(design.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleLoad(design)}
                            disabled={loadingId === design.id}
                            className={`p-2 rounded-lg transition-all ${loadingId === design.id ? 'text-purple-400 bg-purple-400/10 cursor-wait' : 'text-slate-400 hover:text-purple-400 hover:bg-purple-400/10'}`}
                            title="Load in Editor"
                          >
                            {loadingId === design.id ? (
                                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                            ) : (
                                <ExternalLink className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownload(design)}
                            disabled={loadingId === design.id}
                            className={`p-2 rounded-lg transition-all ${loadingId === design.id ? 'text-blue-400 bg-blue-400/10 cursor-wait' : 'text-slate-400 hover:text-blue-400 hover:bg-blue-400/10'}`}
                            title="Download HTML"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteDesign(design.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            title="Delete Design"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-500">
                        <div className="p-4 bg-slate-800/50 rounded-full">
                          <Layout className="w-12 h-12 opacity-20" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <p className="text-lg font-medium text-slate-400">No designs found</p>
                          <p className="text-sm mt-1">Save your generated emails to see them here for future use.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedDesignsPage;
