
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserDomain, DNSRecord } from '../types';
import { 
  User, Save, ArrowLeft, Globe, Image as ImageIcon, Facebook, Twitter, Linkedin, ShieldCheck, Shield,
  Building, AlertCircle, CheckCircle2, Upload, X, Info, FileText, Trash2, RefreshCw, Plus, Copy, Check, Activity
} from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  domains: UserDomain[];
  onSave: (profile: UserProfile) => Promise<void>;
  onBack: () => void;
  onDomainsRefresh: () => Promise<void>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, domains, onSave, onBack, onDomainsRefresh }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Domain Management State
  // const [domains, setDomains] = useState<UserDomain[]>([]); // Removed local state
  const [domainLoading, setDomainLoading] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Removed useEffect fetchDomains

  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName) return;
    
    const cleanDomain = newDomainName.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    setDomainLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_name: cleanDomain }),
      });
      if (res.ok) {
        await onDomainsRefresh(); // Refresh parent state
        setNewDomainName('');
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to register domain');
      }
    } catch (error) {
      console.error('Failed to register domain', error);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setDomainLoading(false);
    }
  };

  const handleVerifyDomain = async (id: number) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/v1/domains/${id}/verify`, { method: 'POST' });
      if (res.ok) {
        await onDomainsRefresh(); // Refresh parent state
      }
    } catch (error) {
      console.error('Failed to verify domain', error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteDomain = async (id: number) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;
    try {
      const res = await fetch(`/api/v1/domains/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await onDomainsRefresh(); // Refresh parent state
      }
    } catch (error) {
      console.error('Failed to delete domain', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof UserProfile, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        handleChange('logoUrl', data.url);
      } else {
        console.error("Upload failed");
        alert("Failed to upload image. Please try again.");
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Error uploading image.");
    } finally {
      setLoading(false);
    }
  };

  const isFieldValid = (val: string) => val?.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />Back to Editor</button>
        <div className="flex items-center gap-4 mb-12"><div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20"><User className="w-8 h-8 text-white" /></div><div><h1 className="text-3xl font-bold">Brand Configuration</h1><p className="text-slate-400">Mandatory fields are marked with an asterisk (*).</p></div></div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Building className="w-5 h-5 text-blue-400" />Identity</h2>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-400 mb-1.5">Brand Name * {isFieldValid(formData.brandName) ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}</label>
                  <input type="text" required value={formData.brandName} onChange={(e) => handleChange('brandName', e.target.value)} className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${!isFieldValid(formData.brandName) ? 'border-amber-500/30' : 'border-slate-700'}`} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-400 mb-1.5">Banner * {isFieldValid(formData.logoUrl) ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}</label>
                  <div className="space-y-3">
                    {formData.logoUrl ? (
                      <div className="relative group aspect-[4/1] w-full bg-white rounded-xl overflow-hidden border border-slate-700">
                        <img src={formData.logoUrl} alt="Brand Banner" className="w-full h-full object-contain p-4" />
                        <button type="button" onClick={() => handleChange('logoUrl', '')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full aspect-[4/1] border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group">
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-600/20 transition-colors"><Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-400" /></div>
                        <span className="text-xs font-medium text-slate-500 group-hover:text-slate-300">Upload Brand Banner</span>
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/png, image/jpeg" className="hidden" />
                    <p className="text-[10px] text-slate-500 leading-tight">Recommended size: 600px wide. Supported formats: PNG, JPG only.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />Brand Context</h2>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-slate-400 mb-1.5">What is your brand all about? * {isFieldValid(formData.brandDescription) ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}</label>
                  <textarea 
                    required 
                    value={formData.brandDescription} 
                    onChange={(e) => handleChange('brandDescription', e.target.value)} 
                    rows={5}
                    className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none ${!isFieldValid(formData.brandDescription) ? 'border-amber-500/30' : 'border-slate-700'}`} 
                    placeholder="e.g. We are a sustainable fashion brand focusing on eco-friendly materials and fair trade practices..." 
                  />
                  <p className="text-[10px] text-slate-500 mt-2 leading-tight">This helps the AI understand your business model and core values when crafting copy.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" />Domain Management</h2>
            
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-100 mb-1">Boost Your Deliverability</p>
                <p className="leading-relaxed text-slate-400">
                  Using your own domain (e.g., <span className="font-mono text-blue-300">mail.yourbrand.com</span>) builds trust and drastically reduces the chance of your emails landing in spam.
                </p>
                <p className="mt-2 text-xs text-slate-500 border-t border-blue-500/20 pt-2">
                  <span className="font-semibold text-amber-500">Note:</span> If you don't add a custom domain, your emails will be sent via our general shared domain, which may impact deliverability.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
                <h3 className="text-blue-400 font-semibold flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  Required: Connect Your Domain
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  To send emails with high deliverability, you <strong>must</strong> verify a custom domain (e.g., <em>mail.yourbrand.com</em>). This prevents your emails from landing in spam folders.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="font-bold text-slate-300 block mb-1">Step 1: Add Domain</span>
                    <span className="text-slate-500">Enter your domain or subdomain below (e.g. mail.example.com).</span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="font-bold text-slate-300 block mb-1">Step 2: Update DNS</span>
                    <span className="text-slate-500">Copy the DNS records we provide and add them to your domain host (GoDaddy, Namecheap, etc).</span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <span className="font-bold text-slate-300 block mb-1">Step 3: Verify</span>
                    <span className="text-slate-500">Click "Verify" to confirm ownership. This can take 5 mins to 24 hours.</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="e.g. mail.yourdomain.com"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  type="button"
                  onClick={handleRegisterDomain}
                  disabled={domainLoading || !newDomainName}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {domainLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Domain
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 font-bold text-xs">!</span>
                  </div>
                  <p className="text-sm text-red-400">{errorMsg}</p>
                </div>
              )}

              {domains.length === 0 && (
                <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-slate-600" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-400">No domains connected</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Once you add a domain, you'll see options here to <span className="text-blue-400">verify ownership</span>, <span className="text-blue-400">view DNS records</span>, and <span className="text-red-400">remove domains</span>.
                  </p>
                </div>
              )}

              {domains.length > 0 && (
                <div className="space-y-4">
                  {domains.map(domain => {
                    let dnsRecords: DNSRecord[] = [];
                    try {
                      dnsRecords = JSON.parse(domain.dnsRecords || '[]');
                    } catch (e) {}

                    // Check for DMARC record, or create default recommendation
                    const dmarcRecord: DNSRecord = dnsRecords.find(r => r.name?.includes('_dmarc')) || {
                      record_type: 'TXT',
                      name: '_dmarc',
                      value: 'v=DMARC1; p=none;',
                      ttl: 'Auto',
                      status: 'pending_setup'
                    };

                    return (
                      <div key={domain.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-white">{domain.domainName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                domain.status === 'verified' 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {domain.status}
                              </span>
                              <span className="text-xs text-slate-500">{domain.region}</span>
                              {domain.hasTracking && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                  <Activity className="w-3 h-3" /> Tracking
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {domain.status !== 'verified' ? (
                              <button
                                type="button"
                                onClick={() => handleVerifyDomain(domain.id)}
                                disabled={verifyingId === domain.id}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shadow-sm shadow-blue-900/20"
                              >
                                {verifyingId === domain.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Verify DNS Records
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVerifyDomain(domain.id)}
                                disabled={verifyingId === domain.id}
                                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                                title="Refresh DNS Status"
                              >
                                {verifyingId === domain.id ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteDomain(domain.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete Domain"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {dnsRecords.length > 0 && (
                          <div className="bg-slate-900 rounded-lg p-4 space-y-8 overflow-x-auto">
                            {domain.status !== 'verified' && (
                              <div className="mb-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-amber-200">Action Required: Update DNS Records</p>
                                  <p className="text-xs text-amber-200/70 mt-1">
                                    Add the following records to your DNS provider to verify ownership.
                                    <span className="block mt-1 italic opacity-75">Propagation may take up to 48 hours.</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Domain Verification (DKIM) */}
                            <div>
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-300">Domain Verification</h4>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">DKIM</span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="pb-2 pr-4 w-16">Type</th>
                                    <th className="pb-2 pr-4 w-32">Name</th>
                                    <th className="pb-2 pr-4">Content</th>
                                    <th className="pb-2 pr-4 w-16">TTL</th>
                                    <th className="pb-2 pr-4 w-16">Priority</th>
                                    <th className="pb-2 w-24">Status</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {dnsRecords.filter(r => r.name?.includes('_domainkey')).map((record, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-800/30 transition-colors">
                                      <td className="py-2 pr-4 font-mono text-blue-400">{record.record_type || record.type}</td>
                                      <td className="py-2 pr-4 font-mono text-slate-300 break-all">{record.name}</td>
                                      <td className="py-2 pr-4 font-mono text-slate-300 break-all">{record.value}</td>
                                      <td className="py-2 pr-4 text-slate-500">{record.ttl || 'Auto'}</td>
                                      <td className="py-2 pr-4 text-slate-500">{record.priority || '-'}</td>
                                      <td className="py-2">
                                        <span className={`flex items-center gap-1.5 ${record.status === 'verified' ? 'text-green-400' : 'text-amber-500'}`}>
                                            {record.status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                            {record.status || 'Pending'}
                                        </span>
                                      </td>
                                      <td className="py-2 text-right">
                                        <button 
                                          type="button"
                                          onClick={() => copyToClipboard(record.value)}
                                          className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Enable Sending (SPF) */}
                            <div>
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-300">Enable Sending</h4>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">SPF</span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="pb-2 pr-4 w-16">Type</th>
                                    <th className="pb-2 pr-4 w-32">Name</th>
                                    <th className="pb-2 pr-4">Content</th>
                                    <th className="pb-2 pr-4 w-16">TTL</th>
                                    <th className="pb-2 pr-4 w-16">Priority</th>
                                    <th className="pb-2 w-24">Status</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  {dnsRecords.filter(r => !r.name?.includes('_domainkey') && !r.name?.includes('_dmarc')).map((record, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-800/30 transition-colors">
                                      <td className="py-2 pr-4 font-mono text-blue-400">{record.record_type || record.type}</td>
                                      <td className="py-2 pr-4 font-mono text-slate-300 break-all">{record.name}</td>
                                      <td className="py-2 pr-4 font-mono text-slate-300 break-all">{record.value}</td>
                                      <td className="py-2 pr-4 text-slate-500">{record.ttl || 'Auto'}</td>
                                      <td className="py-2 pr-4 text-slate-500">{record.priority || '-'}</td>
                                      <td className="py-2">
                                        <span className={`flex items-center gap-1.5 ${record.status === 'verified' ? 'text-green-400' : 'text-amber-500'}`}>
                                            {record.status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                            {record.status || 'Pending'}
                                        </span>
                                      </td>
                                      <td className="py-2 text-right">
                                        <button 
                                          type="button"
                                          onClick={() => copyToClipboard(record.value)}
                                          className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* DMARC Policy */}
                            <div>
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-300">DMARC Policy</h4>
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Recommended</span>
                              </div>
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="pb-2 pr-4 w-16">Type</th>
                                    <th className="pb-2 pr-4 w-32">Name</th>
                                    <th className="pb-2 pr-4">Content</th>
                                    <th className="pb-2 pr-4 w-16">TTL</th>
                                    <th className="pb-2 pr-4 w-16">Priority</th>
                                    <th className="pb-2 w-24">Status</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                  <tr className="group hover:bg-slate-800/30 transition-colors">
                                    <td className="py-2 pr-4 font-mono text-blue-400">{dmarcRecord.record_type || dmarcRecord.type}</td>
                                    <td className="py-2 pr-4 font-mono text-slate-300 break-all">{dmarcRecord.name}</td>
                                    <td className="py-2 pr-4 font-mono text-slate-300 break-all">{dmarcRecord.value}</td>
                                    <td className="py-2 pr-4 text-slate-500">{dmarcRecord.ttl || 'Auto'}</td>
                                    <td className="py-2 pr-4 text-slate-500">{dmarcRecord.priority || '-'}</td>
                                    <td className="py-2">
                                      <span className={`flex items-center gap-1.5 ${dmarcRecord.status === 'verified' ? 'text-green-400' : 'text-slate-400'}`}>
                                          {dmarcRecord.status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                                          {dmarcRecord.status === 'pending_setup' ? 'Optional' : dmarcRecord.status}
                                      </span>
                                    </td>
                                    <td className="py-2 text-right">
                                      <button 
                                        type="button"
                                        onClick={() => copyToClipboard(dmarcRecord.value)}
                                        className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" />Social Presence (Optional)</h2><span className="text-[10px] text-slate-500 uppercase tracking-widest">Leave empty to exclude</span></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div><label className="flex items-center justify-between text-sm font-medium text-slate-400 mb-1.5">Facebook {isFieldValid(formData.facebookUrl) ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <Info className="w-3.5 h-3.5 text-slate-600" />}</label><div className="relative"><Facebook className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="text" value={formData.facebookUrl} onChange={(e) => handleChange('facebookUrl', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="facebook.com/acme" /></div></div>
              <div><label className="flex items-center justify-between text-sm font-medium text-slate-400 mb-1.5">Twitter / X {isFieldValid(formData.twitterUrl) ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <Info className="w-3.5 h-3.5 text-slate-600" />}</label><div className="relative"><Twitter className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="text" value={formData.twitterUrl} onChange={(e) => handleChange('twitterUrl', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="twitter.com/acme" /></div></div>
              <div><label className="flex items-center justify-between text-sm font-medium text-slate-400 mb-1.5">LinkedIn {isFieldValid(formData.linkedinUrl) ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <Info className="w-3.5 h-3.5 text-slate-600" />}</label><div className="relative"><Linkedin className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="text" value={formData.linkedinUrl} onChange={(e) => handleChange('linkedinUrl', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="linkedin.com/company/acme" /></div></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">{success && <span className="text-green-400 text-sm font-medium animate-fade-in">Profile updated!</span>}<button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50">{loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" />Save Brand Profile</>}</button></div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
