import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.API_KEY || ''; 
    // In a real app, you might want to handle missing keys more gracefully in the UI
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const generateMessageTemplate = async (
  purpose: string, 
  tone: string = 'professional'
): Promise<string> => {
  try {
    const client = getAIClient();
    const prompt = `Write a short, concise SMS notification template for the following purpose: "${purpose}". 
    The tone should be ${tone}. 
    Use placeholders like {name}, {date}, {time}, {link} where appropriate. 
    Do not include any introductory text, just the message content. Keep it under 160 characters if possible.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Error: No content generated.";
  } catch (error) {
    console.error("Error generating template:", error);
    return "Error generating template. Please try again or check your API key.";
  }
};