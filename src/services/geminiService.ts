import { GoogleGenAI, Type } from "@google/genai";
import { AssistantMode, AssistantLanguage, getSystemInstruction, saveUserMemory } from "../utils/promptUtils";

let chatSession: any = null;

export function resetPriyaSession() {
  chatSession = null;
}

export async function generateSong(prompt: string): Promise<{ audio: string, mimeType: string }> {
  if (!API_KEY) throw new Error("GEMINI_API_KEY is not defined.");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
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
  return { audio: audioBase64, mimeType };
}

export interface PriyaResponse {
  text: string;
  sources?: { title: string; url: string; type?: "web" | "maps" }[];
  songAudio?: string;
  songMimeType?: string;
}

// Use VITE_ prefix for production builds (standard Vite behavior)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : undefined);

export async function getPriyaResponse(
  prompt: string, 
  history: { sender: "user" | "priya", text: string }[] = [],
  location?: { lat: number; lng: number },
  mode: AssistantMode = "personal",
  language: AssistantLanguage = "hinglish",
  userName: string = "Guest"
): Promise<PriyaResponse> {
  try {
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    if (!chatSession) {
      // ... same history processing ...
      const recentHistory = history.slice(-20);
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
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

      // If we have location, prioritize googleMaps tool as per user request
      const tools: any[] = location ? [{ googleMaps: {} }] : [{ googleSearch: {} }];
      
      // Add memory tool
      tools.push({
        functionDeclarations: [
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
            description: "Call this tool when the user wants to hear a song, or when they want you to sing. You must provide the lyrics. It will play the song.",
            parameters: {
              type: Type.OBJECT,
              properties: { lyrics: { type: Type.STRING, description: "The lyrics of the song to sing." } },
              required: ["lyrics"]
            }
          }
        ]
      });

      const toolConfig = location ? {
        retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } }
      } : undefined;

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-preview", // upgraded from flash-lite to flash for better tool calling
        config: {
          systemInstruction: getSystemInstruction(mode, language, userName),
          tools,
          toolConfig
        },
        history: formattedHistory,
      });
    }

    let response = await chatSession.sendMessage({ message: prompt });
    
    // Handle function calls manually if they exist
    let returnAudio: string | undefined;
    let returnMime: string | undefined;

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionResponses: any[] = [];
      for (const call of response.functionCalls) {
        if (call.name === "saveUserMemory") {
          const args = call.args as any;
          if (args.fact) {
            saveUserMemory(userName, args.fact);
            functionResponses.push({
               functionResponse: { name: call.name, response: { success: true, message: "Fact saved successfully." } }
            });
          }
        } else if (call.name === "singSong") {
          const args = call.args as any;
          if (args.lyrics) {
            try {
              const data = await generateSong(`Sing this: ${args.lyrics}`);
              if (data.audio) {
                returnAudio = data.audio;
                returnMime = data.mimeType;
                functionResponses.push({
                   functionResponse: { name: call.name, response: { success: true, message: "Song played successfully." } }
                });
              }
            } catch (e: any) {
              functionResponses.push({
                 functionResponse: { name: call.name, response: { success: false, error: e.message } }
              });
            }
          }
        }
      }
      
      if (functionResponses.length > 0) {
        response = await chatSession.sendMessage(functionResponses);
      }
    }
    
    const sources: { title: string; url: string; type?: "web" | "maps" }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, url: chunk.web.uri, type: "web" });
        }
        if (chunk.maps) {
          sources.push({ title: chunk.maps.title || "View on Maps", url: chunk.maps.uri, type: "maps" });
        }
      });
    }

    return {
      text: response.text || "Here is your song! 🎵",
      sources: sources.length > 0 ? sources : undefined,
      songAudio: returnAudio,
      songMimeType: returnMime
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      text: "Uff, mera dimaag kharab ho gaya hai. Try again later, Prithviraj Shetty.",
    };
  }
}

export async function analyzeUserMood(text: string): Promise<number> {
  try {
    if (!API_KEY) return 5;
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{
        parts: [{
          text: `Analyze the emotional sentiment of the following message from a user. Rate their mood on a scale from 1 to 10, where 1 is extremely sad/angry/stressed, 5 is neutral, and 10 is extremely happy/excited/relaxed. Return ONLY the number, no extra text.\n\nMessage: "${text}"`
        }]
      }],
    });
    
    const output = response.text?.trim() || "5";
    const score = parseInt(output, 10);
    if (!isNaN(score) && score >= 1 && score <= 10) {
      return score;
    }
    return 5;
  } catch (error) {
    console.error("Mood Analysis Error:", error);
    return 5;
  }
}

export async function getPriyaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY! });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function generatePriyaVideo(prompt: string, onProgress: (msg: string) => void): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY! });

    onProgress("Priya is manifesting your vision...");
    
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-lite-generate-preview",
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: "16:9",
      },
    });

    while (!operation.done) {
      onProgress("Still cooking... perfection takes time!");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
      throw new Error(String(operation.error.message || "Unknown error"));
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    // Append API key to header for fetch as per skill
    const response = await fetch(downloadLink, {
      method: "GET",
      headers: {
        "x-goog-api-key": API_KEY!,
      },
    });

    if (!response.ok) {
        throw new Error("Failed to download video");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    console.error("Video Gen Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_RESET");
    }
    throw error;
  }
}

