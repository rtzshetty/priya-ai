import React, { useState, useEffect } from "react";
import PlayStoreCheckout from "./PlayStoreCheckout";
import RazorpayCheckout from "./RazorpayCheckout";

export default function SmartCheckout({ onPaymentSuccess }: { onPaymentSuccess?: () => void }) {
  const [isMedian, setIsMedian] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isMedianEnv = typeof (window as any).median !== 'undefined' 
      || typeof (window as any).gonative !== 'undefined'
      || userAgent.indexOf('median') > -1 
      || userAgent.indexOf('gonative') > -1;
    
    setIsMedian(isMedianEnv);
  }, []);

  if (isMedian) {
    return <PlayStoreCheckout onPaymentSuccess={onPaymentSuccess} />;
  }

  return <RazorpayCheckout onPaymentSuccess={onPaymentSuccess} />;
}
