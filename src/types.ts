export interface User {
  id: string;
  email: string;
  name: string;
  lenory_id: string;
  avatar_url?: string;
  credits: number;
  xp: number;
  level: number;
  badges: string[];
  preferences: UserPreferences;
  custom_instructions?: string;
  onboarding_completed?: boolean;
  onboarding_data?: any;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  importance: number;
  created_at: string;
}

export interface UserPreferences {
  communication_style: 'simple' | 'professional' | 'technical';
  theme: 'futuristic' | 'minimal' | 'dark' | 'light';
  language: 'English' | 'Pidgin' | 'Hausa' | 'Igbo' | 'Yoruba';
  auto_learn: boolean;
  voice_assistant: {
    enabled: boolean;
    gender: 'male' | 'female';
    voice_id: string;
  };
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  type?: 'text' | 'image' | 'video' | 'graph' | 'exam_question';
  imageUrl?: string;
  videoUrl?: string;
  pendingAsset?: boolean;
}

export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  type: 'JAMB' | 'WAEC' | 'NECO' | 'UNIVERSITY';
  duration: number; // minutes
  score: number;
  questions: any[];
  results: any;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  target_date: string;
  subjects: string[];
  tasks: StudyTask[];
  progress: number;
  created_at: string;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  completed: boolean;
  due_date: string;
}

export interface GeneratedWebsite {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  code: string;
  framework: string;
  model: string;
  is_favorite: boolean;
  explanation?: string;
  created_at: string;
}

export enum CreditPacks {
  FREE_DAILY = 10,
  FREE_MONTHLY_LIMIT = 50,
  TOP_UP_MIN = 10,
  PRO_PLAN = 50,
  PREMIUM_PLAN = 250,
}
