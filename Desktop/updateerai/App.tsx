
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import PreviewArea from './components/PreviewArea';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import ContactsPage from './components/ContactsPage';
import PricingPage from './components/PricingPage';
import SendModal from './components/SendModal';
import SavedDesignsPage from './components/SavedDesignsPage';
import AnalyticsPage from './components/AnalyticsPage';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import { EmailConfig, GenerationState, AuthState, UserProfile, Contact, PricingPlan, SavedEmail, UserDomain } from './types';
import { AlertCircle, X, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  // Performance Optimization: Initialize state from localStorage immediately to avoid "Loading" flash
  const [auth, setAuth] = useState<AuthState>(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
  }));

  const [view, setView] = useState<'editor' | 'profile' | 'contacts' | 'pricing' | 'saved_designs' | 'analytics' | 'payment_success'>('editor');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.pathname === '/payment-success') {
      setView('payment_success');
      window.history.replaceState({}, '', '/');
    }
  }, []);
  
  // Lazy load data state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [savedEmails, setSavedEmails] = useState<SavedEmail[]>([]);
  const [domains, setDomains] = useState<UserDomain[]>([]);

  const [config, setConfig] = useState<EmailConfig>({
    type: 'Newsletter',
    brandName: '',
    brandDescription: '',
    logoUrl: '',
    ctaUrl: '',
    ctaLabel: '',
    facebookUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
    primaryGoal: '',
    audienceProfile: '',
    brandVoice: 'Human, relatable, and conversational',
    mustHaves: '',
    designStyle: '',
    context: '',
    productImageUrl: '',
  });

  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    data: null,
  });

  const isProfileComplete = useCallback((user: UserProfile | null, currentDomains: UserDomain[]) => {
    if (!user) return false;
    const hasBasicInfo = !!(user.brandName?.trim() && user.logoUrl?.trim() && user.brandDescription?.trim());
    const hasDomain = currentDomains && currentDomains.length > 0;
    return hasBasicInfo && hasDomain;
  }, []);

  // Optimized Data Fetching
  const loadDomains = useCallback(async () => {
    try {
      const resDomains = await fetch('/api/v1/domains', { credentials: 'include' });
      if (resDomains.ok) {
        const userDomains = await resDomains.json();
        setDomains(userDomains);
        return userDomains;
      }
    } catch (e) { console.error("Failed to load domains", e); }
    return [];
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const loadData = async () => {
      try {
        // Load Profile
        const res = await fetch('/api/v1/profile', { credentials: 'include' });
        if (!res.ok) throw new Error('failed');
        const profile = await res.json();
        const u: UserProfile = {
          email: profile.email || '',
          brandName: profile.brandName || '',
          brandDescription: profile.brandDescription || '',
          logoUrl: profile.logoUrl || '',
          facebookUrl: profile.facebookUrl || '',
          twitterUrl: profile.twitterUrl || '',
          linkedinUrl: profile.linkedinUrl || '',
          credits: profile.credits || 0,
          campaignCredits: profile.campaignCredits || 0,
          subscriptionTier: profile.subscriptionTier || 'Free', // Use backend value directly
          isSubscribed: profile.isSubscribed,
          subscriptionExpiresAt: profile.subscriptionExpiresAt,
        };
        setAuth(prev => ({ ...prev, user: u, loading: false }));

        // Load Contacts
        try {
          const resContacts = await fetch('/api/v1/contacts', { credentials: 'include' });
          if (resContacts.ok) {
            const data = await resContacts.json();
            setContacts(data.map((c: any) => ({ ...c, id: String(c.id) })));
          }
        } catch (e) { console.error("Failed to load contacts", e); }

        // Load Domains
        const userDomains = await loadDomains();

        // Check if profile is complete (now includes domains check)
        if (!isProfileComplete(u, userDomains)) setView('profile');

        // Load Saved Designs
        try {
          const resDesigns = await fetch('/api/v1/designs', { credentials: 'include' });
          if (resDesigns.ok) {
            const data = await resDesigns.json();
            setSavedEmails(data.map((d: any) => ({ ...d, id: String(d.id) })));
          }
        } catch (e) { console.error("Failed to load designs", e); }

      } catch {
        setAuth(prev => ({ ...prev, isAuthenticated: false, loading: false }));
      }
    };
    loadData();
  }, [auth.isAuthenticated, isProfileComplete, loadDomains]);

  const handleLogin = async (email: string, pass: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) {
      let msg = 'Invalid email or password';
      try {
        const data = await res.json();
        if (typeof data === 'string') msg = data;
        else if (data?.message) msg = data.message;
        else if (data?.error) msg = data.error;
      } catch {}
      setAuth({ user: null, token: null, isAuthenticated: false, loading: false });
      throw new Error(msg);
    }
    setAuth({ user: null, token: null, isAuthenticated: true, loading: true });
  };

  const handleSignup = async (email: string, pass: string) => {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) {
      let msg = 'Signup failed';
      try {
        const data = await res.json();
        if (typeof data === 'string') msg = data;
        else if (data?.message) msg = data.message;
        else if (data?.error) msg = data.error;
      } catch {}
      setAuth({ user: null, token: null, isAuthenticated: false, loading: false });
      throw new Error(msg);
    }
    setAuth({ user: null, token: null, isAuthenticated: true, loading: true });
  };

  const handleLogout = async () => {
    setAuth({ user: null, token: null, isAuthenticated: false, loading: false });
    setView('editor');
    try {
      if ('sendBeacon' in navigator) {
        const data = new Blob([], { type: 'text/plain' });
        navigator.sendBeacon('/api/v1/auth/logout', data);
      } else {
        fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const handleSaveProfile = async (updatedProfile: UserProfile, silent: boolean = false) => {
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedProfile)
      });
      if (!res.ok) throw new Error('Failed to save profile');
      
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setAuth(prev => ({ ...prev, user: updatedProfile }));
      if (!silent) {
        showSuccess('Profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to save profile' }));
    }
  };

  const handleAddContact = async (email: string, name: string, tag: string) => {
    try {
      const res = await fetch('/api/v1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, name, tag })
      });
      if (!res.ok) throw new Error('Failed to add contact');
      const newContact = await res.json();
      setContacts(prev => [...prev, { ...newContact, id: String(newContact.id) }]);
      showSuccess('Contact added');
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to add contact' }));
    }
  };

  const handleImportContacts = async (newContacts: Omit<Contact, 'id' | 'createdAt'>[]) => {
    try {
      const res = await fetch('/api/v1/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newContacts)
      });
      if (!res.ok) throw new Error('Failed to import contacts');
      const imported = await res.json();
      setContacts(prev => [...prev, ...imported.map((c: any) => ({ ...c, id: String(c.id) }))]);
      showSuccess(`Imported ${imported.length} contacts`);
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to import contacts' }));
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/contacts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      setContacts(prev => prev.filter(c => c.id !== id));
      showSuccess('Contact deleted');
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to delete contact' }));
    }
  };

  const handleUpdateContact = async (id: string, email: string, name: string, tag: string) => {
    try {
      const res = await fetch(`/api/v1/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, name, tag })
      });
      if (!res.ok) throw new Error('Failed to update contact');
      const updated = await res.json();
      setContacts(prev => prev.map(c => c.id === id ? { ...updated, id: String(updated.id) } : c));
      showSuccess('Contact updated successfully');
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to update contact' }));
      throw err;
    }
  };

  const handleSaveEmail = async () => {
    if (!state.data) return;
    try {
      const res = await fetch('/api/v1/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: state.data.metadata.subjectLine || 'Untitled',
          html: state.data.html
        })
      });
      if (!res.ok) throw new Error('Failed to save design');
      const newSaved = await res.json();
      setSavedEmails(prev => [{ ...newSaved, id: String(newSaved.id) }, ...prev]);
      showSuccess('Design saved!');
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to save design' }));
    }
  };

  const handleDeleteDesign = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/designs/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete design');
      setSavedEmails(prev => prev.filter(d => d.id !== id));
      showSuccess('Design deleted');
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: 'Failed to delete design' }));
    }
  };

  const handleSendEmails = async (selectedIds: string[], fromAddress: string) => {
    if (!auth.user) return;
    const cost = selectedIds.length;
    if (auth.user.credits < cost) {
      const msg = `Insufficient Email Credits. Need ${cost}, have ${auth.user.credits}.`;
      setState(prev => ({ ...prev, error: msg }));
      setView('pricing');
      throw new Error(msg);
    }
    
    // Send email via API
    try {
        let emailHtml = state.data?.html || '';
        const logoUrl = auth.user.logoUrl || '';
        const productUrl = config.productImageUrl || '';

        // Prepare CID replacements
        // We now enforce strict static file usage for the logo as per requirements.
        // We replace ANY logoUrl occurrence with 'cid:brand-logo'.
        if (logoUrl) {
            emailHtml = emailHtml.replaceAll(logoUrl, 'cid:brand-logo');
        }
        
        // Same for product image (if we were supporting it, but for now we focus on logo)
        // Leaving productUrl replacement logic as is or commenting out if we want to be strict.
        // For now, let's just leave it but we know backend ignores productData.
        
        const recipientEmails = selectedIds.map(id => {
          const contact = contacts.find(c => c.id === id);
          return contact ? contact.email : null;
        }).filter(Boolean) as string[];

        const res = await fetch('/api/v1/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                recipients: recipientEmails,
                from: fromAddress,
                subject: state.data?.metadata.subjectLine || 'Untitled',
                html: emailHtml,
                // We no longer send logoData or productData as base64
                logoData: '', 
                productData: '' 
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to send email');
        }

        const updatedUser = { ...auth.user, credits: auth.user.credits - cost };
        await handleSaveProfile(updatedUser, true);
        showSuccess(`Sent to ${cost} contacts!`);
    } catch (err: any) {
        setState(prev => ({ ...prev, error: err.message }));
        throw err;
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!auth.user) return;
    if (!isProfileComplete(auth.user, domains)) {
      setState(prev => ({ ...prev, error: 'Complete your profile first.' }));
      setView('profile');
      return;
    }
    if (!config.primaryGoal || !config.audienceProfile || !config.context) {
      setState(prev => ({ ...prev, error: 'Fill in all required fields.' }));
      return;
    }
    if (auth.user.campaignCredits <= 0) {
      setState(prev => ({ ...prev, error: 'Insufficient Campaign Credits.' }));
      setView('pricing');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const fullConfig: EmailConfig = { 
        ...config, 
        brandName: auth.user.brandName, 
        brandDescription: auth.user.brandDescription,
        logoUrl: auth.user.logoUrl, 
        facebookUrl: auth.user.facebookUrl || '', 
        twitterUrl: auth.user.twitterUrl || '', 
        linkedinUrl: auth.user.linkedinUrl || ''
      };

      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(fullConfig)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      let accumulatedText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedText += decoder.decode(value, { stream: true });
      }
      accumulatedText += decoder.decode();

      let result = JSON.parse(accumulatedText);

      // We no longer replace placeholders here because the backend handles image uploads
      // and returns the final URLs directly in the HTML/React code.
      // The backend uses MinIO/R2 for storage.
      
      const updatedUser = { ...auth.user, campaignCredits: auth.user.campaignCredits - 1 };
      await handleSaveProfile(updatedUser, true);
      setState({ loading: false, error: null, data: result });
    } catch (err: any) {
      setState({ loading: false, error: err.message, data: null });
    }
  }, [config, auth.user, isProfileComplete]);

  const handleExport = useCallback(() => {
    if (!auth.user || auth.user.credits <= 0) {
      setState(prev => ({ ...prev, error: 'Insufficient Email Credits.' }));
      setView('pricing');
      return false;
    }
    const updatedUser = { ...auth.user, credits: auth.user.credits - 1 };
    handleSaveProfile(updatedUser, true);
    return true;
  }, [auth.user]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Memoize the view content to prevent unnecessary re-renders of heavy components
  const mainContent = useMemo(() => {
    if (auth.loading) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!auth.isAuthenticated) return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />;

    switch (view) {
      case 'profile':
        return auth.user && (
          <ProfilePage 
            profile={auth.user} 
            domains={domains}
            onSave={handleSaveProfile} 
            onBack={() => setView('editor')} 
            onDomainsRefresh={loadDomains}
          />
        );
      case 'contacts':
        return <ContactsPage 
          contacts={contacts} 
          onAddContact={handleAddContact} 
          onUpdateContact={handleUpdateContact}
          onImportContacts={handleImportContacts} 
          onDeleteContact={handleDeleteContact} 
          onBack={() => setView('editor')} 
        />;
      case 'saved_designs':
        return (
          <SavedDesignsPage 
            designs={savedEmails} 
            onDeleteDesign={handleDeleteDesign}
            onLoadDesign={(d) => { 
              setState({ 
                loading: false, 
                error: null, 
                data: { 
                  html: d.html, 
                  reactCode: '/* Loaded */', 
                  metadata: { subjectLine: d.name, category: 'Saved', estimatedReadTime: 1 } 
                } 
              }); 
              setView('editor'); 
            }} 
            onBack={() => setView('editor')} 
          />
        );
      case 'analytics':
        return <AnalyticsPage onBack={() => setView('editor')} onPricingClick={() => setView('pricing')} />;
      case 'pricing':
        return auth.user && (
          <PricingPage 
            currentCredits={auth.user.credits} 
            currentCampaigns={auth.user.campaignCredits} 
            onSelectPlan={(p) => { 
              const u = { 
                ...auth.user!, 
                credits: auth.user!.credits + p.credits, 
                campaignCredits: auth.user!.campaignCredits + p.campaigns, 
                subscriptionTier: p.isMonthly ? 'Pro' : auth.user!.subscriptionTier 
              }; 
              handleSaveProfile(u, true); 
              setView('editor'); 
              showSuccess(`Purchased ${p.name}!`); 
            }} 
            onBack={() => setView('editor')} 
          />
        );
      case 'payment_success':
        return <PaymentSuccessPage onReturnToDashboard={() => setView('editor')} />;
      default:
        return (
          <PreviewArea 
            data={state.data} 
            loading={state.loading} 
            user={auth.user}
            onExport={handleExport} 
            onPricingClick={() => setView('pricing')} 
            onSave={handleSaveEmail} 
            onSendOut={() => setIsSendModalOpen(true)} 
          />
        );
    }
  }, [auth, view, contacts, savedEmails, state.data, state.loading, handleGenerate, handleExport]);

  if (!auth.isAuthenticated && !auth.loading) return <AuthPage onLogin={handleLogin} onSignup={handleSignup} />;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {auth.isAuthenticated && (
        <Sidebar 
          config={config} 
          setConfig={setConfig} 
          onGenerate={handleGenerate} 
          loading={state.loading} 
          onProfileClick={() => setView(view === 'profile' ? 'editor' : 'profile')} 
          onContactsClick={() => setView('contacts')} 
          onSavedDesignsClick={() => setView('saved_designs')} 
          onAnalyticsClick={() => setView('analytics')} 
          onPricingClick={() => setView('pricing')} 
          onLogout={handleLogout} 
          userEmail={auth.user?.email || ''} 
          credits={auth.user?.credits || 0} 
          campaignCredits={auth.user?.campaignCredits || 0} 
          isProfileComplete={isProfileComplete(auth.user, domains)} 
        />
      )}
      <main className="flex-1 flex flex-col relative">
        {state.error && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
            <div className="bg-red-900/90 border border-red-500 text-red-100 px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{state.error}</p>
              </div>
              <button onClick={() => setState(p => ({ ...p, error: null }))} className="p-1 hover:bg-red-800 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {successMessage && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md animate-in fade-in slide-in-from-top-4">
            <div className="bg-green-900/90 border border-green-500 text-green-100 px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-green-800 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {mainContent}

        {isSendModalOpen && auth.user && (
          <SendModal 
            contacts={contacts} 
            domains={domains}
            user={auth.user}
            emailSubject={state.data?.metadata.subjectLine || 'Untitled'} 
            onClose={() => setIsSendModalOpen(false)} 
            onSend={handleSendEmails} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
