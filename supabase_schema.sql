-- Profiles Table Optimization
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 10,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges TEXT[] DEFAULT '{}',
    lenory_id TEXT UNIQUE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_data JSONB DEFAULT '{}',
    custom_instructions TEXT DEFAULT '',
    preferences JSONB DEFAULT '{
      "communication_style": "simple",
      "theme": "dark",
      "language": "English",
      "auto_learn": true,
      "voice_assistant": {"enabled": false, "gender": "female", "voice_id": ""}
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Usage tracking for Admin
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    tokens_estimate INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all usage" ON api_usage FOR SELECT USING (auth.jwt() ->> 'email' = 'felixahuruonye@gmail.com');

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Unified Profile Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can manage their own profile" 
ON profiles FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (auth.jwt() ->> 'email' = 'felixahuruonye@gmail.com');

-- Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    type TEXT NOT NULL,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own exams" ON exams;
CREATE POLICY "Users can manage their own exams" 
ON exams FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Memories Table
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    importance INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own memories" ON memories;
CREATE POLICY "Users can manage their own memories" 
ON memories FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, lenory_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'LEN-' || UPPER(SUBSTRING(NEW.id::text, 1, 6))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
