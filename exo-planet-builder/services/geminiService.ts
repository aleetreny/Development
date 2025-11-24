import { GoogleGenAI } from "@google/genai";
import { RetroPlanetParams, PlanetLore } from "../types";
import { buildLorePrompt } from "./planetGenerator";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const generateRetroPlanetLore = async (params: RetroPlanetParams): Promise<PlanetLore> => {
  const client = getClient();
  if (!client) throw new Error("API Key missing");

  // Only generate Lore now, image is handled by Canvas
  const lorePrompt = buildLorePrompt(params);
  
  const loreResp = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: lorePrompt,
    config: {
      responseMimeType: "application/json",
      temperature: 1.2 // High creativity for "fumada" stories
    }
  });

  return JSON.parse(loreResp.text || '{}') as PlanetLore;
};