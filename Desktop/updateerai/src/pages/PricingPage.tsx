import React from 'react';
import { PricingPlan } from '../types';
import { Check, Zap, Shield, Rocket, ArrowLeft, ExternalLink, Info, AlertCircle } from 'lucide-react';

interface PricingPageProps {
  onSelectPlan: (plan: PricingPlan) => void;
  onBack: () => void;
  currentCredits: number;
  currentCampaigns: number;
}

// Personal Plans
const SUBSCRIPTION_PLAN: PricingPlan = {
  id: 'pro_monthly',
  name: 'Pro Access (Monthly)',
  price: 20,
  credits: 700,
  campaigns: 50,
  description: 'Recurring monthly membership to access the app. Unlocks the dashboard and monthly credits.',
  isMonthly: true,
};

const PERSONAL_TOPUPS: PricingPlan[] = [
  {
    id: 'starter_pack',
    name: 'Starter Top-Up',
    price: 10,
    credits: 3000,
    campaigns: 100,
    description: 'Beginner friendly credit boost for one-off marketing email campaigns.',
    isMonthly: false,
  },
  {
    id: 'bulk_pack',
    name: 'Bulk Top-Up',
    price: 18,
    credits: 6000,
    campaigns: 200,
    description: 'Top rated value for high-volume email automation and mass mailing.',
    isMonthly: false,
  },
  {
    id: 'mega_topup',
    name: 'Mega Top-Up',
    price: 100,
    credits: 30000,
    campaigns: 1000,
    description: 'Massive credit boost for high-volume agencies and large scale campaigns.',
    isMonthly: false,
  }
];

// Replace these with your actual Selar product links
const SELAR_LINKS = {
  'pro_monthly': 'https://selar.com/69s6r95h5r',
  'starter_pack': 'https://selar.com/525419i69i',
  'bulk_pack': 'https://selar.com/14v640u62r',
  'mega_topup': 'https://selar.com/729117og53'
};

const PricingPage: React.FC<PricingPageProps> = ({ onSelectPlan, onBack, currentCredits, currentCampaigns }) => {
  const handlePurchase = (planId: string) => {
    const link = SELAR_LINKS[planId as keyof typeof SELAR_LINKS];
    if (link) {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-6">
            Flexible pricing for individuals and businesses.
          </p>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 max-w-xl mx-auto mb-8 flex items-start gap-3 text-left">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200">
              <strong className="text-blue-100">Note:</strong> An active monthly subscription (Pro Access (Monthly)) is required to access the app dashboard. Top-up packs are for adding extra credits to your account.
            </p>
          </div>
          
          <div className="mt-2 inline-flex flex-col items-center gap-2 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 mb-8">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Current Balance</p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-white">{currentCredits.toLocaleString()} <span className="text-sm font-normal text-slate-400">Credits</span></span>
              <div className="w-px h-8 bg-slate-800"></div>
              <span className="text-2xl font-bold text-white">{currentCampaigns} <span className="text-sm font-normal text-slate-400">Campaigns</span></span>
            </div>
            
            <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-500/80 bg-amber-900/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              <span>Paid but balance didn't update? <a href="mailto:praiselabsinc@gmail.com" className="underline hover:text-amber-400">Contact support</a></span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16 animate-fadeIn">
          {/* Personal Membership Plan */}
          <div className="relative bg-slate-900 border-2 border-purple-500 rounded-3xl p-8 shadow-2xl shadow-purple-900/20 transform hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              MONTHLY SUBSCRIPTION
            </div>
            <h3 className="text-2xl font-bold mb-2">{SUBSCRIPTION_PLAN.name}</h3>
            <p className="text-slate-400 text-sm mb-6">{SUBSCRIPTION_PLAN.description}</p>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-bold">${SUBSCRIPTION_PLAN.price}</span>
              <span className="text-slate-500">/month</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Access to AI Editor</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Includes {SUBSCRIPTION_PLAN.credits} Credits</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Includes {SUBSCRIPTION_PLAN.campaigns} Campaigns</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">1 Custom Domain</span>
              </li>
            </ul>

            <button 
              onClick={() => handlePurchase(SUBSCRIPTION_PLAN.id)}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
            >
              Subscribe Now <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Personal Top-Up Packs */}
          {PERSONAL_TOPUPS.map((plan) => (
            <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-slate-600 transition-all duration-300">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-slate-400 text-sm mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-slate-500">/pack</span>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">+{plan.credits.toLocaleString()} Credits</span>
                </li>
                <li className="flex items-start gap-3">
                  <Rocket className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">+{plan.campaigns} Campaigns</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Never Expires</span>
                </li>
              </ul>

              <button 
                onClick={() => handlePurchase(plan.id)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                Buy Credits <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="text-center text-slate-500 text-sm">
          <p>Payments are securely processed by Selar. You will be redirected to complete your purchase.</p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
