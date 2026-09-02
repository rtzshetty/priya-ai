const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const ai = new GoogleGenAI\(\{\s*apiKey: process\.env\.GEMINI_API_KEY,\s*httpOptions: \{\s*headers: \{ 'User-Agent': 'aistudio-build' \}\s*\}\s*\}\);/, `let _ai;
function getAI() {
  if (!_ai) {
    _ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy_key_to_prevent_crash",
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return _ai;
}`);

code = code.replace(/await ai\.models\.generateContent/g, 'await getAI().models.generateContent');
code = code.replace(/await ai\.models\.generateContentStream/g, 'await getAI().models.generateContentStream');
code = code.replace(/await ai\.live\.connect/g, 'await getAI().live.connect');

fs.writeFileSync('server.ts', code);
