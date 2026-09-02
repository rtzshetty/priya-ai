const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove static vite import
code = code.replace('import { createServer as createViteServer } from "vite";\n', '');

// 2. Remove async function startServer() { and the closing brace
code = code.replace('async function startServer() {\n', '');
code = code.replace(/}\s*startServer\(\);\s*$/, ''); // remove the end of startServer

// 3. Update Vite middleware setup to use dynamic import and wrap server start
const viteSetupOld = `  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });`;

const viteSetupNew = `
// Export for Vercel
export default app;

if (!process.env.VERCEL) {
  (async () => {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on http://localhost:\${PORT}\`);
    });
`;

code = code.replace(viteSetupOld, viteSetupNew);

// Add the closing brace for the async IIFE after the websocket setup
code = code + "\n  })();\n}\n";

fs.writeFileSync('server.ts', code);
