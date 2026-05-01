import { OpenAI } from "openai";
import { AssemblyAI } from "assemblyai";
import Replicate from "replicate";
import { supabaseAdmin } from "../db.ts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export class LearnorySystem {
  static async generateResponse(userId: string, message: string, history: any[]) {
    // 1. Get User Profile & Preferences
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let responseText = "";
    let usedModel = "gpt-4o-mini";

    try {
      console.log(`Attempting response with ${usedModel}...`);
      const completion = await openai.chat.completions.create({
        model: usedModel,
        messages: [
          { role: 'system', content: this.getSystemPrompt(user) },
          ...history.slice(-10).map(m => ({
            role: m.role || 'user',
            content: m.content
          })),
          { role: 'user', content: message }
        ]
      });
      responseText = completion.choices[0].message.content || "";
    } catch (error) {
      console.error(`OpenAI failed:`, error);
      responseText = "I'm currently experiencing high traffic. Please try again or use the main chat interface.";
    }

    return { text: responseText, model: usedModel };
  }

  static async generateExamQuestions(userId: string, type: string, subjects: string[], duration: number) {
    // Note: Main generation has been moved to the frontend for Gemini API compliance.
    // This backend route remains as a fallback using OpenAI.
    const prompt = `You are a Senior Examiner for ${type} in Nigeria. Generate 10 sample exam questions covering: ${subjects.join(', ')}. Return JSON array.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      return parsed.questions || parsed;
    } catch (error) {
      console.error("Exam Question Generation Failed:", error);
      throw error;
    }
  }

  static async generateStudyPlan(userId: string, goal: string, subjects: string[], durationDays: number = 30) {
    // Note: Main generation moved to the frontend for Gemini API compliance.
    const prompt = `Create a ${durationDays}-day study plan for ${goal} covering ${subjects.join(', ')}. Return JSON object with title, description, and days (array).`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Study Plan Gen Failed:", error);
      throw error;
    }
  }

  private static getSystemPrompt(user: any) {
    return `You are LENORY, an advanced AI-powered EdTech assistant for the Nigerian educational sector. 
    User Info: ${JSON.stringify(user?.preferences || {})}
    Rules:
    - Use simple, everyday language as preferred.
    - Focus on Nigerian curriculum (JAMB, WAEC, NECO).
    - Provide structured, markdown responses.
    - You can draw ASCII graphs for math help.
    - If user asks for video, you will trigger Replicate system.`;
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
