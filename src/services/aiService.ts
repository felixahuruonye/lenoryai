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
      const modelName = isComplex ? "gemini-1.5-pro" : "gemini-1.5-flash";

      const model = this.ai.getGenerativeModel({
        model: modelName,
        systemInstruction: (customInstructions || "") + "\n\nYou are Lenory, a premium Nigerian AI tutor. Your English is clear and professional. Never repeat yourself. Always finish by asking how else you can specifically help based on the context."
      });

      const contents: any[] = [{ role: 'user', parts: [{ text: prompt }] }];

      if (attachment) {
        contents[0].parts.push({
          inlineData: {
            data: attachment.data,
            mimeType: attachment.mimeType
          }
        });
      }

      const result = await model.generateContent({
        contents,
        generationConfig: {
          responseMimeType: isJson ? "application/json" : undefined
        }
      });

      const text = result.response.text() || "";
      
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
      const modelName = isComplex ? "gemini-1.5-pro" : "gemini-1.5-flash";

      const model = this.ai.getGenerativeModel({
        model: modelName,
        systemInstruction: (customInstructions || "") + "\n\nYou are Lenory, a premium Nigerian AI tutor. Keep responses conversational and accurate. Don't repeat yourself."
      });

      const result = await model.generateContentStream(prompt);

      let fullText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
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
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, prompt })
      });
      if (!response.ok) throw new Error("Image synthesis failed.");
      const { url } = await response.json();
      return url;
    } catch (error: any) {
      console.error("Image Gen Error:", error);
      toast.error("Image synthesis failed. Check your credits.");
      throw error;
    }
  }

  static async generateVideo(userId: string, prompt: string): Promise<any> {
    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, prompt })
      });
      if (!response.ok) throw new Error("Video synthesis failed.");
      toast.success("Video generation started! I'll update you in a few minutes.");
      return await response.json();
    } catch (error: any) {
      console.error("Video Gen Error:", error);
      toast.error("Video synthesis failed.");
      throw error;
    }
  }
}
