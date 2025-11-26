import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_TERMS_PER_CARD } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = 'gemini-2.5-flash';

/**
 * Expands a provided list of terms to meet the required count if there are too few.
 * Uses the existing terms to infer the topic.
 */
export const expandTermList = async (
  existingTerms: string[], 
  neededTotal: number
): Promise<string[]> => {
  const missingCount = neededTotal - existingTerms.length;
  
  // If we have enough, or no input to infer from, return original
  if (missingCount <= 0 || existingTerms.length === 0) return existingTerms;

  // Take a sample of existing terms to give context (max 20 to save tokens/confusion)
  const sampleTerms = existingTerms.slice(0, 30);
  
  const prompt = `
    Ik heb een lijst met begrippen voor het spel "30 Seconds".
    De huidige lijst bevat deze woorden: ${JSON.stringify(sampleTerms)}.
    
    Jouw taak:
    1. Analyseer de bovenstaande woorden om het thema of het niveau te bepalen.
    2. Genereer ${missingCount} NIEUWE, unieke begrippen die perfect in deze lijst passen.
    3. De nieuwe begrippen moeten in het Nederlands zijn.
    4. Zorg dat er geen dubbele begrippen tussen zitten die al in de lijst staan.
    
    Geef ALLEEN een JSON array terug met de nieuwe strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return existingTerms;

    const newTerms = JSON.parse(text) as string[];
    
    // Combine and deduplicate roughly (case insensitive check)
    const currentSet = new Set(existingTerms.map(t => t.toLowerCase()));
    const validNewTerms = newTerms.filter(t => !currentSet.has(t.toLowerCase()));
    
    return [...existingTerms, ...validNewTerms];
  } catch (error) {
    console.error("Error expanding list:", error);
    // Fallback: return what we have, the UI will likely handle the shortfall by showing errors or filling with placeholders
    return existingTerms;
  }
};