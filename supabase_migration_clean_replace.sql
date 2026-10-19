-- =========================================================================
-- ClimbUP Courses & AI RAG Platform - Complete Clean Database Replacement
-- =========================================================================
-- PURPOSES & SAFETY GUARANTEES:
-- 1. Drops ALL legacy tables: universities, branches, subjects, question_papers,
--    questions, ai_answers, student_answers, likes, insights, topics,
--    question_topics, topic_aliases, student_resources, mdm_subjects,
--    mdm_branch_subject_mapping, open_elective_baskets, student_open_electives,
--    pinned_classmates, whatsapp_links, notes_embeddings.
-- 2. Removes obsolete foreign keys from `public.users` (university/branch/mdm/oe).
-- 3. DOES NOT touch `auth.users` — all user accounts, passwords, sessions, 
--    and Google logins remain 100% active and unharmed.
-- 4. Cleans `public.users` so it only contains user profile fields.
-- 5. Builds the complete course platform: Courses, Modules, Lessons,
--    Assignments, Student Answers (Submissions), Quizzes, Quiz Attempts,
--    pgvector 768 RAG Embeddings, Multi-Student Parallel AI Tutor Chats,
--    Resources, Enrollments, Completions, and Discussions.
-- 6. Sets up automatic auth sync trigger and seeds starter data.
-- =========================================================================

-- STEP 1: Enable PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================================
-- STEP 2: REMOVE OBSOLETE CONSTRAINTS FROM public.users
-- (Allows dropping branch/university/mdm tables without FK errors)
-- =========================================================================
DO $$
BEGIN
    ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_university_id_fkey CASCADE;
    ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_branch_id_fkey CASCADE;
    ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_mdm_branch_id_fkey CASCADE;
    ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_oe_id_fkey CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- =========================================================================
-- STEP 3: DROP ALL OBSOLETE TABLES (Branch, MDM, Exams, Electives)
-- =========================================================================
DROP TABLE IF EXISTS public.notes_embeddings CASCADE;
DROP TABLE IF EXISTS public.whatsapp_links CASCADE;
DROP TABLE IF EXISTS public.pinned_classmates CASCADE;
DROP TABLE IF EXISTS public.student_open_electives CASCADE;
DROP TABLE IF EXISTS public.open_elective_baskets CASCADE;
DROP TABLE IF EXISTS public.mdm_branch_subject_mapping CASCADE;
DROP TABLE IF EXISTS public.mdm_subjects CASCADE;
DROP TABLE IF EXISTS public.student_resources CASCADE;
DROP TABLE IF EXISTS public.topic_aliases CASCADE;
DROP TABLE IF EXISTS public.question_topics CASCADE;
DROP TABLE IF EXISTS public.topics CASCADE;
DROP TABLE IF EXISTS public.insights CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.student_answers CASCADE;
DROP TABLE IF EXISTS public.ai_answers CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.question_papers CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.universities CASCADE;

-- =========================================================================
-- STEP 4: DROP PREVIOUS COURSE TABLES (To Recreate Cleanly)
-- =========================================================================
DROP TABLE IF EXISTS public.ai_chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS public.transcript_chunks_vector CASCADE;
DROP TABLE IF EXISTS public.transcript_segments CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.course_quizzes CASCADE;
DROP TABLE IF EXISTS public.lecture_mcqs CASCADE;
DROP TABLE IF EXISTS public.assignment_submissions CASCADE;
DROP TABLE IF EXISTS public.course_assignments CASCADE;
DROP TABLE IF EXISTS public.course_resources CASCADE;
DROP TABLE IF EXISTS public.lesson_completions CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP TABLE IF EXISTS public.course_discussions CASCADE;
DROP TABLE IF EXISTS public.student_progress CASCADE;
DROP TABLE IF EXISTS public.course_lessons CASCADE;
DROP TABLE IF EXISTS public.course_modules CASCADE;
DROP TABLE IF EXISTS public.lectures CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;

-- Drop obsolete search functions if any
DROP FUNCTION IF EXISTS public.match_transcript_chunks(vector, double precision, integer, text);
DROP FUNCTION IF EXISTS public.match_transcript_chunks(vector, double precision, integer, uuid);

-- =========================================================================
-- STEP 5: CLEAN & STRUCTURE `public.users`
-- (Never dropped! Preserves existing users and matches useAuth.tsx)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    profile_image TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Drop obsolete legacy columns from public.users
ALTER TABLE public.users DROP COLUMN IF EXISTS university_id CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS branch_id CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS semester CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS mdm_branch_id CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS oe_id CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS whatsapp_number CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS google_refresh_token CASCADE;

-- Ensure essential profile columns exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Ensure user_id references auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_user_id_fkey' AND table_name = 'users'
    ) THEN
        BEGIN
            ALTER TABLE public.users 
            ADD CONSTRAINT users_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- Auto-sync trigger from auth.users into public.users on signup/login
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, email, full_name, profile_image, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        profile_image = COALESCE(NULLIF(EXCLUDED.profile_image, ''), public.users.profile_image);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill any existing auth.users into public.users if not already present
INSERT INTO public.users (user_id, email, full_name, profile_image)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- STEP 6: CREATE COURSES & MODULES HIERARCHY
-- =========================================================================

-- 1. Courses Table
CREATE TABLE public.courses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    category TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'All Levels',
    thumbnail TEXT NOT NULL,
    instructor_name TEXT NOT NULL,
    instructor_title TEXT,
    instructor_avatar TEXT,
    instructor_bio TEXT,
    duration TEXT NOT NULL,
    total_lessons INTEGER DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    students_enrolled INTEGER DEFAULT 0,
    price NUMERIC(10, 2) DEFAULT 0.00,
    is_featured BOOLEAN DEFAULT false,
    skills_gained TEXT[] DEFAULT '{}',
    prerequisites TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Course Modules Table
CREATE TABLE public.course_modules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Course Lessons / Lectures Table (Deepgram + Gemini Audio/Notes)
CREATE TABLE public.course_lessons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    video_url TEXT NOT NULL,
    audio_url TEXT,                               -- Extracted clean audio
    raw_transcript TEXT,                          -- Full Deepgram transcript
    structured_notes JSONB DEFAULT '{}'::jsonb,   -- Gemini university notes (definitions, formulas, etc.)
    chapters JSONB DEFAULT '[]'::jsonb,           -- Chapter breakdown with timestamps
    transcript_snippets JSONB DEFAULT '[]'::jsonb,-- Snippet compatibility
    processing_status TEXT DEFAULT 'ready' 
        CHECK (processing_status IN ('uploaded', 'transcribing', 'generating_notes', 'ready', 'failed')),
    is_free_preview BOOLEAN DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- STEP 7: CREATE ASSIGNMENTS & STUDENT ANSWERS (SUBMISSIONS)
-- =========================================================================

-- 4. Course Assignments Table (Brief, instructions, starter code)
CREATE TABLE public.course_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id TEXT REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT[] DEFAULT '{}',
    starter_code TEXT,
    starter_file_url TEXT,
    max_score INTEGER DEFAULT 100,
    due_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Student Assignment Answers & Submissions (Grading & AI Feedback)
CREATE TABLE public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id TEXT NOT NULL REFERENCES public.course_assignments(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_text TEXT,
    submission_code TEXT,
    github_url TEXT,
    live_url TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'resubmission_required')),
    score INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, assignment_id)
);

-- =========================================================================
-- STEP 8: CREATE QUIZZES & STUDENT ATTEMPTS (MCQS)
-- =========================================================================

-- 6. Course Quizzes Table
CREATE TABLE public.course_quizzes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id TEXT REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER DEFAULT 15,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Student Quiz Attempts
CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id TEXT NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_answers JSONB DEFAULT '[]'::jsonb,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- STEP 9: CREATE RAG VECTOR EMBEDDINGS & MULTI-STUDENT AI CHAT
-- =========================================================================

-- 8. Vector Embeddings Table for RAG (768 dimensions for Gemini text-embedding-004)
CREATE TABLE public.transcript_chunks_vector (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id TEXT NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(768),
    start_seconds NUMERIC(8, 2) NOT NULL,
    end_seconds NUMERIC(8, 2) NOT NULL,
    timestamp_label TEXT NOT NULL,                -- e.g. "04:12"
    speaker_label TEXT DEFAULT 'teacher',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. AI Chat Sessions (Parallel for 1,000+ students)
CREATE TABLE public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id TEXT NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Lecture Q&A',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. AI Chat Messages (Stores Student Prompts & AI Responses with video citations)
CREATE TABLE public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('student', 'ai', 'user')),
    message TEXT NOT NULL,
    timestamp_ref JSONB,                         -- e.g. {"time": "04:12", "seconds": 252}
    retrieved_chunk_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- STEP 10: COURSE RESOURCES & PROGRESS TRACKING
-- =========================================================================

-- 11. Course Resources Table (PDFs, GitHub Starter, CheatSheets)
CREATE TABLE public.course_resources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'zip', 'github', 'link')),
    file_size TEXT,
    download_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Student Course Enrollments Table
CREATE TABLE public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, course_id)
);

-- 13. Student Lesson Completions Table
CREATE TABLE public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id TEXT NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

-- 14. Course Discussions Table
CREATE TABLE public.course_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- STEP 11: FAST VECTOR SIMILARITY SEARCH FUNCTION (RAG MATCH)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.match_transcript_chunks(
    query_embedding vector(768),
    match_threshold double precision DEFAULT 0.65,
    match_count integer DEFAULT 5,
    filter_lesson_id text DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    lesson_id TEXT,
    chunk_index INTEGER,
    chunk_text TEXT,
    start_seconds NUMERIC(8,2),
    end_seconds NUMERIC(8,2),
    timestamp_label TEXT,
    similarity double precision
)
LANGUAGE sql STABLE
AS $$
    SELECT
        tc.id,
        tc.lesson_id,
        tc.chunk_index,
        tc.chunk_text,
        tc.start_seconds,
        tc.end_seconds,
        tc.timestamp_label,
        1 - (tc.embedding <=> query_embedding) AS similarity
    FROM public.transcript_chunks_vector tc
    WHERE 
        (filter_lesson_id IS NULL OR tc.lesson_id = filter_lesson_id)
        AND 1 - (tc.embedding <=> query_embedding) > match_threshold
    ORDER BY tc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- =========================================================================
-- STEP 12: HIGH-PERFORMANCE INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON public.course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_assignment ON public.assignment_submissions(user_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_lesson_student ON public.ai_chat_sessions(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON public.ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON public.lesson_completions(user_id);

-- HNSW Vector Index for Instant RAG Search
CREATE INDEX IF NOT EXISTS idx_transcript_vector_embedding 
    ON public.transcript_chunks_vector 
    USING hnsw (embedding vector_cosine_ops);

-- =========================================================================
-- STEP 13: ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_chunks_vector ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

-- Public Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Public Read for Catalog & Lessons
DROP POLICY IF EXISTS "Public Read Courses" ON public.courses;
CREATE POLICY "Public Read Courses" ON public.courses FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Modules" ON public.course_modules;
CREATE POLICY "Public Read Modules" ON public.course_modules FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Lessons" ON public.course_lessons;
CREATE POLICY "Public Read Lessons" ON public.course_lessons FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Assignments" ON public.course_assignments;
CREATE POLICY "Public Read Assignments" ON public.course_assignments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Quizzes" ON public.course_quizzes;
CREATE POLICY "Public Read Quizzes" ON public.course_quizzes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Resources" ON public.course_resources;
CREATE POLICY "Public Read Resources" ON public.course_resources FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Transcripts" ON public.transcript_chunks_vector;
CREATE POLICY "Public Read Transcripts" ON public.transcript_chunks_vector FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Discussions" ON public.course_discussions;
CREATE POLICY "Public Read Discussions" ON public.course_discussions FOR SELECT TO public USING (true);

-- Student Private Data Policies
DROP POLICY IF EXISTS "Users read own submissions" ON public.assignment_submissions;
CREATE POLICY "Users read own submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users submit own assignments" ON public.assignment_submissions;
CREATE POLICY "Users submit own assignments" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own submissions" ON public.assignment_submissions;
CREATE POLICY "Users update own submissions" ON public.assignment_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users read own quiz attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users insert own quiz attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own chat sessions" ON public.ai_chat_sessions;
CREATE POLICY "Users read own chat sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users insert own chat sessions" ON public.ai_chat_sessions;
CREATE POLICY "Users insert own chat sessions" ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users read messages from own sessions" ON public.ai_chat_messages;
CREATE POLICY "Users read messages from own sessions" ON public.ai_chat_messages FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.ai_chat_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert messages to own sessions" ON public.ai_chat_messages;
CREATE POLICY "Users insert messages to own sessions" ON public.ai_chat_messages FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public.ai_chat_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own enrollments" ON public.course_enrollments;
CREATE POLICY "Users read own enrollments" ON public.course_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own enrollments" ON public.course_enrollments;
CREATE POLICY "Users insert own enrollments" ON public.course_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own enrollments" ON public.course_enrollments;
CREATE POLICY "Users update own enrollments" ON public.course_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own completions" ON public.lesson_completions;
CREATE POLICY "Users read own completions" ON public.lesson_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own completions" ON public.lesson_completions;
CREATE POLICY "Users insert own completions" ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own completions" ON public.lesson_completions;
CREATE POLICY "Users delete own completions" ON public.lesson_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users post discussions" ON public.course_discussions;
CREATE POLICY "Authenticated users post discussions" ON public.course_discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- STEP 14: SEED STARTER COURSES DATA
-- =========================================================================
INSERT INTO public.courses (
    id, slug, title, tagline, description, category, level, thumbnail,
    instructor_name, instructor_title, instructor_avatar, instructor_bio,
    duration, total_lessons, rating, reviews_count, students_enrolled, price, is_featured,
    skills_gained, prerequisites
) VALUES
(
    'course-nextjs-fullstack',
    'fullstack-nextjs-mastery',
    'Full-Stack Next.js 16 & Modern Web Mastery',
    'Build production-scale applications with Server Components, Turbopack, Supabase, and Tailwind CSS.',
    'Learn to build high-performance full-stack web applications from scratch using Next.js 16 (App Router), React 19, Supabase for authentication and PostgreSQL database, TypeScript, and modern state management. Includes real-world hands-on project assignments and interactive quizzes.',
    'Full-Stack Web Dev',
    'Intermediate',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
    'Alex Rivers',
    'Staff Engineer & Tech Lead',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    '12+ years building enterprise web apps and open-source Next.js frameworks. Ex-Vercel community champion.',
    '18.5 hours',
    24,
    4.90,
    1420,
    8430,
    0.00,
    true,
    ARRAY['Next.js App Router Architecture', 'React 19 Server Components', 'Supabase Auth & PostgreSQL', 'Full-Stack API Route Handlers', 'Turbopack & Edge Middleware', 'Production Deployment & CI/CD'],
    ARRAY['Basic understanding of JavaScript / ES6 syntax', 'Familiarity with HTML, CSS, and fundamental React concepts']
),
(
    'course-applied-ai-rag',
    'applied-ai-rag-architectures',
    'Applied AI & GenAI with RAG Architectures',
    'Build production Retrieval-Augmented Generation systems, vector embeddings, and autonomous agent workflows.',
    'Master modern Generative AI engineering. Learn to build context-aware chatbots, semantic document search, video transcript query engines using Vector Databases (pgvector, Pinecone), LangChain/LlamaIndex, and Gemini / OpenAI models.',
    'AI & Machine Learning',
    'Advanced',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=900&auto=format&fit=crop&q=80',
    'Dr. Maya Chen',
    'AI Research Scientist & LLM Architect',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    'Ph.D. in Computer Science with 8+ years leading Natural Language Processing and multi-modal AI systems.',
    '22 hours',
    28,
    4.95,
    980,
    6150,
    0.00,
    true,
    ARRAY['Vector Embeddings & Cosine Similarity', 'Chunking Strategies for Video & Documents', 'Hybrid Semantic & Keyword Search', 'pgvector & Supabase Vector Store', 'Prompt Engineering & Hallucination Mitigation', 'Real-time Streaming Responses'],
    ARRAY['Proficiency in Python or TypeScript', 'Basic understanding of REST APIs and prompt structure']
),
(
    'course-dsa-system-design',
    'dsa-system-design-bootcamp',
    'Data Structures, Algorithms & System Design Bootcamp',
    'Ace technical interviews with visual DSA problem breakdowns, big-O optimization, and scalable architectures.',
    'A comprehensive course designed to take you from foundational arrays and trees to distributed system architectures, caching, load balancers, and concurrency patterns.',
    'System Design & DSA',
    'All Levels',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&auto=format&fit=crop&q=80',
    'Marcus Vance',
    'Principal Architect',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'Ex-FAANG Senior Staff Engineer who has conducted 400+ technical rounds and designed systems handling 100M+ DAU.',
    '26 hours',
    34,
    4.88,
    2100,
    11200,
    0.00,
    true,
    ARRAY['Two Pointers & Sliding Window Patterns', 'Trees, Graphs & BFS/DFS Visualizations', 'Dynamic Programming Memoization', 'Distributed Caching (Redis) & CDNs', 'Database Sharding & Replication', 'Event-Driven Architectures & Message Queues'],
    ARRAY['Basic coding knowledge in JavaScript, Python, C++, or Java']
)
ON CONFLICT (slug) DO NOTHING;

-- Seed default modules and assignment for Next.js flagship course
INSERT INTO public.course_modules (id, course_id, title, display_order)
VALUES 
('mod-nextjs-1', 'course-nextjs-fullstack', 'Module 1: Next.js Fundamentals & App Router', 1),
('mod-nextjs-2', 'course-nextjs-fullstack', 'Module 2: Server Actions & Supabase Integration', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_assignments (
    id, course_id, module_id, title, description, instructions, starter_code, max_score, due_date
) VALUES (
    'assign-nextjs-1',
    'course-nextjs-fullstack',
    'mod-nextjs-1',
    'Assignment 1: Build a Multi-Page Dashboard with Nested Layouts',
    'Create a functional, responsive Next.js application with nested layouts, loading states, error boundaries, and dynamic route parameters.',
    ARRAY[
        'Set up an App Router project with a top navigation bar and dynamic sidebar layout.',
        'Implement at least two nested routes (e.g., /dashboard/analytics and /dashboard/settings).',
        'Use loading.tsx and error.tsx files for graceful UI states.'
    ],
    '// app/dashboard/layout.tsx\nexport default function DashboardLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <div className="flex min-h-screen">\n      <aside className="w-64 border-r p-4">Navigation</aside>\n      <main className="flex-1 p-6">{children}</main>\n    </div>\n  );\n}',
    100,
    'October 28, 2026'
) ON CONFLICT (id) DO NOTHING;
