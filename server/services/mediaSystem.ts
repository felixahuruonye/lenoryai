import Replicate from "replicate";
import { AssemblyAI } from "assemblyai";
import { CreditSystem } from "./creditSystem.ts";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export class MediaSystem {
  static async generateVideo(userId: string, prompt: string, duration: number = 5) {
    // 1 credit = 1 second
    await CreditSystem.checkCredits(userId, duration);
    
    // Choose model based on style or default to a fast one
    const prediction = await replicate.predictions.create({
      model: "lucataco/hotshot-xl", // Example fast text-to-video model
      input: {
        prompt: prompt,
        video_length: duration
      }
    });

    await CreditSystem.deductCredits(userId, duration);
    return prediction;
  }

  static async transcribeAudio(audioUrl: string) {
    const transcript = await aai.transcripts.transcribe({
      audio: audioUrl,
      speech_model: "best"
    });
    return transcript;
  }

  static async getRealtimeToken() {
    const token = await aai.realtime.createTemporaryToken({ expires_in: 3600 });
    return token;
  }
}
