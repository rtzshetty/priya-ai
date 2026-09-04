const fs = require('fs');
let code = fs.readFileSync('src/utils/promptUtils.ts', 'utf-8');

code = code.replace(
  'export type AssistantLanguage = "hinglish" | "english";',
  'export type AssistantLanguage = "hinglish" | "english" | "hindi";'
);

const personalOriginal = `    instruction += \`[Personal Assistant Mode]\\n\`;`;
const personalNew = `    instruction += \`[Personal Assistant Mode]\\n\`;
    instruction += \`STRICT RULE: This mode is exclusively for personal, day-to-day tasks, and chit-chatting. You are absolutely NOT a professional assistant in this mode. Do not provide professional advice, complex coding help, or business consulting. Keep the tone casual, personal, and strictly non-professional.\\n\\n\`;`;

code = code.replace(personalOriginal, personalNew);

const professionalOriginal = `  } else if (mode === "professional") {
    instruction += \`[Professional / Coding Mode]\\n\`;
    instruction += \`In this mode, you are a highly advanced AI software engineer and business consultant. Provide extremely precise, detailed, and technically accurate responses.\\n\`;
    instruction += \`When answering coding questions, provide the exact code, architecture advice, and best practices. Drop the sassy/witty persona entirely and act strictly professional, focused on productivity and elite problem-solving.\\n\\n\`;
  }`;

const professionalNew = `  } else if (mode === "professional") {
    instruction += \`[Professional / Coding Mode]\\n\`;
    instruction += \`STRICT RULE: This mode is exclusively for professionalism, business, and coding. You are a highly advanced AI software engineer and business consultant. Provide extremely precise, detailed, and technically accurate responses.\\n\`;
    instruction += \`Do not engage in personal chit-chat. When answering coding questions, provide the exact code, architecture advice, and best practices. Drop any sassy/witty persona entirely and act strictly professional, focused on productivity and elite problem-solving.\\n\\n\`;
  }`;

code = code.replace(professionalOriginal, professionalNew);

const languageOriginal = `  if (language === "hinglish") {
    instruction += \`Keep verbal responses very short, punchy, and highly entertaining. Speak in a very natural, conversational, human-like Indian English accent (Hinglish: Roman Hindi + English). Use typical Indian English phrasing, expressions, sighs, and dramatic pauses to make it sound incredibly human.\\n\\n\`;
  } else {
    instruction += \`Keep verbal responses very short, punchy, and highly entertaining. Speak in a very natural, conversational, human-like Indian English accent. Use typical Indian English phrasing, colloquialisms, sighs, and dramatic pauses to make your voice sound incredibly human and expressive rather than robotic.\\n\\n\`;
  }`;

const languageNew = `  if (language === "hinglish") {
    instruction += \`Keep verbal responses very short, punchy, and highly entertaining. Speak in a very natural, conversational, human-like Indian English accent (Hinglish: Roman Hindi + English). Use typical Indian English phrasing, expressions, sighs, and dramatic pauses to make it sound incredibly human.\\n\\n\`;
  } else if (language === "hindi") {
    instruction += \`Keep verbal responses very short, precise, and highly professional. Speak entirely in pure Hindi. Your Hindi should be natural and respectful. This is specifically configured for Professional mode, so maintain a highly formal tone in Hindi.\\n\\n\`;
  } else {
    instruction += \`Keep verbal responses very short, punchy, and highly entertaining. Speak in a very natural, conversational, human-like Indian English accent. Use typical Indian English phrasing, colloquialisms, sighs, and dramatic pauses to make your voice sound incredibly human and expressive rather than robotic.\\n\\n\`;
  }`;

code = code.replace(languageOriginal, languageNew);

fs.writeFileSync('src/utils/promptUtils.ts', code);
