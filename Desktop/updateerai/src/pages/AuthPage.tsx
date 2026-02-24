import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Zap, Shield, CheckCircle2, AlertCircle, FileText, Sparkles, UserCircle, Building2, Megaphone, ShoppingBag, Briefcase, GraduationCap, Laptop2 } from 'lucide-react';

interface AuthPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup: (email: string, pass: string) => Promise<void>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignup }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onSignup(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
      {/* Mobile Notice */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-indigo-900/80 border-b border-indigo-500/30 text-indigo-100 text-center py-2 px-4 text-xs font-medium backdrop-blur-md z-[100]">
        <div className="flex items-center justify-center gap-2">
          <Laptop2 className="w-3.5 h-3.5" />
          <span>Updateer AI is optimized for desktop.</span>
        </div>
      </div>

      {/* Hero & Auth Section */}
      <section className="relative min-h-screen flex flex-col lg:flex-row">
        {/* Left Column: Brand & Marketing (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-slate-900/50 border-r border-slate-800/50">
          {/* Background glow effects */}
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-900/20 ring-1 ring-white/10">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                updateer ai
              </span>
            </div>

            <div className="space-y-8 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                Next-Gen Email Marketing
              </div>
              
              <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white">
                Scale campaigns with <span className="text-blue-500">autonomous AI</span>.
              </h1>
              
              <p className="text-lg text-slate-400 leading-relaxed">
                The first enterprise-grade platform built for hyper-personalization and autonomous orchestration. Build high-converting emails in seconds.
              </p>

              <div className="grid grid-cols-1 gap-4 pt-4">
                {[
                  { icon: Zap, title: "Instant Generation", desc: "AI builds full campaigns from just your data." },
                  { icon: Shield, title: "Privacy First", desc: "BIMI support and enterprise-grade encryption." },
                  { icon: CheckCircle2, title: "Inbox Placement", desc: "Advanced optimization for 99% deliverability." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-800/50 hover:bg-slate-800/50 transition-colors group">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-blue-500/50 transition-colors">
                      <item.icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200">{item.title}</h3>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-slate-500 text-xs font-medium pt-8">
            <p>© 2026 updateer ai. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-slate-950">
          {/* Mobile Header */}
          <div className="lg:hidden absolute top-12 left-0 right-0 flex justify-center mb-8 px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">updateer ai</span>
            </div>
          </div>

          <div className="w-full max-w-[440px] space-y-8 mt-16 lg:mt-0">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white mb-3">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-slate-500">
                {isLogin 
                  ? 'Enter your credentials to access your dashboard.' 
                  : 'Join 10,000+ brands scaling with AI automation.'}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
              {/* Subtle top border highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-200 text-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span className="font-semibold text-red-400">Authentication Error</span>
                  </div>
                  <p className="text-red-300/80 pl-6 leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Email Address</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-slate-400">Password</label>
                    {isLogin && (
                      <button type="button" className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-14 py-3.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-300 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <Sparkles className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                    <div className="flex gap-3">
                      <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed text-slate-400">
                        By creating an account, You'll receive 20 free credits instantly.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group/btn"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover/btn:opacity-60 transition-opacity duration-500"></div>
                  <div className="relative flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isLogin ? 'Sign In' : 'Get Started Free'}</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="text-sm text-slate-500 hover:text-white transition-colors"
                >
                  {isLogin ? (
                    <>Don't have an account? <span className="text-blue-500 font-bold ml-1">Sign up for free</span></>
                  ) : (
                    <>Already have an account? <span className="text-blue-500 font-bold ml-1">Sign in here</span></>
                  )}
                </button>
              </div>
            </div>

            {/* Social Proof / Trust Badge */}
            <div className="pt-8 border-t border-slate-800/50 flex flex-col items-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Trusted by modern marketing teams</p>
              <div className="flex gap-8 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <Building2 className="w-5 h-5" />
                <Megaphone className="w-5 h-5" />
                <ShoppingBag className="w-5 h-5" />
                <Briefcase className="w-5 h-5" />
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Landing Page Content (Integrated below the fold) */}
      <div className="relative bg-slate-950 border-t border-slate-800/50">
        {/* What You Can Build Section */}
        <section id="features" className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800/50">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">What Can You Build?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From transactional receipts to high-converting marketing campaigns, updateer ai handles it all. 
              Just feed the AI your core data, and it builds the rest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Receipts & Invoices</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Input Needed</p>
              <p className="text-slate-400 text-sm">
                Transaction details, customer name, item list, and total amount.
              </p>
            </div>

            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Marketing Campaigns</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Input Needed</p>
              <p className="text-slate-400 text-sm">
                Campaign goal, audience segment, key offer, and brand voice.
              </p>
            </div>

            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <UserCircle className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Welcome Series</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Input Needed</p>
              <p className="text-slate-400 text-sm">
                Brand mission, onboarding steps, and "getting started" resources.
              </p>
            </div>

            <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Product Launches</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Input Needed</p>
              <p className="text-slate-400 text-sm">
                Product USP, launch date, features list, and target problem solved.
              </p>
            </div>
          </div>
        </section>

        {/* Who Can Use This Section */}
        <section className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800/50">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Who Is updateer ai For?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From solo founders to enterprise teams, our AI adapts to your industry needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Real Estate */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-bold text-xl text-white">Real Estate & Property</h3>
              </div>
              <ul className="space-y-4">
                <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <strong className="block text-white mb-1">Estate Developers</strong>
                  <span className="text-sm text-slate-400">Send project updates, launch new developments, and broadcast investment opportunities.</span>
                </li>
                <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <strong className="block text-white mb-1">Real Estate Agents</strong>
                  <span className="text-sm text-slate-400">Share property listings, market reports, and personalized buyer alerts.</span>
                </li>
              </ul>
            </div>

            {/* Marketing */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Megaphone className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-bold text-xl text-white">Marketing & Creative</h3>
              </div>
              <ul className="space-y-4">
                <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <strong className="block text-white mb-1">Digital Marketers</strong>
                  <span className="text-sm text-slate-400">Scale high-volume outreach, automate newsletters, and run A/B tests.</span>
                </li>
                <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <strong className="block text-white mb-1">PR Agencies</strong>
                  <span className="text-sm text-slate-400">Broadcast press releases to media lists and manage media outreach.</span>
                </li>
              </ul>
            </div>

            {/* Brands */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-pink-500/10 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="font-bold text-xl text-white">Brands & E-commerce</h3>
              </div>
              <ul className="space-y-4">
                <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <strong className="block text-white mb-1">Small Brands</strong>
                  <span className="text-sm text-slate-400">Handle professional communication and marketing without a large team.</span>
                </li>
                <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                  <strong className="block text-white mb-1">Big Brands</strong>
                  <span className="text-sm text-slate-400">Seasonal launches, personalized product recommendations, and loyalty programs.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Email Marketing Guide</h2>
            <p className="text-slate-500">Answering the most common questions about AI-driven email automation.</p>
          </div>

          <div className="space-y-6">
            {[
              { q: "How to increase email open rates with AI?", a: "Increasing open rates requires hyper-personalization. updateer ai uses autonomous orchestration to adjust subject lines and preheaders in real-time." },
              { q: "What is the best AI tool for cold email outreach?", a: "The best AI tool for cold email outreach is one that prioritizes deliverability and human-like brand voice. updateer ai ensures your automated lifecycle campaigns sound human." },
              { q: "How to automate marketing emails for ecommerce?", a: "Ecommerce brands should focus on behavior-based onboarding flows and abandoned cart recovery AI. By integrating updateer ai with your CRM, you can trigger emails based on zero-party data collection." }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-colors">
                <h4 className="font-bold text-lg mb-3 text-white">{item.q}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-800/50 py-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">updateer ai</span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <div className="text-slate-500 text-sm text-center md:text-right">
                © 2026 updateer ai. Enterprise-grade email marketing software.
              </div>
              <div className="text-slate-600 text-xs text-center md:text-right">
                Built by Chukwudi Praise Enyinna, owner and founder of Praise Labs
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AuthPage;
