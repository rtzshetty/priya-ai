import React, { useState } from "react";
import { Loader2, CreditCard, X, Check, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PLANS = [
  { id: "1_month", name: "1 Month", price: 50, duration: "1 month", popular: false },
  { id: "3_months", name: "3 Months", price: 150, duration: "3 months", popular: true },
  { id: "1_year", name: "1 Year", price: 600, duration: "1 year", popular: false },
];

export default function RazorpayCheckout({ onPaymentSuccess }: { onPaymentSuccess?: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (plan: typeof PLANS[0]) => {
    try {
      setLoadingPlan(plan.id);
      setPaymentStatus("idle");
      setErrorMessage("");

      const res = await loadRazorpayScript();
      if (!res) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      // Step 1: Create Order
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100, 
          currency: "INR",
          receipt: "receipt_" + Date.now(),
        }),
      });

      if (!orderResponse.ok) {
        let errorMsg = "Failed to create order";
        const contentType = orderResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await orderResponse.json();
          errorMsg = errorData.error || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const orderData = await orderResponse.json();

      // Step 2: Open Razorpay Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Priya Premium",
        description: `Unlock Premium Features (${plan.name})`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Step 3: Verify Signature
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              setPaymentStatus("success");
              setShowModal(false);
              if (onPaymentSuccess) onPaymentSuccess();
            } else {
              throw new Error("Invalid signature");
            }
          } catch (err: any) {
            setPaymentStatus("error");
            setErrorMessage(err.message || "Verification failed");
          }
        },
        prefill: {
          name: "User",
          email: "user@example.com",
          contact: "9999999999",
        },
        theme: {
          color: "#8b5cf6",
        },
      };

      const rzp1 = new (window as any).Razorpay(options);
      
      rzp1.on("payment.failed", function (response: any) {
        setPaymentStatus("error");
        setErrorMessage(response.error.description || "Payment failed");
      });

      rzp1.open();
    } catch (err: any) {
      setPaymentStatus("error");
      setErrorMessage(err.message || "Something went wrong");
    } finally {
      setLoadingPlan(null);
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
          
          {paymentStatus === "error" && !showModal && (
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

              {paymentStatus === "error" && (
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
