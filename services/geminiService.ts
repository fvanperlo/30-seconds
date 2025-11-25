import { GoogleGenAI, Type } from "@google/genai";
import { TERMS_PER_CARD } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelName = 'gemini-2.5-flash';

/**
 * Generates a list of unique terms for the game based on a topic.
 */
export const generateTermsFromTopic = async (
  topic: string, 
  numberOfCards: number
): Promise<string[]> => {
  const totalTermsNeeded = numberOfCards * TERMS_PER_CARD;

  const prompt = `
    Je bent een expert in het bordspel "30 Seconds". 
    Genereer een lijst van ${totalTermsNeeded} unieke, Nederlandse begrippen voor het onderwerp: "${topic}".
    De begrippen moeten divers zijn (personen, objecten, locaties, concepten) die bij dit vak of onderwerp horen.
    De begrippen moeten moeilijk genoeg zijn voor het spel, maar wel raadbaar.
    Geef ALLEEN de JSON array met strings terug.
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
    if (!text) return [];
    
    const terms = JSON.parse(text) as string[];
    return terms;
  } catch (error) {
    console.error("Error generating terms:", error);
    throw new Error("Kon geen begrippen genereren. Probeer het opnieuw.");
  }
};

/**
 * Expands a provided list of terms to meet the required count if there are too few.
 */
export const expandTermList = async (
  existingTerms: string[], 
  neededCount: number,
  topic: string
): Promise<string[]> => {
  const missingCount = neededCount - existingTerms.length;
  if (missingCount <= 0) return existingTerms;

  const prompt = `
    Ik maak een 30 Seconds spel over "${topic}".
    Ik heb al deze begrippen: ${JSON.stringify(existingTerms.slice(0, 50))}.
    Genereer nog ${missingCount + 5} NIEUWE, unieke begrippen die hierbij passen in het Nederlands.
    Geef ALLEEN de JSON array met de nieuwe strings terug.
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
    // Filter duplicates just in case
    const uniqueNew = newTerms.filter(t => !existingTerms.includes(t));
    
    return [...existingTerms, ...uniqueNew];
  } catch (error) {
    console.error("Error expanding list:", error);
    // Fallback: just return existing list, application logic handles repetition/errors
    return existingTerms;
  }
};
