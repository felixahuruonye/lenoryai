import { supabaseAdmin } from "../db.ts";

export class CreditSystem {
  static async checkCredits(userId: string, requiredAmount: number = 1) {
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('credits, email')
      .eq('id', userId)
      .single();

    if (error || !user) throw new Error("User not found");

    // Admin override
    if (user.email === 'felixahuruonye@gmail.com') return true;

    if (user.credits < requiredAmount) {
      throw new Error("Insufficient credits. Please top up.");
    }
    return true;
  }

  static async deductCredits(userId: string, amount: number = 1) {
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('credits, email')
      .eq('id', userId)
      .single();

    if (user?.email === 'felixahuruonye@gmail.com') return;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ credits: (user?.credits || 0) - amount })
      .eq('id', userId);

    if (error) throw error;
  }

  static async addCredits(userId: string, amount: number) {
    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ credits: (user?.credits || 0) + amount })
      .eq('id', userId);

    if (error) throw error;
  }

  static async handleDailyReset() {
    // This would normally run as a cron job
    // Reset free users to 10 per day, up to 50/month logic
    // Implementation depends on tracking daily usage
  }
}
