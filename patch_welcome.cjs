const fs = require('fs');
let code = fs.readFileSync('src/components/WelcomeScreen.tsx', 'utf8');

code = code.replace(
  "import { \n  signInWithPopup,",
  "import { \n  signInWithPopup,\n  signInWithRedirect,"
);

code = code.replace(
  "const result = await signInWithPopup(auth, googleProvider);",
  `let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user' || popupErr.message.toLowerCase().includes('webview')) {
          console.log("Popup blocked or in webview, falling back to redirect...");
          await signInWithRedirect(auth, googleProvider);
          return; // The page will redirect
        }
        throw popupErr;
      }`
);

code = code.replace(
  '<div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden">',
  '<div className="h-[100dvh] w-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">'
);

fs.writeFileSync('src/components/WelcomeScreen.tsx', code);
console.log("Patched WelcomeScreen");
