
import React, { useState, useMemo, useEffect } from 'react';
import { Contact, UserDomain, UserProfile } from '../types';
import { X, Search, Filter, Tag, Send, CheckCircle2, AlertCircle, Users, Globe, Info, CreditCard } from 'lucide-react';

interface SendModalProps {
  contacts: Contact[];
  domains: UserDomain[];
  user: UserProfile;
  onClose: () => void;
  onSend: (selectedIds: string[], fromAddress: string) => Promise<void>;
  emailSubject: string;
}

const SendModal: React.FC<SendModalProps> = ({ contacts, domains, user, onClose, onSend, emailSubject }) => {
  const { credits } = user;
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sender Config
  const [senderName, setSenderName] = useState(user.brandName || 'My Brand');
  
  // Default to first verified domain if available, otherwise empty string (General Domain)
  const defaultDomainId = useMemo(() => {
    const verified = domains.find(d => d.status === 'verified');
    return verified ? verified.id.toString() : '';
  }, [domains]);

  const [selectedDomainId, setSelectedDomainId] = useState<string>(defaultDomainId);
  const [emailPrefix, setEmailPrefix] = useState('hello');

  // Update selected domain if domains change (e.g. initial load)
  useEffect(() => {
    if (defaultDomainId && !selectedDomainId) {
      setSelectedDomainId(defaultDomainId);
    }
  }, [defaultDomainId]);

  const tags = useMemo(() => ['All', ...Array.from(new Set(contacts.map(c => c.tag).filter(Boolean)))], [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = tagFilter === 'All' || c.tag === tagFilter;
      return matchesSearch && matchesTag;
    });
  }, [contacts, searchTerm, tagFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleContact = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    
    if (count > user.credits) {
      setError(`Insufficient Email Credits. You need ${count} but only have ${user.credits}.`);
      return;
    }

    setSending(true);
    setError(null);
    try {
      let fromAddress = '';
      if (selectedDomainId) {
        const domain = domains.find(d => String(d.id) === selectedDomainId);
        if (!domain) {
          throw new Error("Invalid domain selected.");
        }
        fromAddress = `${senderName} <${emailPrefix}@${domain.domainName}>`;
      } else {
        // Use General Domain
        fromAddress = `${senderName} <onboarding@resend.dev>`;
      }

      await onSend(Array.from(selectedIds), fromAddress);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send emails. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              Send Campaign
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[400px]">Subject: {emailSubject}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Sender Configuration */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Sender Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="My Brand"
              />
            </div>
            <div className="flex-[1.5]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">From Email</label>
              <div className="flex items-center gap-2">
                {selectedDomainId ? (
                  <>
                    <input
                      type="text"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value)}
                      className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none text-right"
                      placeholder="hello"
                    />
                    <span className="text-slate-500">@</span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-400 cursor-not-allowed">
                     onboarding@
                  </div>
                )}
                
                <div className="relative flex-1">
                  <select
                    value={selectedDomainId}
                    onChange={(e) => setSelectedDomainId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    <option value="">General Domain (resend.dev)</option>
                    {domains.map(d => (
                      <option key={d.id} value={d.id} disabled={d.status !== 'verified'}>
                        {d.domainName} {d.status !== 'verified' ? '(Unverified)' : ''}
                      </option>
                    ))}
                  </select>
                  <Globe className="absolute right-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          
          {!selectedDomainId && (
            <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-900/10 p-2 rounded-lg border border-amber-500/20">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                <strong>Sandbox Mode:</strong> Using the general domain restricts sending to <u>only your verified email address</u>. 
                Add a custom domain in Profile to send to your full contact list.
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            >
              {tags.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'All Tags' : t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <div className="flex items-center justify-between px-4 py-2 mb-2">
            <button 
              onClick={toggleSelectAll}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {selectedIds.size === filteredContacts.length ? 'Deselect All' : 'Select All Filtered'}
            </button>
            <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
          </div>
          
          <div className="space-y-1">
            {filteredContacts.map(contact => (
              <div 
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedIds.has(contact.id) ? 'bg-blue-600/10 border border-blue-500/30' : 'hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  selectedIds.has(contact.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-700 bg-slate-800'
                }`}>
                  {selectedIds.has(contact.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{contact.name || 'No Name'}</p>
                  <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                </div>
                {contact.tag && (
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-medium flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    {contact.tag}
                  </span>
                )}
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No contacts found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${selectedIds.size > credits ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                <CreditCard className={`w-4 h-4 ${selectedIds.size > credits ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Summary</p>
                <p className={`text-sm font-bold ${selectedIds.size > credits ? 'text-red-400' : 'text-white'}`}>
                  {selectedIds.size} Email Credits <span className="text-slate-500 font-normal">/ {credits} Available</span>
                </p>
              </div>
            </div>
            {selectedIds.size > credits && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Insufficient Credits
              </div>
            )}
          </div>

          <button
            disabled={selectedIds.size === 0 || selectedIds.size > credits || sending}
            onClick={handleSend}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {selectedIds.size} Contacts
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

export default SendModal;
