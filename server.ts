import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

class AsyncQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: (() => void)[] = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.next();
        }
      });
      this.next();
    });
  }

  private next() {
    if (this.running < this.concurrency && this.queue.length > 0) {
      this.running++;
      const task = this.queue.shift();
      if (task) task();
    }
  }
}

const apiQueue = new AsyncQueue(10); // Distribute load evenly, limit concurrent requests

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post("/api/chat", async (req, res) => {
    try {
      await apiQueue.enqueue(async () => {
        const { prompt, history, location, systemInstruction } = req.body;
        
        let formattedHistory: any[] = [];
        let currentRole = "";
        let currentText = "";

        for (const msg of history || []) {
          const role = msg.sender === "user" ? "user" : "model";
          if (role === currentRole) {
            currentText += "\n" + msg.text;
          } else {
            if (currentRole !== "") {
              formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
            }
            currentRole = role;
            currentText = msg.text;
          }
        }
        if (currentRole !== "") {
          formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
        }

        if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
          formattedHistory.shift();
        }

        const tools: any[] = location ? [{ googleMaps: {} }] : [{ googleSearch: {} }];
        
        tools.push({
          functionDeclarations: [
            {
              name: "saveUserMemory",
              description: "Save an important fact about the user (e.g., likes, dislikes, pets, job) to their permanent profile.",
              parameters: {
                type: Type.OBJECT,
                properties: { fact: { type: Type.STRING, description: "A concise fact to remember about the user." } },
                required: ["fact"]
              }
            }
          ]
        });

        const toolConfig = location ? {
          retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } }
        } : undefined;

        const chatSession = ai.chats.create({
          model: "gemini-3.1-flash-preview",
          config: { systemInstruction, tools, toolConfig },
          history: formattedHistory,
        });

        const response = await chatSession.sendMessage({ message: prompt });
        
        let functionCalls = response.functionCalls || [];
        const sources: { title: string; url: string; type?: "web" | "maps" }[] = [];
        
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          chunks.forEach((chunk: any) => {
            if (chunk.web) sources.push({ title: chunk.web.title, url: chunk.web.uri, type: "web" });
            if (chunk.maps) sources.push({ title: chunk.maps.title || "View on Maps", url: chunk.maps.uri, type: "maps" });
          });
        }

        res.json({
          text: response.text || "",
          functionCalls: functionCalls.map(c => ({ name: c.name, args: c.args, id: c.id })),
          sources: sources.length > 0 ? sources : undefined
        });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/audio", async (req, res) => {
    try {
      await apiQueue.enqueue(async () => {
        const { text } = req.body;
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        res.json({ audio: base64Audio });
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/sing", async (req, res) => {
    try {
      await apiQueue.enqueue(async () => {
        const { prompt } = req.body;
        const response = await ai.models.generateContentStream({
          model: "lyria-3-clip-preview",
          contents: prompt,
        });

        let audioBase64 = "";
        let mimeType = "audio/wav";

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
          }
        }
        res.json({ audio: audioBase64, mimeType });
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  let activeConnections = 0;
  const MAX_CONNECTIONS = 20;

  wss.on("connection", async (clientWs, request) => {
    if (activeConnections >= MAX_CONNECTIONS) {
      clientWs.send(JSON.stringify({ error: "Server is currently at maximum capacity. Please try again later." }));
      clientWs.close();
      return;
    }
    
    activeConnections++;
    
    try {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      let systemInstruction = url.searchParams.get("systemInstruction") || "";
      
      const tools = [{
        functionDeclarations: [
          {
            name: "executeBrowserAction",
            description: "Open a website, perform a Google search, or perform a browser action (like YouTube or Spotify).",
            parameters: {
              type: Type.OBJECT,
              properties: {
                actionType: { type: Type.STRING, description: "'open', 'search', 'youtube', 'spotify', 'whatsapp', 'directions'" },
                query: { type: Type.STRING, description: "Search query or destination." },
                target: { type: Type.STRING, description: "Origin or phone number." }
              },
              required: ["actionType", "query"]
            }
          },
          {
            name: "saveUserMemory",
            description: "Save an important fact about the user.",
            parameters: {
              type: Type.OBJECT,
              properties: { fact: { type: Type.STRING } },
              required: ["fact"]
            }
          },
          {
            name: "singSong",
            description: "Call this tool when the user wants to hear a song, or when they want you to sing. You must provide the lyrics.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                lyrics: { type: Type.STRING, description: "The lyrics of the song to sing." },
                style: { type: Type.STRING, description: "The musical style." }
              },
              required: ["lyrics"]
            }
          }
        ]
      }];

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          systemInstruction,
          tools,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.toolCall?.functionCalls) {
              clientWs.send(JSON.stringify({ functionCalls: message.toolCall.functionCalls }));
            }
          },
          onerror: (err) => {
            clientWs.send(JSON.stringify({ error: err.message }));
          }
        },
      });

      clientWs.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
        if (msg.video) {
          session.sendRealtimeInput({
            video: { data: msg.video, mimeType: "image/jpeg" },
          });
        }
        if (msg.text) {
          session.sendRealtimeInput({ text: msg.text });
        }
        if (msg.toolResponse) {
          session.sendToolResponse({ functionResponses: msg.toolResponse });
        }
      });

      clientWs.on("close", () => {
        activeConnections--;
        session.close();
      });
    } catch (err: any) {
      activeConnections--;
      clientWs.send(JSON.stringify({ error: err.message }));
      clientWs.close();
    }
  });
}

startServer();
