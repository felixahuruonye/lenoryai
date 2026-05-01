import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";

const getGeminiKey = () => process.env.GEMINI_API_KEY || "";

export interface AIResponse {
  text: string;
  error?: string;
}

export class AIService {
  private static ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  private static async getSystemInstructions(userId: string): Promise<string> {
    const { data } = await supabase
      .from('profiles')
      .select('custom_instructions')
      .eq('id', userId)
      .single();
    
    return data?.custom_instructions || "";
  }

  static async generate(userId: string, prompt: string, isJson: boolean = false): Promise<any> {
    try {
      const customInstructions = await this.getSystemInstructions(userId);

      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: customInstructions || undefined,
          ...(isJson ? { responseMimeType: "application/json" } : {})
        }
      });

      const text = response.text || "";

      // Log usage for admin
      await supabase.from('api_usage').insert({
        user_id: userId,
        model: "gemini-3-flash-preview",
        endpoint: "generateContent",
        tokens_estimate: text.length / 4 // Rough estimate
      });

      if (isJson) {
        const clean = text.replace(/```json\n?|```/g, "").trim();
        return JSON.parse(clean);
      }

      return text;
    } catch (error: any) {
      console.error("AI Service Error:", error);
      throw new Error(error.message || "AI Synthesis failed.");
    }
  }
}
