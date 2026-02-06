import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface PaymentSuccessPageProps {
  onReturnToDashboard: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onReturnToDashboard }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl shadow-green-900/20">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          We are updating your credits now. It may take a few moments for the changes to reflect in your dashboard.
        </p>
        
        <button
          onClick={onReturnToDashboard}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
        >
          Return to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
