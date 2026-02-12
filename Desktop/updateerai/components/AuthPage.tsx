
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
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Navigation / Header */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">updateer ai</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-sm font-semibold transition-all"
        >
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest">
            <Zap className="w-3 h-3 fill-blue-400" />
            The #1 AI Email Generator and Broadcast Manager
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            AI Email Generator and <span className="text-blue-500">Broadcast Manager</span> for the Modern Era.
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
            Scale your marketing email campaigns with generative AI personalization. updateer ai is the enterprise-grade email marketing software built for hyper-personalization and autonomous orchestration.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              AI-Powered Personalization
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              BIMI & Privacy-First
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Inbox Placement Optimization
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Bring Your Own Domain
            </div>
          </div>

          <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl backdrop-blur-sm max-w-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-100">Bring Your Own Domain</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Connecting your custom domain (e.g., mail.yourbrand.com) helps reduce the chances of your emails ending up in spam folders. 
                  <br className="mb-1" />
                  <span className="opacity-80">Without it, your campaigns will be sent via our general shared domain.</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div id="auth" className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20"></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">
              {isLogin ? 'Welcome Back' : 'Start Your Free Trial'}
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              {isLogin ? 'Access your autonomous marketing hub.' : 'Join 10,000+ brands using updateer ai for email automation. Includes 20 Free Credits.'}
            </p>

            {error && (
              <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="text-xs text-red-300/80 pl-6 border-t border-red-500/20 pt-2">
              If you continue to have issues, contact customer care at <a href="mailto:praiselabsinc@gmail.com" className="underline hover:text-red-200">praiselabsinc@gmail.com</a>
            </p>
          </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-24 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder={showPassword ? 'Enter password' : '••••••••'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-2.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-slate-200 transition-all"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-8 text-slate-500 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                {isLogin ? 'Sign up for free' : 'Log in here'}
              </button>
            </p>

            {/* Customer Care Section */}
            <div className="mt-8 pt-8 border-t border-slate-800">
              <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Customer Care</p>
              <div className="flex flex-col gap-3">
                <a 
                  href="mailto:praiselabsinc@gmail.com" 
                  className="flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-blue-400 text-sm transition-all border border-slate-700/50"
                >
                  <Mail className="w-4 h-4" />
                  <span>praiselabsinc@gmail.com</span>
                </a>
                <a 
                  href="https://wa.me/2348139740217" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-green-400 text-sm transition-all border border-slate-700/50"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  <span>+234 813 974 0217</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Can Build Section */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800">
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
      <section className="py-24 max-w-7xl mx-auto px-6 border-b border-slate-800 bg-slate-900/20">
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
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Property Managers</strong>
                <span className="text-sm text-slate-400">Broadcast maintenance updates and tenant notices.</span>
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
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Content Creators</strong>
                <span className="text-sm text-slate-400">Manage subscriber newsletters and promote new digital content.</span>
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
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">D2C Brands</strong>
                <span className="text-sm text-slate-400">Send targeted promotional offers and brand stories directly to customers.</span>
              </li>
            </ul>
          </div>

          {/* Professional Services */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Briefcase className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-bold text-xl text-white">Professional Services</h3>
            </div>
            <ul className="space-y-4">
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Consultants</strong>
                <span className="text-sm text-slate-400">Lead nurturing, broadcasting thought leadership, and high-ticket service offers.</span>
              </li>
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Financial Advisors</strong>
                <span className="text-sm text-slate-400">Send market updates, investment tips, and personalized financial product recommendations.</span>
              </li>
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">HR Specialists</strong>
                <span className="text-sm text-slate-400">Mass communication with candidate pools and automated job matching updates.</span>
              </li>
            </ul>
          </div>

          {/* Education */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <GraduationCap className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="font-bold text-xl text-white">Education & Nonprofits</h3>
            </div>
            <ul className="space-y-4">
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Nonprofits</strong>
                <span className="text-sm text-slate-400">Mission-driven communication, donation requests, and event promotion.</span>
              </li>
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">E-learning</strong>
                <span className="text-sm text-slate-400">Distribute course materials, student updates, and automated learning reminders.</span>
              </li>
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Faith-Based</strong>
                <span className="text-sm text-slate-400">Broadcast community updates, service schedules, and mission-related content.</span>
              </li>
            </ul>
          </div>

          {/* Technology */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Laptop2 className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-bold text-xl text-white">Technology & SaaS</h3>
            </div>
            <ul className="space-y-4">
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">Software Companies</strong>
                <span className="text-sm text-slate-400">Announcing new features, product updates, and user onboarding sequences.</span>
              </li>
              <li className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                <strong className="block text-white mb-1">IT Services</strong>
                <span className="text-sm text-slate-400">Technical updates, customer engagement, and case-led storytelling.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Guide / FAQ Section (GEO Optimized) */}
      <section id="faq" className="py-32 max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Email Marketing Guide</h2>
          <p className="text-slate-500">Answering the most common questions about AI-driven email automation.</p>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h4 className="font-bold text-lg mb-3">How to increase email open rates with AI?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Increasing open rates requires hyper-personalization. updateer ai uses autonomous orchestration to adjust subject lines and preheaders in real-time based on the recipient's search intent and past interactions.
            </p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h4 className="font-bold text-lg mb-3">What is the best AI tool for cold email outreach?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              The best AI tool for cold email outreach is one that prioritizes deliverability and human-like brand voice. updateer ai ensures your automated lifecycle campaigns sound human, avoiding the "robotic" feel that triggers spam filters.
            </p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h4 className="font-bold text-lg mb-3">How to automate marketing emails for ecommerce?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ecommerce brands should focus on behavior-based onboarding flows and abandoned cart recovery AI. By integrating updateer ai with your CRM, you can trigger emails based on zero-party data collection for maximum relevance.
            </p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <h4 className="font-bold text-lg mb-3">Benefits of AI-driven email segmentation for B2B?</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              AI-driven segmentation allows B2B marketers to map search intent to specific content clusters. This ensures that expert devs receive technical jargon while decision-makers see high-level ROI metrics, drastically improving re-engagement email automation.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <span className="font-bold">updateer ai</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-slate-500 text-sm">
              © updateer ai. Enterprise-grade email marketing software. Beginner friendly.
            </div>
            <div className="text-slate-600 text-xs">
              Built by Chukwudi Praise Enyinna, owner and founder of Praise Labs
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
