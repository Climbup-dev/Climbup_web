import { createClient } from "@/lib/supabase/server";

type SubjectRecord = {
  subject_name?: string | null;
  subject_code?: string | null;
} | null;

type QuestionPaperRecord = {
  paper_title?: string | null;
  subjects?: SubjectRecord;
} | null;

type QuestionRecord = {
  question_id: string;
  paper_id?: string | null;
  question_number?: string | null;
  question_text: string;
  module?: string | null;
  marks?: number | null;
  difficulty?: string | null;
  image_urls?: string[] | null;
  question_papers?: QuestionPaperRecord;
};

type AiAnswerRecord = {
  ai_answer_id: string;
  answer: unknown;
  ai_model?: string | null;
  created_at?: string | null;
};

type StudentAnswerRecord = {
  answer_id: string;
  answer_content?: string | null;
  status?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  users?: {
    full_name?: string | null;
    profile_image?: string | null;
  } | null;
};

type AnswerSelection = {
  answerId?: string;
  answerSource?: "ai" | "student";
};

export type QuestionDetail = {
  id: string;
  paperId: string;
  title: string;
  subject: string;
  subjectCode: string;
  paperTitle: string;
  imageUrls: string[];
  meta: {
    questionNumber: string;
    module: string;
    marks: number | null;
    difficulty: string;
  };
  answerData: {
    answer: {
      question: string;
      answer: unknown[];
    };
  };
  answerMeta: {
    answerId: string;
    source: "student_draft" | "ai_answer";
    status: "draft" | "published" | "ai";
    aiModel: string;
    publishedAt: string;
    author?: {
      name: string;
      avatarUrl: string | null;
    };
  } | null;
};

export async function getQuestionDetail(
  questionId: string,
  selection: AnswerSelection = {}
): Promise<{ data: QuestionDetail | null; error: string | null }> {
  if (!questionId) {
    return { data: null, error: "Question id is required." };
  }

  try {
    const supabase = await createClient();

    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select(`
        question_id,
        paper_id,
        question_number,
        question_text,
        module,
        marks,
        difficulty,
        image_urls,
        question_papers:paper_id (
          paper_title,
          subjects:subject_id (
            subject_name,
            subject_code
          )
        )
      `)
      .eq("question_id", questionId)
      .maybeSingle();

    if (questionError) {
      return { data: null, error: questionError.message };
    }

    if (!question) {
      return { data: null, error: null };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let studentAnswer: StudentAnswerRecord | null = null;

    if (selection.answerId && selection.answerSource === "student") {
      // First try to fetch from public_answers view (has author names for all published answers)
      const { data: publicAnswer } = await supabase
        .from("public_answers")
        .select(`
          answer_id,
          answer_content,
          published_at,
          full_name,
          profile_image
        `)
        .eq("answer_id", selection.answerId)
        .eq("question_id", questionId)
        .maybeSingle();

      if (publicAnswer) {
        return {
          data: toQuestionDetail(
            question as QuestionRecord,
            null,
            {
              answer_id: publicAnswer.answer_id,
              answer_content: publicAnswer.answer_content,
              status: "published",
              updated_at: publicAnswer.published_at,
              published_at: publicAnswer.published_at,
              users: {
                full_name: publicAnswer.full_name,
                profile_image: publicAnswer.profile_image,
              },
            } as any
          ),
          error: null,
        };
      }

      // Fallback for private drafts belonging to the current user
      let selectedStudentAnswerQuery = supabase
        .from("student_answers")
        .select(`
          answer_id,
          answer_content,
          status,
          updated_at,
          published_at,
          users:user_id (
            full_name,
            profile_image
          )
        `)
        .eq("answer_id", selection.answerId)
        .eq("question_id", questionId);

      selectedStudentAnswerQuery = user
        ? selectedStudentAnswerQuery.or(`status.eq.published,user_id.eq.${user.id}`)
        : selectedStudentAnswerQuery.eq("status", "published");

      const { data: selectedStudentAnswer, error: selectedStudentError } =
        await selectedStudentAnswerQuery.maybeSingle();

      if (selectedStudentError) {
        return { data: null, error: selectedStudentError.message };
      }

      if (selectedStudentAnswer) {
        return {
          data: toQuestionDetail(
            question as QuestionRecord,
            null,
            selectedStudentAnswer as StudentAnswerRecord
          ),
          error: null,
        };
      }
    }

    if (selection.answerId && selection.answerSource === "ai") {
      const { data: selectedAiAnswer, error: selectedAiError } = await supabase
        .from("ai_answers")
        .select(`
          ai_answer_id,
          answer,
          ai_model,
          created_at
        `)
        .eq("ai_answer_id", selection.answerId)
        .eq("question_id", questionId)
        .maybeSingle();

      if (selectedAiError) {
        return { data: null, error: selectedAiError.message };
      }

      if (selectedAiAnswer) {
        return {
          data: toQuestionDetail(
            question as QuestionRecord,
            selectedAiAnswer as AiAnswerRecord,
            null
          ),
          error: null,
        };
      }
    }

    if (user) {
      const { data: ownAnswer, error: ownAnswerError } = await supabase
        .from("student_answers")
        .select(`
          answer_id,
          answer_content,
          status,
          updated_at,
          published_at,
          users:user_id (
            full_name,
            profile_image
          )
        `)
        .eq("user_id", user.id)
        .eq("question_id", questionId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ownAnswerError && ownAnswer) {
        studentAnswer = ownAnswer as StudentAnswerRecord;
      }
    }

    if (studentAnswer) {
      return {
        data: toQuestionDetail(
          question as QuestionRecord,
          null,
          studentAnswer
        ),
        error: null,
      };
    }

    // Fallback to top public answer (10+ likes)
    const { data: topPublicAnswer } = await supabase
      .from("public_answers")
      .select(`
        answer_id,
        answer_content,
        published_at,
        full_name,
        profile_image
      `)
      .eq("question_id", questionId)
      .gte("likes_count", 10)
      .order("likes_count", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (topPublicAnswer) {
      return {
        data: toQuestionDetail(
          question as QuestionRecord,
          null,
          {
            answer_id: topPublicAnswer.answer_id,
            answer_content: topPublicAnswer.answer_content,
            status: "published",
            updated_at: topPublicAnswer.published_at,
            published_at: topPublicAnswer.published_at,
            users: {
              full_name: topPublicAnswer.full_name,
              profile_image: topPublicAnswer.profile_image,
            },
          } as any
        ),
        error: null,
      };
    }

    const { data: answers, error: answerError } = await supabase
      .from("ai_answers")
      .select(`
        ai_answer_id,
        answer,
        ai_model,
        created_at
      `)
      .eq("question_id", questionId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (answerError) {
      return { data: null, error: answerError.message };
    }

    return {
      data: toQuestionDetail(
        question as QuestionRecord,
        ((answers || [])[0] || null) as AiAnswerRecord | null,
        null
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load the question right now.",
    };
  }
}

function toQuestionDetail(
  question: QuestionRecord,
  answer: AiAnswerRecord | null,
  studentAnswer: StudentAnswerRecord | null
): QuestionDetail {
  const subject = question.question_papers?.subjects;
  const answerContent =
    studentAnswer?.answer_content || answer?.answer;

  const answerBlocks = normalizeAnswerContent(
    answerContent,
    question.question_text
  );

  return {
    id: question.question_id,
    paperId: question.paper_id || "",
    title: question.question_text,
    subject: subject?.subject_name || "Subject",
    subjectCode: subject?.subject_code || "",
    paperTitle: question.question_papers?.paper_title || "Question paper",
    imageUrls: question.image_urls || [],
    meta: {
      questionNumber: question.question_number || "",
      module: question.module || "",
      marks: typeof question.marks === "number" ? question.marks : null,
      difficulty: question.difficulty || "",
    },
    answerData: {
      answer: {
        question: question.question_text,
        answer: answerBlocks,
      },
    },
    answerMeta: studentAnswer
      ? {
          answerId: studentAnswer.answer_id,
          source: "student_draft",
          status: studentAnswer.status === "published" ? "published" : "draft",
          aiModel: "Private draft",
          publishedAt: studentAnswer.updated_at || studentAnswer.published_at || "",
          author: studentAnswer.users ? {
            name: studentAnswer.users.full_name || "Anonymous Student",
            avatarUrl: studentAnswer.users.profile_image || null,
          } : undefined,
        }
      : answer
      ? {
          answerId: answer.ai_answer_id,
          source: "ai_answer",
          status: "ai",
          aiModel: answer.ai_model || "AI",
          publishedAt: answer.created_at || "",
          author: {
            name: "ClimbUP AI",
            avatarUrl: null,
          },
        }
      : null,
  };
}

function normalizeAnswerContent(content: unknown, question: string): unknown[] {
  if (!content) {
    return [];
  }

  // Direct array of blocks
  if (Array.isArray(content)) {
    return content;
  }

  if (typeof content === "object") {
    const record = content as Record<string, unknown>;

    // New backend format: { question: "...", blocks: [...] }
    if (Array.isArray(record.blocks)) {
      return record.blocks;
    }

    // Format: { answer: [...] }
    if (Array.isArray(record.answer)) {
      return record.answer;
    }

    // Snapshot format: { answer: { question: "...", blocks: [...] } }
    if (
      record.answer &&
      typeof record.answer === "object" &&
      Array.isArray((record.answer as Record<string, unknown>).blocks)
    ) {
      return (record.answer as Record<string, unknown>).blocks as unknown[];
    }

    // Format: { answer: { answer: [...] } }
    if (
      record.answer &&
      typeof record.answer === "object" &&
      Array.isArray((record.answer as Record<string, unknown>).answer)
    ) {
      return (record.answer as Record<string, unknown>).answer as unknown[];
    }
  }

  if (typeof content === "string") {
    const parsed = parseAnswerString(content);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;

      // New backend format parsed from string: { question: "...", blocks: [...] }
      if (Array.isArray(record.blocks)) {
        return record.blocks;
      }

      if (Array.isArray(record.answer)) {
        return record.answer;
      }

      if (
        record.answer &&
        typeof record.answer === "object" &&
        Array.isArray((record.answer as Record<string, unknown>).blocks)
      ) {
        return (record.answer as Record<string, unknown>).blocks as unknown[];
      }

      if (
        record.answer &&
        typeof record.answer === "object" &&
        Array.isArray((record.answer as Record<string, unknown>).answer)
      ) {
        return (record.answer as Record<string, unknown>).answer as unknown[];
      }
    }

    return [
      {
        id: "answer-content",
        type: "markdown",
        title: "Answer",
        content,
      },
    ];
  }

  return [];
}

function parseAnswerString(value: string): unknown | null {
  const text = value.trim();

  if (!text.startsWith("{") && !text.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
