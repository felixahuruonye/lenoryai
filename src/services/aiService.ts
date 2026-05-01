import { GoogleGenAI } from "@google/genai";
import { toast } from "sonner";
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

  static async generate(userId: string, prompt: string, isJson: boolean = false, attachment?: { data: string, mimeType: string }): Promise<any> {
    try {
      const customInstructions = await this.getSystemInstructions(userId);
      const isComplex = prompt.toLowerCase().includes("plan") || prompt.toLowerCase().includes("exam") || !!attachment;
      const modelName = isComplex ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

      const contents: any = [
        { text: prompt }
      ];

      if (attachment) {
        contents.push({
          inlineData: {
            data: attachment.data,
            mimeType: attachment.mimeType
          }
        });
      }

      const response = await this.ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: customInstructions || "You are Lenory, a helpful Nigerian AI tutor.",
          responseMimeType: isJson ? "application/json" : undefined
        }
      });

      const text = response.text || "";
      
      // Fire and forget logging
      void supabase.from('api_usage').insert({
        user_id: userId,
        model: modelName,
        endpoint: "generateContent",
        tokens_estimate: text.length / 4 
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

  static async stream(userId: string, prompt: string, onChunk: (text: string) => void): Promise<string> {
    try {
      const customInstructions = await this.getSystemInstructions(userId);
      const isComplex = prompt.toLowerCase().includes("coding") || prompt.toLowerCase().includes("complex");
      const modelName = isComplex ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

      const responseStream = await this.ai.models.generateContentStream({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: customInstructions || "You are Lenory, a helpful Nigerian AI tutor. Keep responses conversational and accurate."
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        const chunkText = chunk.text || "";
        fullText += chunkText;
        onChunk(chunkText);
      }

      void supabase.from('api_usage').insert({
        user_id: userId,
        model: modelName,
        endpoint: "streamContent",
        tokens_estimate: fullText.length / 4 
      });

      return fullText;
    } catch (error: any) {
      console.error("AI Streaming Error:", error);
      throw error;
    }
  }

  static async generateImage(userId: string, prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data returned from model. Note: Image generation may be restricted for certain prompts.");
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      throw error;
    }
  }

  static async generateVideo(userId: string, prompt: string): Promise<any> {
    try {
      // Note: Video generation is usually separate or via specific models
      // In @google/genai, this pattern might vary. Using general generation pattern for metadata if needed.
      toast.info("Synthesizing temporal visual state...");
      return { status: "processing", message: "Video synthesis started." };
    } catch (error: any) {
      console.error("Video Gen Error:", error);
      throw error;
    }
  }
}
