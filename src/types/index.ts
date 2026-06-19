export interface Subject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  branch: string;
  semester: number;
}

export interface QuestionPaper {
  paper_id: string;
  subject_id: string;
  paper_title: string;
  exam_type: string;
  year: number;
  duration: number;
  total_marks: number;
  semester: number;
  subjects?: Pick<Subject, "subject_name" | "subject_id">;
}

export interface Question {
  question_id: string;
  paper_id: string;
  question_number: string;
  question_text: string;
  marks: number;
  difficulty: string;
  module: string | null;
}

export interface AIAnswer {
  ai_answer_id: string;
  question_id: string;
  answer: string;
  ai_model: string;
  created_at: string;
}

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  profile_image: string | null;
  reputation: number;
  created_at?: string;
}

export interface StudentAnswer {
  answer_id: string;
  user_id: string;
  question_id: string;
  answer_content: string;
  status: string;
  likes_count: number;
  views_count: number;
  verification_score: number;
  published_at: string | null;
  created_at: string;
  updated_at?: string;
  users?: Pick<User, "full_name" | "profile_image" | "user_id">;
  questions?: Pick<Question, "question_text">;
}

export interface Comment {
  comment_id: string;
  user_id: string;
  answer_id: string;
  comment: string;
  created_at: string;
  users?: Pick<User, "full_name" | "profile_image">;
}
