-- =========================================================================
-- ClimbUP Courses Platform - Turnkey Database Migration & Setup
-- Execute this script in your Supabase SQL Editor with 1-click.
-- =========================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
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

-- 3. Course Modules Table
CREATE TABLE IF NOT EXISTS public.course_modules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Course Lessons Table (with transcript timestamps for RAG Video AI)
CREATE TABLE IF NOT EXISTS public.course_lessons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    module_id TEXT REFERENCES public.course_modules(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    video_url TEXT NOT NULL,
    is_free_preview BOOLEAN DEFAULT false,
    notes TEXT,
    transcript_snippets JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Course Assignments Table
CREATE TABLE IF NOT EXISTS public.course_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id TEXT REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT[] DEFAULT '{}',
    starter_code TEXT,
    max_score INTEGER DEFAULT 100,
    due_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Course Quizzes & MCQs Table
CREATE TABLE IF NOT EXISTS public.course_quizzes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    module_id TEXT REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER DEFAULT 15,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Course Resources Table
CREATE TABLE IF NOT EXISTS public.course_resources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'pdf',
    file_size TEXT,
    download_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Student Course Enrollments Table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, course_id)
);

-- 9. Student Assignment Submissions Table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id TEXT REFERENCES public.course_assignments(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_text TEXT,
    github_url TEXT,
    live_url TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'resubmission_required')),
    score INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, assignment_id)
);

-- 10. Student Lesson Completions Table
CREATE TABLE IF NOT EXISTS public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id TEXT REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, lesson_id)
);

-- 11. Course Discussions Table
CREATE TABLE IF NOT EXISTS public.course_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

-- Public Read Policies for Curriculum
CREATE POLICY "Public Read Courses" ON public.courses FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Modules" ON public.course_modules FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Lessons" ON public.course_lessons FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Assignments" ON public.course_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Quizzes" ON public.course_quizzes FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Resources" ON public.course_resources FOR SELECT TO public USING (true);
CREATE POLICY "Public Read Discussions" ON public.course_discussions FOR SELECT TO public USING (true);

-- Student Enrollments Policies
CREATE POLICY "Users read own enrollments" ON public.course_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own enrollments" ON public.course_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own enrollments" ON public.course_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Assignment Submissions Policies
CREATE POLICY "Users read own submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own submissions" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own submissions" ON public.assignment_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Lesson Completions Policies
CREATE POLICY "Users read own completions" ON public.lesson_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own completions" ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own completions" ON public.lesson_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Discussions Policies
CREATE POLICY "Authenticated users insert discussions" ON public.course_discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- SEED DATA (Flagship Courses)
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

-- Done!
