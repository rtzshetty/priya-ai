const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace Personal Mode click
const personalClickOriginal = `onClick={() => setMode("personal")}`;
const personalClickNew = `onClick={() => {
                  setMode("personal");
                  if (language === "hindi") setLanguage("english");
                }}`;
code = code.replace(personalClickOriginal, personalClickNew);

// Replace Physiological Mode click
const physClickOriginal = `if (isPremium) {
                    setMode("physiological");
                  }`;
const physClickNew = `if (isPremium) {
                    setMode("physiological");
                    if (language === "hindi") setLanguage("english");
                  }`;
code = code.replace(physClickOriginal, physClickNew);


// Replace the language buttons container
const langButtonsOriginal = `<div className="flex bg-white/5 p-0.5 sm:p-1 rounded-full border border-white/10">
              <button
                onClick={() => setLanguage("english")}
                className={\`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors \${language === "english" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}\`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("hinglish")}
                className={\`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors \${language === "hinglish" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}\`}
              >
                Hinglish
              </button>
            </div>`;
const langButtonsNew = `<div className="flex bg-white/5 p-0.5 sm:p-1 rounded-full border border-white/10">
              <button
                onClick={() => setLanguage("english")}
                className={\`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors \${language === "english" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}\`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("hinglish")}
                className={\`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors \${language === "hinglish" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}\`}
              >
                Hinglish
              </button>
              {mode === "professional" && (
                <button
                  onClick={() => setLanguage("hindi")}
                  className={\`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors \${language === "hindi" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}\`}
                >
                  Hindi
                </button>
              )}
            </div>`;
code = code.replace(langButtonsOriginal, langButtonsNew);

fs.writeFileSync('src/App.tsx', code);
