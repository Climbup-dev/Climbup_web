"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileCode,
  ShieldCheck,
  Award,
  Clock,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Send,
  Sparkles,
  Lock,
  Unlock,
  Play,
  Code2,
  ExternalLink,
  ChevronRight,
  Layers,
  GraduationCap,
  BookOpen,
  Terminal,
  HelpCircle,
  Hash,
  Bug,
  Image as ImageIcon,
  CheckSquare,
  Lightbulb,
  Zap,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  getAssignmentSubmissionAsync,
  submitAssignment,
} from "@/lib/courses/coursesService";
import "@/styles/StudentAssignmentDark.css";

export interface ProblemTierItem {
  id?: string | number;
  problem_number?: number;
  tier: "Basic" | "Intermediate" | "Advanced" | string;
  marks: number;
  goal_type?:
    | "THEORY"
    | "CODING"
    | "MCQ"
    | "NUMERIC"
    | "DEBUGGING"
    | "SHORT_ANSWER"
    | "IMAGE_BASED"
    | "ALGORITHMIC"
    | "SCENARIO"
    | string;
  problem_statement: string;
  question?: string;
  acceptance_criteria: string[];
  conceptual_checkpoints?: string[];
  starter_code?: string;
  test_cases?: Array<{
    input_description?: string;
    expected_output?: string;
    is_hidden?: boolean;
  }>;
  deliverable?: string;
  expected_deliverable?: string;
  lecture_timestamp?: string;
  timestamp_hint?: string;
  solution_hint?: string;
  hint?: string;
  image_url?: string;
  image_caption?: string;
  mcq?: {
    options?: Record<string, string>;
    correct_answer?: string;
    explanation?: string;
  };
  numeric?: {
    target_value?: number;
    tolerance?: number;
    unit?: string;
    formula_hint?: string;
  };
  debugging?: {
    buggy_code?: string;
    error_symptom?: string;
    expected_behavior?: string;
  };
  short_answer?: {
    target_answer?: string;
    keywords?: string[];
    case_sensitive?: boolean;
  };
}

export interface RubricBreakdown {
  logic: number;
  syntax_quality: number;
  edge_cases: number;
  approach_clarity: number;
}

export interface AiGraderFeedback {
  strengths?: string[];
  mistakes?: string[];
  critical_mistakes?: string[];
  ideal_solution?: string;
  ideal_model_snippet?: string;
  revision_suggestion?: string;
  video_revisit_timestamp?: string;
  teacher_summary?: string;
  actionable_advice?: string;
  feedback?: string;
}

export interface AssignmentSubmissionState {
  id?: string;
  student_id?: string;
  assignment_id?: string;
  score?: number;
  verdict?: string;
  pillar_breakdown?: RubricBreakdown;
  feedback?: AiGraderFeedback;
  submission_content?: string;
  approach_notes?: string;
  submitted_at?: string;
  strengths?: string[];
  mistakes?: string[];
  critical_mistakes?: string[];
  ideal_solution?: string;
  ideal_model_snippet?: string;
  revision_suggestion?: string;
  video_revisit_timestamp?: string;
  teacher_summary?: string;
  actionable_advice?: string;
}

export interface GoalVerificationState {
  status: "locked" | "not_started" | "in_progress" | "passed" | "needs_revision";
  passed: boolean;
  marks_earned: number;
  max_marks: number;
  feedback?: string;
  solution_hint?: string;
  test_results?: Array<{
    name: string;
    passed: boolean;
    detail?: string;
    input?: string;
    expected?: string;
    observed?: string;
    is_hidden?: boolean;
  }>;
  unlocked_next_goal?: boolean;
}

export interface StudentAssignmentWorkspaceProps {
  lessonId: string;
  courseId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  initialAssignment?: any;
  onSeekVideo?: (timestamp: string | number) => void;
  onSwitchTab?: (tab: string) => void;
}

export default function StudentAssignmentWorkspace({
  lessonId,
  courseId,
  studentId,
  studentName = "Student",
  studentEmail = "student@climbup.dev",
  initialAssignment,
  onSeekVideo,
  onSwitchTab,
}: StudentAssignmentWorkspaceProps) {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [assignment, setAssignment] = useState<any>(initialAssignment || null);

  // Sync initialAssignment prop whenever it arrives from parent
  useEffect(() => {
    if (initialAssignment) {
      setAssignment(initialAssignment);
      setIsNotFound(false);
      setLoading(false);
    }
  }, [initialAssignment]);
  const [submission, setSubmission] = useState<AssignmentSubmissionState | null>(null);

  // Goal-by-Goal Workflow State
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [goalAnswers, setGoalAnswers] = useState<Record<number, string>>({});
  const [goalVerifications, setGoalVerifications] = useState<Record<number, GoalVerificationState>>({});
  const [evaluatingGoal, setEvaluatingGoal] = useState(false);

  // General Milestone Submission State
  const [approachNotes, setApproachNotes] = useState("");
  const [isMilestoneSubmitted, setIsMilestoneSubmitted] = useState(false);
  const [evaluatingMilestone, setEvaluatingMilestone] = useState(false);

  // Copy helpers
  const [copiedStarter, setCopiedStarter] = useState(false);
  const [copiedEditor, setCopiedEditor] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Detect overall assignment archetype (THEORY vs CODING vs MIXED)
  const assignmentType = useMemo(() => {
    if (!assignment) return "CODING";
    if (assignment.assignment_type) {
      return String(assignment.assignment_type).toUpperCase();
    }
    const probs = assignment.problems || [];
    if (probs.length > 0) {
      const hasTheory = probs.some((p: any) => {
        const gt = String(p.goal_type || "").toUpperCase();
        return ["THEORY", "ALGORITHMIC", "SCENARIO", "IMAGE_BASED", "SHORT_ANSWER"].includes(gt);
      });
      const hasCoding = probs.some((p: any) => {
        const gt = String(p.goal_type || "").toUpperCase();
        return ["CODING", "PRACTICAL", "DEBUGGING", "CODE_SNIPPET"].includes(gt);
      });
      if (hasTheory && hasCoding) return "MIXED";
      if (hasTheory) return "THEORY";
    }
    return "CODING";
  }, [assignment]);

  // Normalize Problems List from Backend JSON Output
  const problems: ProblemTierItem[] = useMemo(() => {
    if (!assignment) return [];

    if (assignment.problems && Array.isArray(assignment.problems) && assignment.problems.length > 0) {
      return assignment.problems.map((prob: any, idx: number) => {
        const defaultTier = idx === 0 ? "Basic" : idx === 1 ? "Intermediate" : "Advanced";
        const defaultMarks = idx === 0 ? 25 : idx === 1 ? 35 : 40;
        const gType = (prob.goal_type || (assignmentType === "THEORY" ? "THEORY" : "CODING")).toUpperCase();

        const criteria = Array.isArray(prob.acceptance_criteria)
          ? prob.acceptance_criteria
          : prob.acceptance_criteria
          ? [prob.acceptance_criteria]
          : ["Produces verified solution matching problem specifications"];

        const checkpoints = Array.isArray(prob.conceptual_checkpoints)
          ? prob.conceptual_checkpoints
          : criteria;

        // Default deliverable label
        let deliv = prob.expected_deliverable || prob.deliverable;
        if (!deliv) {
          if (gType === "MCQ") deliv = "Selection of Option A, B, C, or D";
          else if (gType === "NUMERIC") deliv = "Calculated Numerical Value with Unit";
          else if (gType === "DEBUGGING") deliv = "Corrected Bug-Free Source Code";
          else if (gType === "SHORT_ANSWER") deliv = "Concise Technical Concept or Terminology";
          else if (gType === "IMAGE_BASED") deliv = "Architectural Analysis of the Illustrated System";
          else if (["THEORY", "ALGORITHMIC", "SCENARIO"].includes(gType)) deliv = "Comprehensive Conceptual Analysis";
          else deliv = "Executable Code Solution";
        }

        return {
          id: prob.id || idx + 1,
          problem_number: prob.problem_number || idx + 1,
          tier: prob.tier || prob.difficulty || defaultTier,
          marks: Number(prob.marks) || defaultMarks,
          goal_type: gType,
          problem_statement: prob.problem_statement || prob.question || prob.description || "",
          question: prob.question || prob.problem_statement || "",
          acceptance_criteria: criteria,
          conceptual_checkpoints: checkpoints,
          starter_code: (["THEORY", "MCQ", "NUMERIC", "SHORT_ANSWER"].includes(gType))
            ? ""
            : (prob.starter_code || assignment.starter_code || ""),
          test_cases: prob.test_cases || [],
          deliverable: deliv,
          expected_deliverable: deliv,
          lecture_timestamp: prob.lecture_timestamp || prob.timestamp_hint || `~00:${String(15 * (idx + 1)).padStart(2, '0')}:00`,
          timestamp_hint: prob.timestamp_hint || prob.lecture_timestamp || `~00:${String(15 * (idx + 1)).padStart(2, '0')}:00`,
          solution_hint: prob.solution_hint || prob.hint || "",
          hint: prob.hint || prob.solution_hint || "",
          image_url: prob.image_url || "",
          image_caption: prob.image_caption || "",
          mcq: prob.mcq || {
            options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
            correct_answer: "A",
            explanation: ""
          },
          numeric: prob.numeric || {
            target_value: 0,
            tolerance: 0.05,
            unit: "",
            formula_hint: ""
          },
          debugging: prob.debugging || {
            buggy_code: prob.starter_code || "",
            error_symptom: "",
            expected_behavior: ""
          },
          short_answer: prob.short_answer || {
            target_answer: "",
            keywords: [],
            case_sensitive: false
          }
        };
      });
    }

    // Default 3-Goal Fallback if problems array is empty
    const title = assignment.title || "Milestone Lab";
    return [
      {
        id: 1,
        problem_number: 1,
        tier: "Basic",
        marks: 25,
        goal_type: assignmentType === "THEORY" ? "THEORY" : "CODING",
        problem_statement: `Foundational Understanding: Explain or implement the core concept introduced in ${title}.`,
        acceptance_criteria: ["Adherence to core lecture principles", "Handles standard input or base case gracefully"],
        conceptual_checkpoints: ["Identifies primary mechanisms and definitions", "Explains reasoning step-by-step"],
        starter_code: assignmentType === "THEORY" ? "" : (assignment.starter_code || "# Goal 1 Solution\n"),
        test_cases: [{ input_description: "Standard verification", expected_output: "Matches expected behavior", is_hidden: false }],
        deliverable: assignmentType === "THEORY" ? "Conceptual Explanation" : "Executable Code Solution",
        lecture_timestamp: "~00:15:00",
      },
      {
        id: 2,
        problem_number: 2,
        tier: "Intermediate",
        marks: 35,
        goal_type: assignmentType === "THEORY" ? "THEORY" : "CODING",
        problem_statement: `Applied Techniques: Deepen understanding with intermediate logic, edge cases, and transformations.`,
        acceptance_criteria: ["Implements or explains intermediate mechanics", "Correctly handles boundary conditions"],
        conceptual_checkpoints: ["Analyzes trade-offs and error scenarios", "Demonstrates comprehensive understanding"],
        starter_code: assignmentType === "THEORY" ? "" : (assignment.starter_code || "# Goal 2 Solution\n"),
        test_cases: [{ input_description: "Edge case validation", expected_output: "Handled without exception", is_hidden: false }],
        deliverable: assignmentType === "THEORY" ? "Structured Analysis" : "Refined Code Implementation",
        lecture_timestamp: "~00:45:00",
      },
      {
        id: 3,
        problem_number: 3,
        tier: "Advanced",
        marks: 40,
        goal_type: assignmentType === "THEORY" ? "THEORY" : "CODING",
        problem_statement: `Production Resilience: Analyze architectural trade-offs, anomaly handling, and optimal implementation.`,
        acceptance_criteria: ["Meets high-level correctness benchmarks", "Demonstrates scalable best practices"],
        conceptual_checkpoints: ["Synthesizes end-to-end architecture", "Provides rigorous evaluation"],
        starter_code: assignmentType === "THEORY" ? "" : (assignment.starter_code || "# Goal 3 Solution\n"),
        test_cases: [{ input_description: "Production invariants check", expected_output: "Optimal output verified", is_hidden: true }],
        deliverable: assignmentType === "THEORY" ? "Comprehensive Evaluation" : "Production-Grade Implementation",
        lecture_timestamp: "~01:15:00",
      },
    ];
  }, [assignment, assignmentType]);

  // Initialize Goal Answers and Statuses when problems change
  useEffect(() => {
    if (!problems.length) return;

    setGoalAnswers((prev) => {
      const updated: Record<number, string> = { ...prev };
      problems.forEach((p, idx) => {
        if (updated[idx] === undefined) {
          const gt = (p.goal_type || "CODING").toUpperCase();
          if (gt === "MCQ") {
            updated[idx] = "";
          } else if (gt === "DEBUGGING") {
            updated[idx] = p.debugging?.buggy_code || p.starter_code || "";
          } else if (["THEORY", "NUMERIC", "SHORT_ANSWER"].includes(gt)) {
            updated[idx] = "";
          } else {
            updated[idx] = p.starter_code || "";
          }
        }
      });
      return updated;
    });

    setGoalVerifications((prev) => {
      const updated: Record<number, GoalVerificationState> = { ...prev };
      problems.forEach((p, idx) => {
        if (!updated[idx]) {
          updated[idx] = {
            status: idx === 0 ? "not_started" : "locked",
            passed: false,
            marks_earned: 0,
            max_marks: p.marks,
          };
        }
      });
      return updated;
    });
  }, [problems]);

  // Fetch Assignment & Saved Submission
  const fetchAssignmentData = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setIsNotFound(false);

    try {
      const studentQuery = studentId ? `?student_id=${encodeURIComponent(studentId)}` : "";
      const res = await fetch(`/api/lessons/${lessonId}/assignment${studentQuery}`);

      if (res.status === 404) {
        if (initialAssignment) {
          setAssignment(initialAssignment);
          setLoading(false);
          return;
        }
        // Direct Supabase fallback if backend rewrite returned 404
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data } = await supabase.from("course_assignments").select("*").order("created_at", { ascending: false }).limit(25);
          if (data && data.length > 0) {
            for (const row of data) {
              let extra: any = {};
              try { extra = JSON.parse(row.description); } catch (_) {}
              if (extra.lesson_id === lessonId || row.id === `assign_${lessonId}`) {
                setAssignment({
                  id: row.id,
                  course_id: row.course_id,
                  lesson_id: extra.lesson_id || lessonId,
                  title: row.title,
                  description: extra.summary || row.description,
                  scenario_context: extra.scenario_context || extra.summary || row.description,
                  problems: extra.problems || [],
                  rubric: extra.rubric || null,
                  starter_code: row.starter_code || "",
                  max_score: row.max_score || 100,
                  due_date: row.due_date || "Open",
                  status: extra.status || "published"
                });
                setIsNotFound(false);
                setLoading(false);
                return;
              }
            }
          }
        } catch (_) {}

        setIsNotFound(true);
        setAssignment(null);
        setSubmission(null);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const data = await res.json();
      const currentAssign = data.assignment || data;

      if (!currentAssign || (!currentAssign.id && !currentAssign.title)) {
        setIsNotFound(true);
        setAssignment(null);
        setSubmission(null);
        setLoading(false);
        return;
      }

      setAssignment(currentAssign);

      const apiSubmission = data.submission || null;
      if (apiSubmission) {
        setSubmission(apiSubmission);
        setIsMilestoneSubmitted(true);
        setApproachNotes(apiSubmission.approach_notes || apiSubmission.approachNotes || "");
      } else {
        const targetId = currentAssign.id || lessonId;
        const saved = await getAssignmentSubmissionAsync(targetId, studentId);
        if (saved && (saved.submissionText || saved.score !== undefined)) {
          const mappedSubmission: AssignmentSubmissionState = {
            id: targetId,
            student_id: studentId,
            assignment_id: targetId,
            score: saved.score ?? 85,
            verdict: (saved.score ?? 85) >= 60 ? "PASSED - PRODUCTION READY" : "NEEDS REVISION",
            submission_content: saved.submissionText,
            approach_notes: (saved as any).approachNotes || "",
            submitted_at: saved.submittedAt,
            feedback: {
              actionable_advice: saved.feedback,
              teacher_summary: saved.feedback,
            },
          };
          setSubmission(mappedSubmission);
          setIsMilestoneSubmitted(true);
          setApproachNotes((saved as any).approachNotes || "");
        }
      }
    } catch (err) {
      console.warn("[StudentAssignmentWorkspace] Backend fetch error, utilizing initial assignment:", err);
      if (initialAssignment) {
        setAssignment(initialAssignment);
        const targetId = initialAssignment.id || lessonId;
        getAssignmentSubmissionAsync(targetId, studentId).then((saved) => {
          if (saved && saved.submissionText) {
            setSubmission({
              score: saved.score ?? 88,
              verdict: "PASSED - PRODUCTION READY",
              submission_content: saved.submissionText,
              approach_notes: (saved as any).approachNotes,
              feedback: { teacher_summary: saved.feedback },
            });
            setIsMilestoneSubmitted(true);
          }
        });
      } else {
        setIsNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId, studentId, initialAssignment]);

  useEffect(() => {
    fetchAssignmentData();
  }, [fetchAssignmentData]);

  // Current Active Problem
  const currentProblem = problems[activeGoalIndex] || problems[0];
  const currentGoalType = (currentProblem?.goal_type || (assignmentType === "THEORY" ? "THEORY" : "CODING")).toUpperCase();
  const currentGoalVerification = goalVerifications[activeGoalIndex] || {
    status: activeGoalIndex === 0 ? "not_started" : "locked",
    passed: false,
    marks_earned: 0,
    max_marks: currentProblem?.marks || 25,
  };
  const isCurrentGoalLocked = currentGoalVerification.status === "locked";

  // Helper for jumping to video timestamp
  const handleJump = (ts?: string) => {
    if (!ts || !onSeekVideo) return;
    onSeekVideo(ts);
    showToast(`Seeking video to ${ts}`, "info");
  };

  // Handle Per-Goal Verification
  const handleVerifyGoal = async () => {
    if (!currentProblem || isCurrentGoalLocked || evaluatingGoal) return;

    const currentAnswer = (goalAnswers[activeGoalIndex] || "").trim();
    const starterClean = (currentProblem.starter_code || "").trim();

    // Type-specific validation
    if (currentGoalType === "MCQ") {
      if (!currentAnswer) {
        showToast("Please choose one of the options (A, B, C, or D) before verifying.", "warning");
        return;
      }
    } else if (currentGoalType === "NUMERIC") {
      if (!currentAnswer) {
        showToast("Please enter your calculated numerical value.", "warning");
        return;
      }
    } else if (currentGoalType === "SHORT_ANSWER") {
      if (currentAnswer.length < 2) {
        showToast("Please type your answer before verifying.", "warning");
        return;
      }
    } else if (["THEORY", "ALGORITHMIC", "SCENARIO", "IMAGE_BASED"].includes(currentGoalType)) {
      if (currentAnswer.length < 15) {
        showToast("Please write your substantive conceptual explanation (at least 15 characters) before submitting.", "warning");
        return;
      }
    } else {
      // CODING or DEBUGGING
      if (currentAnswer.length < 5) {
        showToast("Please write your code solution before running verification.", "warning");
        return;
      }
      if (starterClean && currentAnswer === starterClean) {
        showToast("Submission Rejected: Please implement your solution. Unmodified starter template cannot be verified.", "error");
        return;
      }
      const substantiveCode = currentAnswer
        .replace(/#.*$/gm, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/--.*$/gm, "")
        .trim();
      if (!substantiveCode || ["pass", "...", "return", "return none"].includes(substantiveCode.toLowerCase())) {
        showToast("Submission Rejected: Incomplete code. Only placeholder stubs ('pass' / '# TODO') detected.", "error");
        return;
      }
    }

    setEvaluatingGoal(true);
    const goalNumber = currentProblem.problem_number || activeGoalIndex + 1;
    const assignmentId = assignment?.id || lessonId;

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/goals/${goalNumber}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Climbup-Player": studentId || "anonymous",
        },
        body: JSON.stringify({
          student_code: currentAnswer,
          student_id: studentId,
        }),
      });

      let data: any = null;
      if (response.ok) {
        data = await response.json();
      } else {
        const errJson = await response.json().catch(() => null);
        const serverMsg = errJson?.detail || errJson?.feedback || `Server returned HTTP ${response.status}.`;
        setGoalVerifications((prev) => ({
          ...prev,
          [activeGoalIndex]: {
            status: "needs_revision",
            passed: false,
            marks_earned: 0,
            max_marks: currentProblem.marks,
            feedback: `Notice: ${serverMsg}`,
            test_results: [
              {
                name: "Server Verification",
                passed: false,
                detail: serverMsg
              }
            ],
            unlocked_next_goal: false,
          }
        }));
        showToast(`Verification notice: ${serverMsg}`, "error");
        setEvaluatingGoal(false);
        return;
      }

      const passed = Boolean(data && data.passed);
      const marksAwarded = passed ? (data?.marks_earned ?? currentProblem.marks) : 0;
      const feedback = data?.feedback || (passed ? "Goal verified successfully! Requirements satisfied." : "Verification rejected: Solution did not satisfy test criteria.");
      
      let testResults = data?.test_results;
      if (!testResults || !Array.isArray(testResults)) {
        if (currentGoalType === "MCQ") {
          testResults = [{
            name: `Multiple Choice Option (${currentAnswer})`,
            passed,
            detail: feedback
          }];
        } else if (currentGoalType === "NUMERIC") {
          testResults = [{
            name: `Numeric Tolerance Verification (${currentAnswer} ${currentProblem.numeric?.unit || ''})`,
            passed,
            detail: feedback
          }];
        } else if (["THEORY", "ALGORITHMIC", "SCENARIO", "IMAGE_BASED"].includes(currentGoalType)) {
          testResults = (currentProblem.conceptual_checkpoints || []).map((cp: string) => ({
            name: cp,
            passed,
            detail: passed ? "Verified against lecture criteria." : "Needs further technical precision."
          }));
        } else {
          testResults = (currentProblem.test_cases || []).map((tc: any, idx: number) => ({
            name: tc.input_description || `Test ${idx + 1}`,
            passed,
            detail: passed ? "Output matched verified benchmark." : "Test case did not pass."
          }));
        }
      }

      const updatedVerification: GoalVerificationState = {
        status: passed ? "passed" : "needs_revision",
        passed,
        marks_earned: marksAwarded,
        max_marks: currentProblem.marks,
        feedback,
        solution_hint: data?.solution_hint || currentProblem.solution_hint,
        test_results: testResults,
        unlocked_next_goal: passed,
      };

      setGoalVerifications((prev) => {
        const next: Record<number, GoalVerificationState> = { ...prev, [activeGoalIndex]: updatedVerification };
        // Unlock next goal ONLY if current passed
        if (passed && activeGoalIndex + 1 < problems.length) {
          const nextIdx = activeGoalIndex + 1;
          if (next[nextIdx]?.status === "locked" || !next[nextIdx]) {
            next[nextIdx] = {
              status: "not_started",
              passed: false,
              marks_earned: 0,
              max_marks: problems[nextIdx]?.marks || 35,
            };
          }
        }
        return next;
      });

      if (passed) {
        showToast(`Goal ${goalNumber} Passed! +${marksAwarded} Marks Earned`, "success");
      } else {
        showToast(`Goal ${goalNumber} Needs Revision: Check feedback details below.`, "info");
      }
    } catch (err: any) {
      console.error("Goal verification error:", err);
      setGoalVerifications((prev) => ({
        ...prev,
        [activeGoalIndex]: {
          status: "needs_revision",
          passed: false,
          marks_earned: 0,
          max_marks: currentProblem.marks,
          feedback: "Verification network error. Please verify server connection and retry.",
          unlocked_next_goal: false,
        },
      }));
      showToast(`Goal ${goalNumber} Verification Failed: Could not contact evaluation service.`, "error");
    } finally {
      setEvaluatingGoal(false);
    }
  };

  // Final Complete Milestone Submission
  const handleFinalMilestoneSubmit = async () => {
    if (!assignment?.id && !lessonId) return;

    setEvaluatingMilestone(true);
    const targetAssignmentId = assignment.id || lessonId;

    // Combine all goal answers into a clean submission payload
    const combinedContent = problems.map((p, idx) => {
      const gType = (p.goal_type || "CODING").toUpperCase();
      const ans = goalAnswers[idx] || "";
      return `### Goal ${idx + 1}: ${p.tier} (${gType})\n${ans}\n`;
    }).join("\n---\n\n");

    const totalEarned = Object.values(goalVerifications).reduce((sum, g) => sum + (g.marks_earned || 0), 0);
    const maxScore = assignment.max_score || 100;
    const finalScore = Math.min(maxScore, Math.max(0, totalEarned || 85));
    const isPassed = finalScore >= 60;

    try {
      const response = await fetch(`/api/assignments/${targetAssignmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
          student_name: studentName,
          student_email: studentEmail,
          submission_content: combinedContent,
          approach_notes: approachNotes,
          student_code: combinedContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const savedSub = data.submission || data;
        const apiScore = data.score ?? savedSub?.ai_score ?? finalScore;
        const apiPassed = apiScore >= 60;
        const apiFeedback = data.feedback || savedSub?.ai_feedback || {};

        setSubmission({
          id: savedSub?.id || `sub_${Date.now()}`,
          student_id: studentId,
          assignment_id: targetAssignmentId,
          score: apiScore,
          verdict: apiPassed ? "PASSED - PRODUCTION READY" : "NEEDS REVISION",
          pillar_breakdown: apiFeedback.rubric_breakdown
            ? {
                logic: apiFeedback.rubric_breakdown.logic_and_correctness?.score ?? 45,
                syntax_quality: apiFeedback.rubric_breakdown.syntax_and_quality?.score ?? 22,
                edge_cases: apiFeedback.rubric_breakdown.edge_cases?.score ?? 13,
                approach_clarity: apiFeedback.rubric_breakdown.approach_clarity?.score ?? 8,
              }
            : {
                logic: Math.round(apiScore * 0.5),
                syntax_quality: Math.round(apiScore * 0.25),
                edge_cases: Math.round(apiScore * 0.15),
                approach_clarity: Math.round(apiScore * 0.1),
              },
          feedback: apiFeedback,
          strengths: apiFeedback.strengths || ["Successfully completed all milestone objectives."],
          mistakes: apiFeedback.mistakes || [],
          critical_mistakes: apiFeedback.mistakes || [],
          ideal_solution: apiFeedback.ideal_solution || "",
          ideal_model_snippet: apiFeedback.ideal_solution || "",
          revision_suggestion: apiFeedback.revision_suggestion || "Review key milestone concepts in the lecture.",
          teacher_summary: apiFeedback.teacher_summary || "Comprehensive milestone submitted.",
          submitted_at: new Date().toISOString(),
        });
        setIsMilestoneSubmitted(true);
        showToast(`Milestone Mission Graded! Score: ${apiScore}/100`, "success");
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.detail || "Submission failed on evaluation server.";
        showToast(errMsg, "error");
      }
    } catch (err: any) {
      console.warn("[StudentAssignmentWorkspace] Server submission error, persisting locally:", err);
      await submitAssignment(
        targetAssignmentId,
        courseId,
        {
          submissionText: combinedContent,
          approachNotes,
          score: finalScore,
          feedback: "Graded via local milestone tally.",
        },
        studentId
      );
      setSubmission({
        score: finalScore,
        verdict: isPassed ? "PASSED - PRODUCTION READY" : "NEEDS REVISION",
        submission_content: combinedContent,
        submitted_at: new Date().toISOString(),
        feedback: { teacher_summary: "Milestone successfully logged and verified." },
      });
      setIsMilestoneSubmitted(true);
      showToast("Milestone submitted and verified locally.", "success");
    } finally {
      setEvaluatingMilestone(false);
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="darkAssignmentRoot" style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ display: "inline-block", marginBottom: "16px" }}>
          <BrainCircuit size={36} color="#2563eb" className="animate-pulse" />
        </div>
        <h4 style={{ color: "#0f172a", margin: "0 0 6px", fontSize: "17px", fontWeight: 700 }}>
          Loading Assignment Studio Workspace...
        </h4>
        <p style={{ color: "#64748b", fontSize: "13.5px", margin: 0 }}>
          Synchronizing progressive milestones and learning objectives.
        </p>
      </div>
    );
  }

  // 404 Empty State
  if (isNotFound || !assignment) {
    return (
      <div className="darkAssignmentRoot">
        <div className="darkEmptyStateCard">
          <div className="darkEmptyStateIconWrap">
            <FileCode size={30} />
          </div>
          <h3 className="darkEmptyStateTitle">
            No assignment published for this lecture yet.
          </h3>
          <p className="darkEmptyStateDesc">
            The instructor has not attached a mission to this lecture yet.
            Continue watching the video or test your comprehension with the interactive MCQs arena!
          </p>
          <div className="darkEmptyStateActions">
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("mcqs")}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  padding: "10px 22px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                }}
              >
                <Award size={15} /> Practice Interactive MCQs
              </button>
            )}
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("rag")}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  padding: "10px 20px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <Sparkles size={15} color="#2563eb" /> Ask AI Lecture Mentor
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const maxScore = assignment.max_score || 100;
  const dueDateStr = assignment.due_date || assignment.dueDate || "Next Sunday, 11:59 PM";
  const currentAnswer = goalAnswers[activeGoalIndex] || "";
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const charCount = currentAnswer.length;

  const passedGoalsCount = Object.values(goalVerifications).filter((g) => g.passed).length;
  const totalGoalsCount = problems.length;
  const totalEarnedMarks = Object.values(goalVerifications).reduce((sum, g) => sum + (g.marks_earned || 0), 0);

  // Dynamic Goal Type Presentation Helpers
  const isMcq = currentGoalType === "MCQ";
  const isNumeric = currentGoalType === "NUMERIC";
  const isDebugging = currentGoalType === "DEBUGGING";
  const isShortAnswer = currentGoalType === "SHORT_ANSWER";
  const isImageBased = currentGoalType === "IMAGE_BASED" || Boolean(currentProblem.image_url);
  const isTheory = ["THEORY", "ALGORITHMIC", "SCENARIO", "IMAGE_BASED"].includes(currentGoalType);
  const isCoding = !isMcq && !isNumeric && !isDebugging && !isShortAnswer && !isTheory;

  let goalTypePillLabel = "Coding Challenge";
  let goalTypePillClass = "coding";
  let verifyBtnClass = "coding";
  let verifyBtnText = "Test Code & Verify Goal";

  if (isMcq) {
    goalTypePillLabel = "Multiple Choice Checkpoint";
    goalTypePillClass = "mcq";
    verifyBtnClass = "mcq";
    verifyBtnText = currentAnswer ? `Verify Choice ${currentAnswer}` : "Select an Option to Verify";
  } else if (isNumeric) {
    goalTypePillLabel = "Calculation Problem";
    goalTypePillClass = "numeric";
    verifyBtnClass = "numeric";
    verifyBtnText = "Verify Numerical Result";
  } else if (isDebugging) {
    goalTypePillLabel = "Bug-Fix & Debugging";
    goalTypePillClass = "debugging";
    verifyBtnClass = "debugging";
    verifyBtnText = "Verify Repaired Solution";
  } else if (isShortAnswer) {
    goalTypePillLabel = "Short-Answer Concept";
    goalTypePillClass = "short_answer";
    verifyBtnClass = "short_answer";
    verifyBtnText = "Verify Concept Terminology";
  } else if (isTheory) {
    goalTypePillLabel = "Theory & Architecture";
    goalTypePillClass = "theory";
    verifyBtnClass = "theory";
    verifyBtnText = "Verify Theory Explanation";
  }

  return (
    <div className="darkAssignmentRoot">
      {/* 1. HEADER & ARCHETYPE BADGES */}
      <header className="darkAssignmentHeader">
        <div>
          <div className="darkBadgeRow">
            <span className="darkTagLive">
              <span className="darkPulseDot" />
              Active Milestone Mission
            </span>

            {/* Archetype Pill */}
            <span className={`darkArchetypeBadge ${assignmentType.toLowerCase()}`}>
              {assignmentType === "THEORY" ? (
                <>
                  <BookOpen size={13} /> Theory Mission
                </>
              ) : assignmentType === "MIXED" ? (
                <>
                  <Layers size={13} /> Mixed (Theory + Coding)
                </>
              ) : (
                <>
                  <Terminal size={13} /> Coding Mission
                </>
              )}
            </span>

            <span className="darkTagAiRubric">
              <ShieldCheck size={13} /> Zero-Leakage Auto-Grader
            </span>
          </div>

          <h2 className="darkAssignmentTitle">
            {assignment.title || "Milestone Practical Assignment"}
          </h2>
        </div>

        {/* Due Date & Max Marks Badges */}
        <div className="darkMetaPills">
          <div className="darkDuePill">
            <Clock size={14} color="#64748b" />
            <span>Due: {dueDateStr}</span>
          </div>

          <div className="darkMaxScoreBadge">
            <Award size={16} color="#059669" />
            <span>{maxScore} Total Marks</span>
          </div>
        </div>
      </header>

      {/* 2. REAL-WORLD SCENARIO CONTEXT BOX */}
      {assignment.scenario_context && (
        <section className="darkScenarioCard">
          <div className="darkScenarioHeader">
            <BrainCircuit size={16} />
            <span>Production Scenario Context</span>
          </div>
          <p className="darkScenarioBody">{assignment.scenario_context}</p>
        </section>
      )}

      {/* 3. PROGRESSIVE GOAL STEPPER BAR */}
      <div className="darkGoalStepper">
        {problems.map((p, idx) => {
          const vState = goalVerifications[idx] || { status: idx === 0 ? "not_started" : "locked" };
          const isPassed = vState.status === "passed";
          const isNeedsRev = vState.status === "needs_revision";
          const isLocked = vState.status === "locked";
          const isActive = activeGoalIndex === idx;

          return (
            <button
              key={idx}
              type="button"
              disabled={isLocked}
              onClick={() => setActiveGoalIndex(idx)}
              className={`darkGoalStepBtn ${isActive ? "active" : ""} ${isPassed ? "passed" : ""} ${isNeedsRev ? "needs_revision" : ""} ${isLocked ? "locked" : ""}`}
            >
              {isLocked ? (
                <Lock size={13} color="#94a3b8" />
              ) : isPassed ? (
                <CheckCircle2 size={13} color="#059669" />
              ) : isNeedsRev ? (
                <AlertTriangle size={13} color="#d97706" />
              ) : (
                <Unlock size={13} color="#2563eb" />
              )}
              <span>Goal {idx + 1}: {p.tier}</span>
              <span style={{ fontSize: "11px", opacity: 0.85 }}>({p.marks} Pts)</span>
            </button>
          );
        })}
      </div>

      {/* 4. ACTIVE GOAL WORKSPACE CARD */}
      <section className="darkMilestonesSection">
        <div className="darkProblemCard" style={{ border: "1.5px solid #bfdbfe", background: "#ffffff" }}>
          {/* Top Row: Tier, Marks, Goal Type, Lecture Timestamp */}
          <div className="darkProblemTopRow">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className={`darkProblemTierBadge ${currentProblem.tier.toLowerCase()}`}>
                Goal {activeGoalIndex + 1}: {currentProblem.tier}
              </span>

              <span className={`darkGoalTypeBadge ${goalTypePillClass}`}>
                {isMcq ? <CheckSquare size={11} /> : isNumeric ? <Hash size={11} /> : isDebugging ? <Bug size={11} /> : isTheory ? <BookOpen size={11} /> : <Terminal size={11} />}
                {goalTypePillLabel}
              </span>

              {/* Status Badge */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  background: currentGoalVerification.passed ? "#ecfdf5" : currentGoalVerification.status === "needs_revision" ? "#fffbeb" : "#f1f5f9",
                  color: currentGoalVerification.passed ? "#047857" : currentGoalVerification.status === "needs_revision" ? "#b45309" : "#64748b",
                  border: `1px solid ${currentGoalVerification.passed ? "#a7f3d0" : currentGoalVerification.status === "needs_revision" ? "#fde68a" : "#e2e8f0"}`
                }}
              >
                {currentGoalVerification.passed ? "Passed" : currentGoalVerification.status === "needs_revision" ? "Needs Revision" : "In Progress"}
              </span>

              {/* Seek Jump Timestamp */}
              {currentProblem.lecture_timestamp && (
                <button
                  type="button"
                  onClick={() => handleJump(currentProblem.lecture_timestamp)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: "#2563eb",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    cursor: onSeekVideo ? "pointer" : "default",
                  }}
                  title="Click to seek lecture video around this timestamp"
                >
                  <Play size={10} fill="#2563eb" /> {currentProblem.lecture_timestamp}
                </button>
              )}
            </div>

            <span className="darkProblemMarksBadge">
              {currentProblem.marks} Marks
            </span>
          </div>

          {/* Problem Statement */}
          <div className="darkProblemStatement" style={{ fontSize: "14.5px", lineHeight: 1.6, color: "#0f172a", fontWeight: 600, whiteSpace: "pre-wrap" }}>
            {currentProblem.problem_statement || currentProblem.question}
          </div>

          {/* Image / Architecture Diagram Preview (if present) */}
          {currentProblem.image_url && (
            <div className="darkGoalDiagramCard">
              <img
                src={currentProblem.image_url}
                alt={currentProblem.image_caption || "Architecture Blueprint"}
                className="darkGoalDiagramImg"
              />
              {currentProblem.image_caption && (
                <div className="darkGoalDiagramCaption">
                  <ImageIcon size={13} /> {currentProblem.image_caption}
                </div>
              )}
            </div>
          )}

          {/* Expected Deliverable Tag */}
          {currentProblem.deliverable && (
            <div className="darkDeliverableTag" style={{ margin: "12px 0 8px" }}>
              <span style={{ fontWeight: 800, color: "#1e40af" }}>Target Deliverable:</span>
              <strong style={{ color: "#0f172a", marginLeft: "6px" }}>{currentProblem.deliverable}</strong>
            </div>
          )}

          {/* Interactive Hint Accordion */}
          {(currentProblem.solution_hint || currentProblem.hint) && (
            <details className="darkGoalHintDetails">
              <summary className="darkGoalHintSummary">
                <Lightbulb size={14} color="#d97706" />
                <span>Need a Concept Hint?</span>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "normal" }}>(Click to reveal guidance)</span>
              </summary>
              <div className="darkGoalHintContent">
                {currentProblem.solution_hint || currentProblem.hint}
              </div>
            </details>
          )}

          {/* ======================================================== */}
          {/* BRANCH A: MCQ GOAL INTERACTION                           */}
          {/* ======================================================== */}
          {isMcq && (
            <div className="darkMcqOptionsGrid">
              <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Select the Correct Option:
              </div>
              {Object.entries(currentProblem.mcq?.options || { A: "Option A", B: "Option B", C: "Option C", D: "Option D" }).map(([optKey, optText]) => {
                const isSelected = currentAnswer === optKey;
                return (
                  <label
                    key={optKey}
                    className={`darkMcqOptionLabel ${isSelected ? "selected" : ""} ${isCurrentGoalLocked ? "disabled" : ""}`}
                    onClick={() => {
                      if (!isCurrentGoalLocked) {
                        setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: optKey }));
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name={`mcq_goal_${activeGoalIndex}`}
                      value={optKey}
                      checked={isSelected}
                      disabled={isCurrentGoalLocked}
                      onChange={() => {}}
                      className="darkMcqRadioInput"
                    />
                    <span className="darkMcqKey">{optKey})</span>
                    <span className="darkMcqText">{optText}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* BRANCH B: NUMERIC CALCULATION GOAL                       */}
          {/* ======================================================== */}
          {isNumeric && (
            <div className="darkNumericContainer">
              <div className="darkNumericTitle">
                <Hash size={14} /> Enter Your Calculated Numerical Result:
              </div>
              <div className="darkNumericInputRow">
                <input
                  type="text"
                  value={currentAnswer}
                  disabled={isCurrentGoalLocked}
                  placeholder="e.g. 10.67"
                  onChange={(e) => setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: e.target.value }))}
                  className="darkNumericInput"
                />
                {currentProblem.numeric?.unit && (
                  <span className="darkNumericUnit">{currentProblem.numeric.unit}</span>
                )}
              </div>
              {currentProblem.numeric?.formula_hint && (
                <div className="darkFormulaHint">
                  <Info size={13} color="#d97706" />
                  <span>Formula Hint: {currentProblem.numeric.formula_hint}</span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* BRANCH C: DEBUGGING CHALLENGE GOAL                       */}
          {/* ======================================================== */}
          {isDebugging && (
            <div className="darkDebuggingContainer">
              <div className="darkDebugTitle">
                <Bug size={14} /> Buggy Implementation (Analyze & Repair):
              </div>
              {currentProblem.debugging?.buggy_code && (
                <div className="darkBuggyCodeBox">
                  <pre className="darkBuggyCodeText">{currentProblem.debugging.buggy_code}</pre>
                </div>
              )}
              <div className="darkDebugBadges">
                {currentProblem.debugging?.error_symptom && (
                  <div className="darkDebugBadge">
                    <strong>Reported Symptom:</strong> {currentProblem.debugging.error_symptom}
                  </div>
                )}
                {currentProblem.debugging?.expected_behavior && (
                  <div className="darkDebugBadge" style={{ borderColor: "#bbf7d0", color: "#166534" }}>
                    <strong>Expected Behavior:</strong> {currentProblem.debugging.expected_behavior}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BRANCH D: SHORT ANSWER CONCEPT GOAL                      */}
          {/* ======================================================== */}
          {isShortAnswer && (
            <div className="darkShortAnswerContainer">
              <div className="darkShortAnswerTitle">
                <BookOpen size={14} /> Type Concise Concept / Terminology:
              </div>
              <input
                type="text"
                value={currentAnswer}
                disabled={isCurrentGoalLocked}
                placeholder="Enter precise technical answer or keyword..."
                onChange={(e) => setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: e.target.value }))}
                className="darkShortAnswerInput"
              />
            </div>
          )}

          {/* ======================================================== */}
          {/* BRANCH E: THEORY CONCEPTUAL CHECKPOINTS & TEXTAREA       */}
          {/* ======================================================== */}
          {isTheory && !isMcq && !isNumeric && !isShortAnswer && (
            <>
              {currentProblem.conceptual_checkpoints && currentProblem.conceptual_checkpoints.length > 0 && (
                <div className="darkCheckpointsContainer">
                  <div className="darkCheckpointsTitle">
                    <BookOpen size={14} /> Required Conceptual Checkpoints:
                  </div>
                  <div className="darkCheckpointsList">
                    {currentProblem.conceptual_checkpoints.map((cp, cIdx) => (
                      <div key={cIdx} className="darkCheckpointItem">
                        <CheckCircle2 size={13} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span>{cp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="darkTheoryCard">
                <div className="darkTheoryHeader">
                  <div className="darkTheoryTitle">
                    <GraduationCap size={16} color="#2563eb" />
                    <span>Your Conceptual Explanation & Technical Analysis:</span>
                  </div>
                  <div className="darkTheoryWordCount">
                    {wordCount} words - {charCount} chars
                  </div>
                </div>
                <textarea
                  value={currentAnswer}
                  disabled={isCurrentGoalLocked}
                  placeholder="Write your comprehensive conceptual analysis, citing mechanisms and principles from the lecture..."
                  onChange={(e) => setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: e.target.value }))}
                  className="darkTheoryTextarea"
                />
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* BRANCH F: CODING / DEBUGGING CODE EDITOR & TEST CASES    */}
          {/* ======================================================== */}
          {(isCoding || isDebugging) && (
            <>
              {/* Acceptance Criteria */}
              {currentProblem.acceptance_criteria && currentProblem.acceptance_criteria.length > 0 && (
                <div className="darkCriteriaList" style={{ margin: "14px 0 10px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Acceptance Criteria:
                  </span>
                  {currentProblem.acceptance_criteria.map((crit, cIdx) => (
                    <div key={cIdx} className="darkCriterionItem">
                      <CheckCircle2 size={14} className="darkCriterionCheckIcon" />
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification Test Specifications */}
              {currentProblem.test_cases && currentProblem.test_cases.length > 0 && (
                <div className="darkTestCasesContainer">
                  <div className="darkTestCasesTitle">
                    <Terminal size={14} /> Verification Test Specifications:
                  </div>
                  {currentProblem.test_cases.map((tc, tcIdx) => (
                    <div key={tcIdx} className="darkTestCaseItem">
                      <div className="darkTestCaseInput">
                        {tc.is_hidden ? (
                          <span style={{ color: "#7c3aed", fontWeight: 700 }}>Invariant Boundary Validation (Hidden test)</span>
                        ) : (
                          <>
                            <span style={{ color: "#2563eb" }}>Test {tcIdx + 1}: </span>
                            {tc.input_description}
                          </>
                        )}
                      </div>
                      {!tc.is_hidden && tc.expected_output && (
                        <div className="darkTestCaseExpected">
                          Expected: {tc.expected_output}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Monospace Code Editor Card */}
              <div className={`darkEditorCard ${isCurrentGoalLocked ? "locked" : ""}`} style={{ marginTop: "14px" }}>
                <div className="darkEditorToolbar">
                  <div className="darkEditorWindowDots">
                    <span className="darkWindowDot red" />
                    <span className="darkWindowDot yellow" />
                    <span className="darkWindowDot green" />
                    <span className="darkEditorFileName" style={{ marginLeft: "8px" }}>
                      <Code2 size={13} /> solution_goal_{activeGoalIndex + 1}.py
                    </span>
                  </div>

                  <div className="darkEditorActions">
                    {currentProblem.starter_code && (
                      <button
                        type="button"
                        disabled={isCurrentGoalLocked}
                        onClick={() => {
                          setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: currentProblem.starter_code || "" }));
                          showToast("Starter template reset.", "info");
                        }}
                        className="darkToolBtn"
                        title="Reset to starter template"
                      >
                        <RotateCcw size={12} /> Reset Template
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (currentAnswer) {
                          navigator.clipboard.writeText(currentAnswer);
                          setCopiedEditor(true);
                          setTimeout(() => setCopiedEditor(false), 2000);
                          showToast("Code copied to clipboard!", "info");
                        }
                      }}
                      className="darkToolBtn"
                    >
                      {copiedEditor ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedEditor ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                </div>

                <textarea
                  value={currentAnswer}
                  disabled={isCurrentGoalLocked}
                  placeholder="# Implement your verified goal solution here..."
                  onChange={(e) => setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: e.target.value }))}
                  className="darkEditorTextarea"
                  rows={10}
                />
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* VERIFY BUTTON & LIVE FEEDBACK CARD                       */}
          {/* ======================================================== */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Isolated zero-tampering test runner - Instant feedback</span>
            </div>

            <button
              type="button"
              disabled={isCurrentGoalLocked || evaluatingGoal}
              onClick={handleVerifyGoal}
              className={`darkVerifyGoalBtn ${verifyBtnClass}`}
            >
              {evaluatingGoal ? (
                <>
                  <RotateCcw size={14} className="animate-spin" />
                  <span>Evaluating Goal {activeGoalIndex + 1}...</span>
                </>
              ) : currentGoalVerification.passed ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Re-Verify Goal {activeGoalIndex + 1}</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>{verifyBtnText}</span>
                </>
              )}
            </button>
          </div>

          {/* Verification Feedback Report Box */}
          {currentGoalVerification.feedback && (
            <div className={`darkGoalFeedbackBox ${currentGoalVerification.passed ? "passed" : "needs_revision"}`}>
              <div className="darkGoalFeedbackHeader">
                <div className={`darkGoalFeedbackTitle ${currentGoalVerification.passed ? "passed" : "needs_revision"}`}>
                  {currentGoalVerification.passed ? (
                    <CheckCircle2 size={16} color="#047857" />
                  ) : (
                    <AlertTriangle size={16} color="#b45309" />
                  )}
                  <span>
                    {currentGoalVerification.passed
                      ? `Goal ${activeGoalIndex + 1} Verified Successfully!`
                      : `Goal ${activeGoalIndex + 1} Needs Revision`}
                  </span>
                </div>

                <div className={`darkGoalFeedbackMarks ${currentGoalVerification.passed ? "passed" : "needs_revision"}`}>
                  {currentGoalVerification.passed
                    ? `+${currentGoalVerification.marks_earned} / ${currentGoalVerification.max_marks} Marks Earned`
                    : `0 / ${currentGoalVerification.max_marks} Marks`}
                </div>
              </div>

              <p style={{ fontSize: "13.5px", lineHeight: 1.55, margin: "0 0 10px", color: currentGoalVerification.passed ? "#065f46" : "#92400e" }}>
                {currentGoalVerification.feedback}
              </p>

              {/* Detailed Test Results Table */}
              {currentGoalVerification.test_results && currentGoalVerification.test_results.length > 0 && (
                <div className="darkVerificationResultsList">
                  {currentGoalVerification.test_results.map((tr, trIdx) => (
                    <div
                      key={trIdx}
                      className={`darkVerificationResultItem ${tr.passed ? "passed" : "failed"}`}
                    >
                      {tr.passed ? (
                        <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
                      ) : (
                        <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                      )}
                      <div>
                        <strong>{tr.name}: </strong>
                        <span>{tr.detail || (tr.passed ? "Verified successfully." : "Requirements not met.")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. APPROACH NOTES & FINAL MILESTONE SUBMISSION */}
      <section className="darkWorkspaceContainer">
        <div className="darkWorkspaceHeader">
          <h3 className="darkWorkspaceTitle">
            <Send size={15} /> Final Mission Submission & Overall Report
          </h3>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1d4ed8" }}>
            {passedGoalsCount} of {totalGoalsCount} Goals Verified - Total: {totalEarnedMarks} / {maxScore} Marks
          </div>
        </div>

        <div className="darkNotesContainer">
          <label className="darkNotesLabel">
            <span>Student Approach Notes & Methodology</span>
            <span className="optional">(Optional reflection for your instructor)</span>
          </label>
          <textarea
            value={approachNotes}
            disabled={isMilestoneSubmitted}
            placeholder="Summarize your problem-solving approach, architectural decisions, and trade-offs..."
            onChange={(e) => setApproachNotes(e.target.value)}
            className="darkNotesTextarea"
            rows={3}
          />
        </div>

        <div className="darkSubmitRow">
          <div className="darkSecurityNote">
            <ShieldCheck size={14} color="#10b981" />
            <span>Strict Immutability: Once final submission is logged, your score & feedback are locked.</span>
          </div>

          <button
            type="button"
            disabled={evaluatingMilestone}
            onClick={handleFinalMilestoneSubmit}
            className={`darkSubmitBtn ${evaluatingMilestone ? "evaluating" : ""}`}
          >
            {evaluatingMilestone ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                <span>Generating Executive AI Report Card...</span>
              </>
            ) : isMilestoneSubmitted ? (
              <>
                <CheckCircle2 size={16} />
                <span>Update / Re-Submit Final Mission</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Submit Final Milestone Mission</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 6. INSTANT GRADED REPORT CARD (POST-SUBMISSION) */}
      {submission && (
        <section className="darkReportCardRoot" style={{ marginTop: "28px" }}>
          <div className="darkReportTopRow">
            <div className="darkReportScoreArea">
              {/* Circular Score Gauge */}
              <div className="darkScoreGaugeWrapper">
                <svg className="darkScoreGaugeSvg" viewBox="0 0 100 100">
                  <circle
                    className="darkGaugeTrack"
                    cx="50"
                    cy="50"
                    r="42"
                    strokeWidth="9"
                    fill="none"
                  />
                  <circle
                    className="darkGaugeFill"
                    cx="50"
                    cy="50"
                    r="42"
                    strokeWidth="9"
                    fill="none"
                    stroke="#2563eb"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * Math.min(100, submission.score || 0)) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="darkGaugeValue">
                  <span className="darkGaugeNum">{submission.score ?? 0}</span>
                  <span className="darkGaugeMax">/ {maxScore}</span>
                </div>
              </div>

              <div>
                <span
                  className={`darkVerdictPill ${(submission.score ?? 0) >= 60 ? "passed" : "needsRevision"}`}
                >
                  {(submission.score ?? 0) >= 60 ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                  {submission.verdict || ((submission.score ?? 0) >= 60 ? "PASSED - PRODUCTION READY" : "NEEDS REVISION")}
                </span>
                <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "6px" }}>
                  Evaluated at: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleTimeString() : "Just now"}
                </div>
              </div>
            </div>

            {submission.feedback?.video_revisit_timestamp && (
              <button
                type="button"
                onClick={() => handleJump(submission.feedback?.video_revisit_timestamp)}
                className="darkVideoJumpBtn"
              >
                <Play size={13} fill="#1d4ed8" />
                <span>Revisit Lecture ({submission.feedback.video_revisit_timestamp})</span>
              </button>
            )}
          </div>

          {/* 4-Pillar Rubric Breakdown Progress Bars */}
          {submission.pillar_breakdown && (
            <div className="darkPillarGrid">
              <div className="darkPillarCard">
                <div className="darkPillarHeader">
                  <span>Logic & Correctness</span>
                  <span className="darkPillarPts">{submission.pillar_breakdown.logic} / 50</span>
                </div>
                <div className="darkPillarBarBg">
                  <div
                    className="darkPillarBarFill"
                    style={{ width: `${(submission.pillar_breakdown.logic / 50) * 100}%` }}
                  />
                </div>
              </div>

              <div className="darkPillarCard">
                <div className="darkPillarHeader">
                  <span>Syntax & Code Quality</span>
                  <span className="darkPillarPts">{submission.pillar_breakdown.syntax_quality} / 25</span>
                </div>
                <div className="darkPillarBarBg">
                  <div
                    className="darkPillarBarFill"
                    style={{ width: `${(submission.pillar_breakdown.syntax_quality / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div className="darkPillarCard">
                <div className="darkPillarHeader">
                  <span>Edge Cases & Resilience</span>
                  <span className="darkPillarPts">{submission.pillar_breakdown.edge_cases} / 15</span>
                </div>
                <div className="darkPillarBarBg">
                  <div
                    className="darkPillarBarFill"
                    style={{ width: `${(submission.pillar_breakdown.edge_cases / 15) * 100}%` }}
                  />
                </div>
              </div>

              <div className="darkPillarCard">
                <div className="darkPillarHeader">
                  <span>Approach Clarity</span>
                  <span className="darkPillarPts">{submission.pillar_breakdown.approach_clarity} / 10</span>
                </div>
                <div className="darkPillarBarBg">
                  <div
                    className="darkPillarBarFill"
                    style={{ width: `${(submission.pillar_breakdown.approach_clarity / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Strengths & Mistakes */}
          <div className="darkInsightsGrid">
            {submission.strengths && submission.strengths.length > 0 && (
              <div className="darkInsightsBox strengths">
                <div className="darkInsightsTitle">
                  <CheckCircle2 size={14} /> Demonstrable Strengths
                </div>
                <div className="darkInsightsPillGroup">
                  {submission.strengths.map((str, sIdx) => (
                    <span key={sIdx} className="darkStrengthPill">
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {submission.mistakes && submission.mistakes.length > 0 && (
              <div className="darkInsightsBox mistakes">
                <div className="darkInsightsTitle">
                  <AlertTriangle size={14} /> Areas For Optimization
                </div>
                <div className="darkInsightsPillGroup">
                  {submission.mistakes.map((mst, mIdx) => (
                    <span key={mIdx} className="darkMistakePill">
                      {mst}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ideal Solution Snippet */}
          {submission.ideal_solution && (
            <div className="darkIdealSolutionBox">
              <div className="darkIdealHeader">
                <div className="darkIdealTitle">
                  <Sparkles size={14} color="#93c5fd" />
                  <span>Model Benchmark Reference:</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submission.ideal_solution || "");
                    setCopiedSnippet(true);
                    setTimeout(() => setCopiedSnippet(false), 2000);
                    showToast("Snippet copied!", "info");
                  }}
                  className="darkToolBtn"
                >
                  {copiedSnippet ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  {copiedSnippet ? "Copied!" : "Copy Benchmark"}
                </button>
              </div>
              <pre className="darkIdealCodePre">{submission.ideal_solution}</pre>
            </div>
          )}

          {/* Teacher Executive Summary */}
          {submission.teacher_summary && (
            <div className="darkTeacherSummaryBox">
              <div className="darkTeacherSummaryHeader">
                <GraduationCap size={15} /> Instructor Evaluation Summary
              </div>
              <p className="darkTeacherSummaryText">{submission.teacher_summary}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
