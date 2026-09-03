const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  'import PlayStoreCheckout from "./components/PlayStoreCheckout";',
  'import SmartCheckout from "./components/SmartCheckout";'
);

code = code.replace(
  '<PlayStoreCheckout onPaymentSuccess={handlePaymentSuccess} />',
  '<SmartCheckout onPaymentSuccess={handlePaymentSuccess} />'
);

fs.writeFileSync('src/App.tsx', code);
