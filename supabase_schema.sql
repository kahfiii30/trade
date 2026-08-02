-- Execute this script in the Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  initial_capital numeric DEFAULT 10000,
  default_risk numeric DEFAULT 1,
  default_rr numeric DEFAULT 2,
  daily_max_trades integer DEFAULT 2,
  currency text DEFAULT 'USD',
  UNIQUE(user_id)
);

-- 3. Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date timestamp with time zone NOT NULL,
  pair text NOT NULL,
  market text NOT NULL,
  direction text NOT NULL,
  timeframe text NOT NULL,
  setup_tags text[],
  entry_price numeric NOT NULL,
  stop_loss numeric NOT NULL,
  take_profit numeric NOT NULL,
  exit_price numeric,
  position_size numeric NOT NULL,
  risk_percent numeric,
  fee numeric DEFAULT 0,
  result text DEFAULT 'Pending',
  rr_planned numeric,
  rr_realized numeric,
  pnl_nominal numeric,
  emotion text,
  mistakes text[],
  screenshot_before text,
  screenshot_after text,
  notes text,
  ai_analysis text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Playbooks Table
CREATE TABLE IF NOT EXISTS public.playbooks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  setup_name text NOT NULL,
  rule_entry text,
  rule_invalidation text,
  main_timeframe text,
  checklist text[],
  screenshot_url text,
  evaluation_notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON public.trades FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own playbooks" ON public.playbooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playbooks" ON public.playbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playbooks" ON public.playbooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playbooks" ON public.playbooks FOR DELETE USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
