-- 1. Create open_elective_baskets table
CREATE TABLE IF NOT EXISTS public.open_elective_baskets (
    oe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(subject_id) ON DELETE CASCADE,
    board_code TEXT NOT NULL,
    course_code TEXT NOT NULL,
    semester INTEGER NOT NULL,
    academic_year TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by semester
CREATE INDEX IF NOT EXISTS idx_oe_baskets_semester ON public.open_elective_baskets(semester) WHERE is_active = true;

-- 2. Create student_open_electives table
CREATE TABLE IF NOT EXISTS public.student_open_electives (
    selection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    oe_id UUID REFERENCES public.open_elective_baskets(oe_id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Constraint: 1 student can only select 1 open elective per semester
    UNIQUE(user_id, semester)
);

-- Index for fetching student's current selections fast
CREATE INDEX IF NOT EXISTS idx_student_oe_lookup ON public.student_open_electives(user_id, semester);

-- Enable RLS
ALTER TABLE public.open_elective_baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_open_electives ENABLE ROW LEVEL SECURITY;

-- Policies for open_elective_baskets
CREATE POLICY "Allow authenticated read access on open_elective_baskets" 
ON public.open_elective_baskets
FOR SELECT TO authenticated USING (is_active = true);

-- Policies for student_open_electives
-- Allow users to read their own selections
CREATE POLICY "Users can read own OE" 
ON public.student_open_electives
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow users to insert their own selections
CREATE POLICY "Users can insert own OE" 
ON public.student_open_electives
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
