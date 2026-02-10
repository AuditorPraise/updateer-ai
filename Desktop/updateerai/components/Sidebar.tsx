
import React, { useRef, useState } from 'react';
import { EmailType, EmailConfig } from '../types';
import { 
  Mail, Sparkles, Layout, Send, Link as LinkIcon, LogOut, Settings, Info, Users, Zap, ChevronRight, 
  Type as TypeIcon, Image as ImageIcon, Target, UserCircle, MessageSquare, CheckSquare, Palette, 
  AlertTriangle, FileText, FolderHeart, Upload, X, BarChart3, HelpCircle, Phone
} from 'lucide-react';

interface SidebarProps {
  config: EmailConfig;
  setConfig: React.Dispatch<React.SetStateAction<EmailConfig>>;
  onGenerate: () => void;
  loading: boolean;
  onProfileClick: () => void;
  onContactsClick: () => void;
  onSavedDesignsClick: () => void;
  onAnalyticsClick: () => void;
  onPricingClick: () => void;
  onLogout: () => void;
  userEmail: string;
  credits: number;
  campaignCredits: number;
  isProfileComplete: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  config, setConfig, onGenerate, loading, onProfileClick, onContactsClick, onSavedDesignsClick, 
  onAnalyticsClick, onPricingClick, onLogout, userEmail, credits, campaignCredits, isProfileComplete
}) => {
  const emailTypes: EmailType[] = ['Newsletter', 'Welcome Message', 'Product Advertisement', 'Transactional'];
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const updateConfig = (key: keyof EmailConfig, value: string) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages = [...(config.productImages || [])];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/v1/upload', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            newImages.push({
              id: Date.now().toString() + Math.random().toString().slice(2),
              url: data.url,
              name: file.name
            });
          } else {
            console.error("Upload failed for", file.name);
            alert(`Failed to upload ${file.name}`);
          }
        } catch (err) {
          console.error("Upload error for", file.name, err);
          alert(`Error uploading ${file.name}`);
        }
      }
      setConfig(prev => ({ ...prev, productImages: newImages }));
    } finally {
      setIsUploading(false);
      if (productFileInputRef.current) productFileInputRef.current.value = '';
    }
  };

  const removeProductImage = (id: string) => {
    setConfig(prev => ({
      ...prev,
      productImages: (prev.productImages || []).filter(img => img.id !== id)
    }));
  };

  const isConversionConfigured = true; // config.ctaUrl.trim() !== '' && config.ctaLabel.trim() !== '';
  const isMarketingConfigured = 
    config.primaryGoal.trim() !== '' && 
    config.audienceProfile.trim() !== '' && 
    config.context.trim() !== '';

  const renderHelper = (id: string, text: string) => (
    <div className="flex items-center gap-1 mt-1 px-1">
      <Info className="w-3 h-3 text-slate-500" />
      <span className="text-[10px] text-slate-500 leading-tight">{text}</span>
    </div>
  );

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 h-screen flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg"><Mail className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg font-bold tracking-tight">updateer ai</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {!isProfileComplete && (
          <button onClick={onProfileClick} className="w-full p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl text-left group hover:bg-amber-900/30 transition-all">
            <div className="flex items-center gap-3 mb-1"><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Profile Incomplete</span></div>
            <p className="text-[11px] text-amber-200/70 leading-tight">Complete your brand profile first.</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-500 group-hover:translate-x-1 transition-transform">Complete Profile <ChevronRight className="w-3 h-3" /></div>
          </button>
        )}

        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Credits</p><p className="text-lg font-bold text-blue-400">{credits}</p></div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Campaigns</p><p className="text-lg font-bold text-purple-400">{campaignCredits}</p></div>
          </div>
          <button onClick={onPricingClick} className="w-full group flex items-center justify-between p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 transition-all">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20"><Zap className="w-4 h-4 text-white fill-white" /></div><div className="text-left"><p className="text-xs font-bold text-white">Get More Credits</p><p className="text-[10px] text-blue-400">View Pricing Plans</p></div></div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </button>
        </section>

        <section className="space-y-2">
          <button onClick={onContactsClick} className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-all border border-slate-700"><Users className="w-4 h-4 text-blue-400" />Manage Contacts</button>
          <button onClick={onSavedDesignsClick} className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-all border border-slate-700"><FolderHeart className="w-4 h-4 text-purple-400" />Saved Designs</button>
          <button onClick={onAnalyticsClick} className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-all border border-slate-700"><BarChart3 className="w-4 h-4 text-green-400" />Analytics</button>
        </section>

        <section>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"><Layout className="w-3.5 h-3.5" />Campaign Type</label>
          <div className="grid grid-cols-1 gap-2">
            {emailTypes.map((type) => (
              <button key={type} onClick={() => updateConfig('type', type)} className={`text-left px-4 py-2 rounded-md text-sm transition-all border ${config.type === type ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>{type}</button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5" />Marketing Context</label>
            <HelpCircle className="w-3.5 h-3.5 text-slate-600 cursor-help" onMouseEnter={() => setActiveTooltip('marketing')} onMouseLeave={() => setActiveTooltip(null)} />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="relative">
                <Target className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input type="text" value={config.primaryGoal} onChange={(e) => updateConfig('primaryGoal', e.target.value)} placeholder="Primary Goal (Required)" className={`w-full bg-slate-800 border rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${!config.primaryGoal.trim() ? 'border-red-500/30' : 'border-slate-700'}`} />
              </div>
              {renderHelper('goal', 'e.g., Drive course sign-ups, Introduce a new feature')}
            </div>

            <div>
              <div className="relative">
                <UserCircle className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input type="text" value={config.audienceProfile} onChange={(e) => updateConfig('audienceProfile', e.target.value)} placeholder="Audience (Required)" className={`w-full bg-slate-800 border rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${!config.audienceProfile.trim() ? 'border-red-500/30' : 'border-slate-700'}`} />
              </div>
              {renderHelper('audience', 'e.g., New trial users, Lapsed customers, Expert devs')}
            </div>
            
            <div>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <textarea value={config.context} onChange={(e) => updateConfig('context', e.target.value)} placeholder="Context: What are we building? (Required)" rows={3} className={`w-full bg-slate-800 border rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${!config.context.trim() ? 'border-red-500/30' : 'border-slate-700'}`} />
              </div>
              {renderHelper('context', 'Describe the specific event, product, or news')}
            </div>

            <div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input type="text" value={config.brandVoice} onChange={(e) => updateConfig('brandVoice', e.target.value)} placeholder="Brand Voice (e.g. Witty)" className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              {renderHelper('voice', 'e.g., Friendly & Relatable, Authoritative, Witty')}
            </div>

            <div>
              <div className="relative">
                <CheckSquare className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input type="text" value={config.mustHaves} onChange={(e) => updateConfig('mustHaves', e.target.value)} placeholder="Must-Haves (e.g. SAVE20)" className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              {renderHelper('must', 'e.g., 25% discount code: SAVE25, Free shipping link')}
            </div>

            <div>
              <div className="relative">
                <Palette className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input type="text" value={config.designStyle} onChange={(e) => updateConfig('designStyle', e.target.value)} placeholder="Design Style (e.g. Minimalist)" className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              {renderHelper('style', 'e.g., Minimalist Text-Heavy, Bold Image-Driven')}
            </div>

            {config.type === 'Product Advertisement' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Images</label>
                  <button type="button" onClick={() => productFileInputRef.current?.click()} disabled={isUploading} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    {isUploading ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3 h-3" />}
                    Add Images
                  </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex items-start gap-2 mb-2">
                  <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    <strong className="text-blue-300">Tip:</strong> The AI will analyze your uploaded images. To associate an image with a specific product, make sure the image filename contains the product name (e.g., "blue-sneakers.jpg").
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(config.productImages || []).map((img) => (
                    <div key={img.id} className="relative group aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1">
                        <p className="text-[9px] text-white truncate text-center">{img.name}</p>
                      </div>
                      <button type="button" onClick={() => removeProductImage(img.id)} className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X className="w-3 h-3" /></button>
                    </div>
                  ))}

                  {(config.productImages || []).length === 0 && (
                    <button type="button" onClick={() => productFileInputRef.current?.click()} disabled={isUploading} className="col-span-2 py-6 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg flex flex-col items-center justify-center gap-2 transition-all group">
                      <Upload className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
                      <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300">Upload Product Photos</span>
                    </button>
                  )}
                </div>
                <input type="file" ref={productFileInputRef} onChange={handleProductImageUpload} accept="image/*" multiple className="hidden" />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><LinkIcon className="w-3.5 h-3.5" />Links & Conversion</label>
          <div className="space-y-3">
            <div className="relative"><LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input type="text" value={config.ctaUrl} onChange={(e) => updateConfig('ctaUrl', e.target.value)} placeholder="Primary CTA Link (Optional)" className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all" /></div>
            <div className="relative"><TypeIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input type="text" value={config.ctaLabel} onChange={(e) => updateConfig('ctaLabel', e.target.value)} placeholder="Button Text (Optional)" className="w-full bg-slate-800 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all" /></div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-slate-800">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"><Info className="w-3.5 h-3.5" />Customer Care</label>
          <div className="space-y-2">
            <a href="mailto:praiselabsinc@gmail.com" className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-slate-300 hover:text-blue-400 transition-all border border-slate-700/50">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">praiselabsinc@gmail.com</span>
            </a>
            <a href="https://wa.me/2348139740217" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-slate-300 hover:text-green-400 transition-all border border-slate-700/50">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              <span>+234 813 974 0217</span>
            </a>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
        <button onClick={onGenerate} disabled={loading || !isProfileComplete || !isConversionConfigured || !isMarketingConfigured || campaignCredits <= 0} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4" />Generate ({campaignCredits})</>}
        </button>
        <div className="flex items-center gap-2 pt-2">
          <button onClick={onProfileClick} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all border ${!isProfileComplete ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 hover:bg-amber-600/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}><Settings className="w-4 h-4" />Profile</button>
          <button onClick={onLogout} className="p-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition-all border border-slate-700" title="Logout"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
