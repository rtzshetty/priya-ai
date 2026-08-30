import React, { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";

export default function RazorpayCheckout() {
  const [loading, setLoading] = useState(false);
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

  const handlePayment = async () => {
    try {
      setLoading(true);
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
          amount: 50000, // 500.00 INR
          currency: "INR",
          receipt: "receipt_" + Date.now(),
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const orderData = await orderResponse.json();

      // Step 2: Open Razorpay Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use Vite env var
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Priya Premium",
        description: "Unlock Premium Features",
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
          color: "#8b5cf6", // Violet 500
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
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {paymentStatus === "success" ? (
        <div className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full text-[10px] sm:text-xs">
          Premium Unlocked
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-full text-[10px] sm:text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
            Upgrade (₹500)
          </button>
          
          {paymentStatus === "error" && (
            <div className="absolute top-12 text-red-400 text-[10px] px-2 py-1 bg-red-500/10 rounded border border-red-500/20 whitespace-nowrap">
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
