export type CourseLevel = "Beginner" | "Intermediate" | "Advanced" | "All Levels";

export type CourseCategory =
  | "All"
  | "Full-Stack Web Dev"
  | "AI & Machine Learning"
  | "Python & Data Science"
  | "Cloud & DevOps"
  | "Mobile App Dev"
  | "System Design & DSA";

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  duration: string; // e.g., "14:20"
  durationSeconds: number;
  videoUrl: string;
  audioUrl?: string;
  rawTranscript?: string;
  structuredNotes?: any;
  chapters?: any[];
  isFreePreview?: boolean;
  is_free_preview?: boolean;
  notes?: string;
  transcriptSnippets?: {
    time: string; // "04:15"
    seconds: number;
    text: string;
  }[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: CourseLesson[];
  assignmentId?: string;
  quizId?: string;
}

export type AssignmentStatus = "pending" | "submitted" | "graded";

export interface CourseAssignment {
  id: string;
  courseId: string;
  moduleId?: string;
  moduleTitle?: string;
  title: string;
  description: string;
  instructions: string[];
  starterCode?: string;
  starterFileUrl?: string;
  maxScore: number;
  dueDate: string;
  userSubmission?: {
    status: AssignmentStatus;
    submittedAt?: string;
    submissionText?: string;
    githubUrl?: string;
    liveUrl?: string;
    score?: number;
    feedback?: string;
  };
}

export interface MCQQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  timestampRef?: string;
}

export interface CourseQuiz {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questions: MCQQuestion[];
}

export interface CourseResource {
  id: string;
  title: string;
  fileType: "pdf" | "zip" | "github" | "link";
  fileSize?: string;
  downloadUrl: string;
  description: string;
}

export interface CourseDiscussion {
  id: string;
  courseId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  title: string;
  content: string;
  likes: number;
  repliesCount: number;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  thumbnail: string;
  instructor: {
    name: string;
    title: string;
    avatar: string;
    bio: string;
  };
  duration: string;
  totalLessons: number;
  rating: number;
  reviewsCount: number;
  studentsEnrolled: number;
  price: number; // 0 for free
  isFeatured?: boolean;
  skillsGained: string[];
  prerequisites: string[];
  modules: CourseModule[];
  assignments: CourseAssignment[];
  quizzes: CourseQuiz[];
  resources: CourseResource[];
}

export interface RAGChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestampRef?: {
    time: string;
    seconds: number;
    context?: string;
  };
  createdAt: string;
}
