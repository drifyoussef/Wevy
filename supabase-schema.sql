-- Users table is managed by Supabase Auth
-- We'll use auth.users() for user data

-- Households table
CREATE TABLE households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  source_url TEXT,
  source_platform TEXT CHECK (source_platform IN ('tiktok', 'instagram', 'url', 'manual')),
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions TEXT[],
  prep_time INTEGER,
  cook_time INTEGER,
  total_time INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  servings INTEGER,
  tools_needed TEXT[],
  tags TEXT[],
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'dessert')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT false,
  times_cooked INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swipe sessions table
CREATE TABLE swipe_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('active', 'matched', 'expired')) DEFAULT 'active',
  recipes TEXT[] NOT NULL,
  swipes JSONB DEFAULT '[]'::jsonb,
  matched_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Shopping lists table
CREATE TABLE shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  recipe_ids TEXT[],
  status TEXT CHECK (status IN ('active', 'completed')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better query performance
CREATE INDEX idx_recipes_household ON recipes(household_id);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_swipe_sessions_household ON swipe_sessions(household_id);
CREATE INDEX idx_swipe_sessions_date ON swipe_sessions(date);
CREATE INDEX idx_shopping_lists_household ON shopping_lists(household_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Households policies
CREATE POLICY "Users can view households they are members of"
  ON households FOR SELECT
  USING (
    auth.uid() IN (
      SELECT (jsonb_array_elements(members)->>'userId')::uuid
    )
  );

CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update households"
  ON households FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT (jsonb_array_elements(members)->>'userId')::uuid
      FROM households
      WHERE members @> jsonb_build_array(
        jsonb_build_object('userId', auth.uid(), 'role', 'admin')
      )
    )
  );

-- Recipes policies
CREATE POLICY "Users can view recipes in their household"
  ON recipes FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can create recipes in their household"
  ON recipes FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can update recipes in their household"
  ON recipes FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  USING (created_by = auth.uid());

-- Swipe sessions policies
CREATE POLICY "Users can view swipe sessions in their household"
  ON swipe_sessions FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can create swipe sessions in their household"
  ON swipe_sessions FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can update swipe sessions in their household"
  ON swipe_sessions FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

-- Shopping lists policies
CREATE POLICY "Users can view shopping lists in their household"
  ON shopping_lists FOR SELECT
  USING (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can create shopping lists in their household"
  ON shopping_lists FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

CREATE POLICY "Users can update shopping lists in their household"
  ON shopping_lists FOR UPDATE
  USING (
    household_id IN (
      SELECT id FROM households
      WHERE auth.uid() IN (
        SELECT (jsonb_array_elements(members)->>'userId')::uuid
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
