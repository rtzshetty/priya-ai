const fs = require('fs');
let code = fs.readFileSync('src/components/PlayStoreCheckout.tsx', 'utf-8');

code = code.replace(
  `      } else {
        // Mock fallback for standard browser testing
        setTimeout(() => {
          setLoadingPlan(null);
          setShowModal(false);
          if (onPaymentSuccess) onPaymentSuccess();
        }, 1500);
      }`,
  `      } else {
        throw new Error("In-App Purchases are not configured in your Median app.");
      }`
);

fs.writeFileSync('src/components/PlayStoreCheckout.tsx', code);
