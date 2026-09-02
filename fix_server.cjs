const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace('const { createServer: createViteServer } = await import("vite");', 'const viteName = "vite";\n      const { createServer: createViteServer } = await import(viteName);');
fs.writeFileSync('server.ts', code);
