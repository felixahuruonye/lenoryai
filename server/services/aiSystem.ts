import { GoogleGenAI } from "@google/genai";
import { AssemblyAI } from "assemblyai";
import Replicate from "replicate";
import { supabaseAdmin } from "../db.ts";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export class LearnorySystem {
  static async generateResponse(userId: string, message: string, history: any[] = []) {
    let userProfile = null;
    try {
      if (userId && userId !== 'anonymous') {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        userProfile = data;
      }
    } catch (e) {
      console.warn("User profile fetch failed:", e);
    }

    try {
      const response = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: message,
        config: {
          systemInstruction: this.getSystemPrompt(userProfile)
        }
      });

      const text = response.text || "";
      
      return { content: text, model: "gemini-3-flash-preview" };
    } catch (error: any) {
      console.error(`Gemini failed:`, error);
      return { 
        content: "I encountered a slight delay. Please refresh or try again in a moment.", 
        model: "error-fallback" 
      };
    }
  }

  static async generateExamQuestions(userId: string, type: string, subjects: string[], duration: number) {
    const prompt = `You are a Senior Nigerian Examiner for ${type}. Generate 10 multiple choice questions with options and correct answers for: ${subjects.join(', ')}. Return ONLY a JSON array of objects with fields: question, options (array of 4), and answer (the string text of the correct option).`;

    try {
      const result = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { responseMimeType: "application/json" } 
      });
      const content = result.text || "[]";
      const parsed = JSON.parse(content);
      return parsed.questions || parsed;
    } catch (error) {
      console.error("Exam Question Generation Failed:", error);
      return [];
    }
  }

  static async generateStudyPlan(userId: string, goal: string, subjects: string[], durationDays: number = 30) {
    const prompt = `Create a ${durationDays}-day study plan for ${goal} covering ${subjects.join(', ')}. Return ONLY a JSON object with fields: title, description, and days (array of objects with day, focus, tasks).`;

    try {
      const result = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt,
        config: { responseMimeType: "application/json" } 
      });
      const content = result.text || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Study Plan Gen Failed:", error);
      throw error;
    }
  }

  private static getSystemPrompt(user: any) {
    return `You are Lenory, an advanced AI-powered EdTech assistant for the Nigerian educational sector. 
    User Info: ${JSON.stringify(user?.preferences || {})}
    Rules:
    - Use simple, everyday language as preferred.
    - Focus on Nigerian curriculum (JAMB, WAEC, NECO).
    - Provide structured, markdown responses.
    - You can draw ASCII graphs for math help.
    - If user asks for video, you will trigger Replicate system.
    - Always refer to yourself as Lenory (never ALL CAPS).`;
  }
}

export class TutorSystem {
  static detectSubject(content: string) {
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Government', 'Economics'];
    for (const sub of subjects) {
      if (content.toLowerCase().includes(sub.toLowerCase())) return sub;
    }
    return 'General';
  }
}
