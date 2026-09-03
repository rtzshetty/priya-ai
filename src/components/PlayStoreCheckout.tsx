import React, { useState, useEffect } from "react";
import { Loader2, CreditCard, X, Check, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// For Median.co JS Bridge
declare global {
  interface Window {
    median?: any;
    gonative?: any;
    median_iap_info?: (data: any) => void;
    median_iap_purchased?: (data: any) => void;
  }
}

const PLANS = [
  { id: "priya_premium_1_month", name: "1 Month", price: 50, duration: "1 month", popular: false },
  { id: "priya_premium_3_months", name: "3 Months", price: 150, duration: "3 months", popular: true },
  { id: "priya_premium_1_year", name: "1 Year", price: 600, duration: "1 year", popular: false },
];

export default function PlayStoreCheckout({ onPaymentSuccess }: { onPaymentSuccess?: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Setup listeners for Median IAP callbacks
    window.median_iap_purchased = function (data: any) {
      setLoadingPlan(null);
      if (data && data.success) {
        setShowModal(false);
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        setErrorMessage("Purchase failed or was cancelled.");
      }
    };

    return () => {
      delete window.median_iap_purchased;
    };
  }, [onPaymentSuccess]);

  const handlePayment = async (plan: typeof PLANS[0]) => {
    try {
      setLoadingPlan(plan.id);
      setErrorMessage("");

      const isMedian = typeof window.median !== 'undefined' || typeof window.gonative !== 'undefined';
      
      if (isMedian) {
        // Trigger Median IAP
        const bridge = window.median || window.gonative;
        if (bridge.iap && bridge.iap.purchase) {
          bridge.iap.purchase({ productID: plan.id });
          // Note: Wait for window.median_iap_purchased callback to fire.
        } else {
          throw new Error("In-App Purchases are not configured in your Median app.");
        }
      } else {
        // Mock fallback for standard browser testing
        setTimeout(() => {
          setLoadingPlan(null);
          setShowModal(false);
          if (onPaymentSuccess) onPaymentSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setLoadingPlan(null);
      setErrorMessage(err.message || "Something went wrong");
    }
  };

  return (
    <>
      <div className="flex flex-col items-center relative">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-full text-[10px] sm:text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Star size={12} className="fill-white" />
            Upgrade to Premium
          </button>
          
          {errorMessage && !showModal && (
            <div className="absolute top-12 text-red-400 text-[10px] px-2 py-1 bg-red-500/10 rounded border border-red-500/20 whitespace-nowrap z-50">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6 shrink-0 mt-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                  <Star size={24} className="text-white fill-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 font-serif">Choose Your Plan</h2>
                <p className="text-white/60 text-sm max-w-sm mx-auto">Unlock Physiological mode and premium features tailored for you.</p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center shrink-0">
                  {errorMessage}
                </div>
              )}

              <div className="overflow-y-auto pr-1 pb-4 custom-scrollbar">
                <div className="grid gap-4 md:grid-cols-3">
                  {PLANS.map((plan) => (
                    <div 
                      key={plan.id}
                      className={`relative flex flex-col p-5 rounded-xl border transition-all ${
                        plan.popular 
                          ? "border-violet-500 bg-violet-500/10 md:-translate-y-1 shadow-[0_8px_30px_rgb(139,92,246,0.12)]" 
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap shadow-lg">
                          Most Popular
                        </div>
                      )}
                      
                      <div className="mb-6 mt-2 text-center md:text-left">
                        <h3 className="text-white font-medium mb-1 text-sm md:text-base">{plan.name}</h3>
                        <div className="flex items-baseline justify-center md:justify-start gap-1">
                          <span className="text-3xl font-bold text-white">₹{plan.price}</span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-6 flex-1">
                        <li className="flex items-start gap-2 text-xs md:text-sm text-white/70">
                          <Check size={16} className="text-green-400 shrink-0 mt-0.5" />
                          <span>Physiological Mode</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-white/70">
                          <Check size={16} className="text-green-400 shrink-0 mt-0.5" />
                          <span>Premium Analytics</span>
                        </li>
                      </ul>

                      <button
                        onClick={() => handlePayment(plan)}
                        disabled={loadingPlan !== null}
                        className={`w-full py-3 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          plan.popular 
                            ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20" 
                            : "bg-white/10 text-white hover:bg-white/20"
                        } disabled:opacity-50`}
                      >
                        {loadingPlan === plan.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          "Select Plan"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
