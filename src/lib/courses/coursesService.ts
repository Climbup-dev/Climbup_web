import { createClient } from "@/lib/supabase/client";
import { Course, CourseAssignment, AssignmentStatus, RAGChatMessage, CourseLesson } from "@/types/courses";

/**
 * Maps raw Supabase relational records into typed Course objects.
 */
function mapDBCourseToCourse(
  row: any,
  modules: any[] = [],
  assignments: any[] = [],
  quizzes: any[] = [],
  resources: any[] = []
): Course {
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    tagline: row.tagline || "",
    description: row.description || "",
    category: row.category || "Full-Stack Web Dev",
    level: row.level || "All Levels",
    thumbnail: row.thumbnail || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80",
    instructor: {
      name: row.instructor_name || "Campus Peer Mentor",
      title: row.instructor_title || "Lead Peer Mentor & Contributor",
      avatar: row.instructor_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      bio: row.instructor_bio || "Engineering student contributor.",
    },
    duration: row.duration || "10 hours",
    totalLessons: row.total_lessons || 0,
    rating: Number(row.rating) || 5.0,
    reviewsCount: row.reviews_count || 0,
    studentsEnrolled: row.students_enrolled || 0,
    price: Number(row.price) || 0,
    isFeatured: !!row.is_featured,
    skillsGained: row.skills_gained || [],
    prerequisites: row.prerequisites || [],
    modules: modules.map((m: any, mIdx: number) => ({
      id: m.id,
      courseId: m.course_id || row.id,
      title: m.title,
      order: m.display_order ?? mIdx + 1,
      lessons: (m.course_lessons || m.lessons || []).map((l: any, lIdx: number): CourseLesson => ({
        id: l.id,
        moduleId: l.module_id || m.id,
        title: l.title,
        duration: l.duration || "15:00",
        durationSeconds: l.duration_seconds || 900,
        videoUrl: l.video_url || "",
        audioUrl: l.audio_url || undefined,
        rawTranscript: l.raw_transcript || undefined,
        structuredNotes: l.structured_notes || undefined,
        chapters: l.chapters || undefined,
        isFreePreview: !!l.is_free_preview,
        is_free_preview: !!l.is_free_preview,
        notes: l.raw_transcript || undefined,
        transcriptSnippets: l.transcript_snippets || [],
      })),
    })),
    assignments: assignments.map((a: any) => {
      let extra: any = {};
      let cleanDesc = a.description || "";
      if (typeof cleanDesc === "string" && cleanDesc.trim().startsWith("{") && cleanDesc.trim().endsWith("}")) {
        try {
          extra = JSON.parse(cleanDesc);
          cleanDesc = extra.summary || cleanDesc;
        } catch (_) {}
      }
      return {
        id: a.id,
        courseId: a.course_id || row.id,
        moduleId: a.module_id,
        lessonId: extra.lesson_id,
        title: a.title,
        description: cleanDesc,
        scenarioContext: extra.scenario_context || extra.scenarioContext || cleanDesc,
        scenario_context: extra.scenario_context || extra.scenarioContext || cleanDesc,
        problems: extra.problems || [],
        rubric: extra.rubric || null,
        instructions: a.instructions || [],
        starterCode: a.starter_code,
        starter_code: a.starter_code,
        starterFileUrl: a.starter_file_url,
        maxScore: a.max_score || 100,
        max_score: a.max_score || 100,
        dueDate: a.due_date || "Open",
        due_date: a.due_date || "Open",
        status: extra.status || "published",
      };
    }),
    quizzes: quizzes.map((q: any) => ({
      id: q.id,
      courseId: q.course_id || row.id,
      moduleId: q.module_id,
      title: q.title,
      description: q.description || "",
      timeLimitMinutes: q.time_limit_minutes || 15,
      questions: q.questions || [],
    })),
    resources: resources.map((r: any) => ({
      id: r.id,
      title: r.title,
      fileType: r.file_type || "link",
      fileSize: r.file_size,
      downloadUrl: r.download_url || "#",
      description: r.description || "",
    })),
  };
}

/**
 * Fetch all courses live from Supabase.
 */
export async function fetchAllCourses(): Promise<Course[]> {
  try {
    const supabase = createClient();
    const { data: dbCourses, error } = await supabase
      .from("courses")
      .select("*, course_modules(*, course_lessons(*)), course_assignments(*), course_quizzes(*), course_resources(*)")
      .order("created_at", { ascending: false });

    if (!error && dbCourses && dbCourses.length > 0) {
      const validDbCourses = dbCourses.filter((row: any) => {
        if (!row.id || !row.title) return false;
        return true;
      });

      return validDbCourses.map((row: any) =>
        mapDBCourseToCourse(
          row,
          row.course_modules || [],
          row.course_assignments || [],
          row.course_quizzes || [],
          row.course_resources || []
        )
      );
    }
  } catch (err) {
    console.warn("[fetchAllCourses] Supabase query error:", err);
  }
  return [];
}

/**
 * Fetch a single course with full modules, lessons, and video URLs from Supabase.
 */
export async function fetchCourseById(idOrSlug: string): Promise<Course | null> {
  try {
    const supabase = createClient();
    const { data: dbCourse, error } = await supabase
      .from("courses")
      .select("*, course_modules(*, course_lessons(*)), course_assignments(*), course_quizzes(*), course_resources(*)")
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();

    if (!error && dbCourse) {
      return mapDBCourseToCourse(
        dbCourse,
        dbCourse.course_modules || [],
        dbCourse.course_assignments || [],
        dbCourse.course_quizzes || [],
        dbCourse.course_resources || []
      );
    }
  } catch (err) {
    console.warn("[fetchCourseById] Supabase query error:", err);
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// User Enrollment & Progress (localStorage + Supabase DB)
// ─────────────────────────────────────────────────────────

export function getUserEnrolledCourseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("climbup_enrolled_courses");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function getUserEnrolledCourseIdsAsync(userId?: string): Promise<string[]> {
  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("user_id", userId);

      if (!error && data) {
        const ids = data.map((d: any) => d.course_id);
        if (typeof window !== "undefined") {
          localStorage.setItem("climbup_enrolled_courses", JSON.stringify(ids));
        }
        return ids;
      }
    } catch (err) {
      console.warn("[getUserEnrolledCourseIdsAsync] Supabase query fallback:", err);
    }
  }
  return getUserEnrolledCourseIds();
}

export async function enrollInCourse(courseId: string, userId?: string): Promise<void> {
  // 1. Instant local cache update
  if (typeof window !== "undefined") {
    try {
      const current = getUserEnrolledCourseIds();
      if (!current.includes(courseId)) {
        current.push(courseId);
        localStorage.setItem("climbup_enrolled_courses", JSON.stringify(current));
      }
    } catch (err) {
      console.error("Local enrollment cache failed:", err);
    }
  }

  // 2. Real Supabase sync if user is logged in
  if (userId) {
    try {
      const supabase = createClient();
      await supabase
        .from("course_enrollments")
        .upsert(
          { user_id: userId, course_id: courseId, progress_percentage: 0 },
          { onConflict: "user_id,course_id" }
        );
    } catch (err) {
      console.warn("[enrollInCourse] Supabase enrollment sync error:", err);
    }
  }
}

export function getCompletedLessonIds(courseId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`climbup_completed_lessons_${courseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getCompletedLessonIdsAsync(courseId: string, userId?: string): Promise<string[]> {
  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", userId)
        .eq("course_id", courseId);

      if (!error && data) {
        const ids = data.map((d: any) => d.lesson_id);
        if (typeof window !== "undefined") {
          localStorage.setItem(`climbup_completed_lessons_${courseId}`, JSON.stringify(ids));
        }
        return ids;
      }
    } catch (err) {
      console.warn("[getCompletedLessonIdsAsync] Supabase sync error:", err);
    }
  }
  return getCompletedLessonIds(courseId);
}

export async function toggleLessonCompletion(
  courseId: string,
  lessonId: string,
  userId?: string
): Promise<string[]> {
  const completed = getCompletedLessonIds(courseId);
  const isDone = completed.includes(lessonId);
  const updated = isDone
    ? completed.filter((id) => id !== lessonId)
    : [...completed, lessonId];

  if (typeof window !== "undefined") {
    localStorage.setItem(`climbup_completed_lessons_${courseId}`, JSON.stringify(updated));
  }

  if (userId) {
    try {
      const supabase = createClient();
      if (isDone) {
        await supabase
          .from("lesson_completions")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", courseId)
          .eq("lesson_id", lessonId);
      } else {
        await supabase
          .from("lesson_completions")
          .upsert(
            { user_id: userId, course_id: courseId, lesson_id: lessonId },
            { onConflict: "user_id,course_id,lesson_id" }
          );
      }
    } catch (err) {
      console.warn("[toggleLessonCompletion] Supabase sync error:", err);
    }
  }

  return updated;
}

// ─────────────────────────────────────────────────────────
// Assignment Submissions (localStorage + Supabase DB)
// ─────────────────────────────────────────────────────────

export interface StoredSubmission {
  assignmentId: string;
  courseId: string;
  status: AssignmentStatus;
  submittedAt: string;
  submissionText?: string;
  approachNotes?: string;
  githubUrl?: string;
  liveUrl?: string;
  score?: number;
  feedback?: string;
}

export function getAssignmentSubmission(assignmentId: string): StoredSubmission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`climbup_assign_${assignmentId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getAssignmentSubmissionAsync(assignmentId: string, userId?: string): Promise<StoredSubmission | null> {
  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("user_id", userId)
        .eq("assignment_id", assignmentId)
        .maybeSingle();

      if (!error && data) {
        const submission: StoredSubmission = {
          assignmentId: data.assignment_id,
          courseId: data.course_id,
          status: data.status || "submitted",
          submittedAt: data.submitted_at ? new Date(data.submitted_at).toLocaleDateString() : "Submitted",
          submissionText: data.submission_text || "",
          githubUrl: data.github_url || "",
          liveUrl: data.live_url || "",
          score: data.score,
          feedback: data.feedback || "Your solution has been submitted! It is currently queued for evaluation.",
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(`climbup_assign_${assignmentId}`, JSON.stringify(submission));
        }
        return submission;
      }
    } catch (err) {
      console.warn("[getAssignmentSubmissionAsync] Supabase query fallback:", err);
    }
  }
  return getAssignmentSubmission(assignmentId);
}

export async function submitAssignment(
  assignmentId: string,
  courseId: string,
  payload: {
    submissionText?: string;
    githubUrl?: string;
    liveUrl?: string;
    approachNotes?: string;
    score?: number;
    feedback?: string;
    aiFeedback?: any;
  },
  userId?: string
): Promise<StoredSubmission> {
  const submission: StoredSubmission = {
    assignmentId,
    courseId,
    status: "submitted",
    submittedAt: "Just now",
    submissionText: payload.submissionText || "",
    githubUrl: payload.githubUrl || "",
    liveUrl: payload.liveUrl || "",
    score: undefined,
    feedback: "Your solution has been submitted! It is currently queued for automated test evaluation and peer grading.",
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(`climbup_assign_${assignmentId}`, JSON.stringify(submission));
  }

  if (userId) {
    try {
      const supabase = createClient();
      await supabase
        .from("assignment_submissions")
        .upsert(
          {
            user_id: userId,
            assignment_id: assignmentId,
            course_id: courseId,
            submission_text: payload.submissionText || "",
            submission_code: payload.submissionText || "",
            github_url: payload.githubUrl || "",
            live_url: payload.liveUrl || "",
            status: "submitted",
          },
          { onConflict: "user_id,assignment_id" }
        );
    } catch (err) {
      console.warn("[submitAssignment] Supabase sync error:", err);
    }
  }

  return submission;
}

// Fallback RAG Video AI Chatbot Engine
export function queryVideoRAGChatbot(
  course: Course,
  currentLessonId: string,
  userQuestion: string
): RAGChatMessage {
  const questionLower = userQuestion.toLowerCase();
  let activeLesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === currentLessonId);
  if (!activeLesson) {
    activeLesson = course.modules[0]?.lessons[0];
  }

  const snippets = activeLesson?.transcriptSnippets || [];
  let matchedSnippet = snippets.find((s) =>
    questionLower.split(" ").some((word) => word.length > 3 && s.text.toLowerCase().includes(word))
  );

  if (!matchedSnippet && snippets.length > 0) {
    matchedSnippet = snippets[0];
  }

  return {
    id: `ai-${Date.now()}`,
    sender: "ai",
    text: matchedSnippet
      ? `Regarding your doubt: "${matchedSnippet.text}". Demonstrated in detail at timestamp [${matchedSnippet.time}].`
      : `Based on the lecture transcripts for "${activeLesson?.title || course.title}", this concept is thoroughly explained with hands-on examples.`,
    timestampRef: matchedSnippet
      ? { time: matchedSnippet.time, seconds: matchedSnippet.seconds, context: matchedSnippet.text }
      : undefined,
    createdAt: "Just now",
  };
}
