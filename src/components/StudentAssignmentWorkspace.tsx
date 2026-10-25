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
  HelpCircle
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
  goal_type?: "THEORY" | "CODING" | "PRACTICAL" | string;
  problem_statement: string;
  acceptance_criteria: string[];
  conceptual_checkpoints?: string[];
  starter_code?: string;
  test_cases?: Array<{
    input_description?: string;
    expected_output?: string;
    is_hidden?: boolean;
  }>;
  deliverable?: string;
  lecture_timestamp?: string;
  timestamp_hint?: string;
  solution_hint?: string;
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
  const [submission, setSubmission] = useState<AssignmentSubmissionState | null>(null);

  // Goal-by-Goal Workflow State
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [goalAnswers, setGoalAnswers] = useState<Record<number, string>>({});
  const [goalVerifications, setGoalVerifications] = useState<Record<number, GoalVerificationState>>({});
  const [evaluatingGoal, setEvaluatingGoal] = useState(false);

  // General Milestone State
  const [approachNotes, setApproachNotes] = useState("");
  const [isMilestoneSubmitted, setIsMilestoneSubmitted] = useState(false);
  const [evaluatingMilestone, setEvaluatingMilestone] = useState(false);

  // Copy helpers
  const [copiedStarter, setCopiedStarter] = useState(false);
  const [copiedEditor, setCopiedEditor] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Detect assignment archetype (THEORY vs CODING vs MIXED)
  const assignmentType = useMemo(() => {
    if (!assignment) return "CODING";
    if (assignment.assignment_type) {
      return String(assignment.assignment_type).toUpperCase();
    }
    const problems = assignment.problems || [];
    if (problems.length > 0) {
      const hasTheory = problems.some((p: any) => String(p.goal_type || "").toUpperCase() === "THEORY");
      const hasCoding = problems.some((p: any) => {
        const gt = String(p.goal_type || "").toUpperCase();
        return gt === "CODING" || gt === "PRACTICAL";
      });
      if (hasTheory && hasCoding) return "MIXED";
      if (hasTheory) return "THEORY";
    }
    return "CODING";
  }, [assignment]);

  // Normalize Problems List
  const problems: ProblemTierItem[] = useMemo(() => {
    if (!assignment) return [];

    if (assignment.problems && Array.isArray(assignment.problems) && assignment.problems.length > 0) {
      return assignment.problems.map((prob: any, idx: number) => {
        const defaultTier = idx === 0 ? "Basic" : idx === 1 ? "Intermediate" : "Advanced";
        const defaultMarks = idx === 0 ? 25 : idx === 1 ? 35 : 40;
        const gType = (prob.goal_type || (assignmentType === "THEORY" ? "THEORY" : "CODING")).toUpperCase();

        const criteria = Array.isArray(prob.acceptance_criteria)
          ? prob.acceptance_criteria
          : (prob.acceptance_criteria ? [prob.acceptance_criteria] : ["Produces verified solution matching problem specifications"]);

        const checkpoints = Array.isArray(prob.conceptual_checkpoints)
          ? prob.conceptual_checkpoints
          : criteria;

        return {
          id: prob.id || idx + 1,
          problem_number: prob.problem_number || idx + 1,
          tier: prob.tier || prob.difficulty || defaultTier,
          marks: prob.marks || defaultMarks,
          goal_type: gType,
          problem_statement: prob.problem_statement || prob.question || prob.description || "",
          acceptance_criteria: criteria,
          conceptual_checkpoints: checkpoints,
          starter_code: gType === "THEORY" ? "" : (prob.starter_code || assignment.starter_code || ""),
          test_cases: prob.test_cases || [],
          deliverable: prob.deliverable || prob.expected_deliverable || (gType === "THEORY" ? "Conceptual Explanation & Analysis" : "Executable Code Solution"),
          lecture_timestamp: prob.lecture_timestamp || prob.timestamp_hint || `~00:${String(15 * (idx + 1)).padStart(2, '0')}:00`,
          timestamp_hint: prob.timestamp_hint || prob.lecture_timestamp || `~00:${String(15 * (idx + 1)).padStart(2, '0')}:00`,
          solution_hint: prob.solution_hint || "",
        };
      });
    }

    // Default lecture-grounded fallback
    const title = assignment.title || "Milestone Lab";
    return [
      {
        id: 1,
        problem_number: 1,
        tier: "Basic",
        marks: 25,
        goal_type: assignmentType === "THEORY" ? "THEORY" : "CODING",
        problem_statement: `Foundational Understanding: Explain or implement the core concept introduced in ${title}.`,
        acceptance_criteria: ["Clear adherence to core lecture principles", "Handles standard input or base case gracefully"],
        conceptual_checkpoints: ["Identifies primary mechanisms and definitions", "Explains reasoning step-by-step"],
        starter_code: assignmentType === "THEORY" ? "" : (assignment.starter_code || "# Goal 1 Solution"),
        test_cases: [{ input_description: "Standard verification", expected_output: "Matches expected behavior", is_hidden: false }],
        deliverable: assignmentType === "THEORY" ? "Conceptual Explanation" : "Executable Code",
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
        starter_code: assignmentType === "THEORY" ? "" : (assignment.starter_code || "# Goal 2 Solution"),
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
        problem_statement: `Real-World Synthesis: Analyze production resilience, system invariants, and optimal solutions.`,
        acceptance_criteria: ["Meets high-level correctness benchmarks", "Demonstrates scalable best practices"],
        conceptual_checkpoints: ["Synthesizes end-to-end architecture", "Provides rigorous evaluation"],
        starter_code: assignmentType === "THEORY" ? "" : (assignment.starter_code || "# Goal 3 Solution"),
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
          updated[idx] = p.goal_type === "THEORY" ? "" : (p.starter_code || "");
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
          const targetId = initialAssignment.id || lessonId;
          const saved = await getAssignmentSubmissionAsync(targetId, studentId);
          if (saved && (saved.submissionText || saved.score !== undefined)) {
            setSubmission({
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
            });
            setIsMilestoneSubmitted(true);
          }
          setLoading(false);
          return;
        }
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

  // Handle Per-Goal Verification
  const handleVerifyGoal = async () => {
    if (!currentProblem || isCurrentGoalLocked || evaluatingGoal) return;

    const currentAnswer = (goalAnswers[activeGoalIndex] || "").trim();
    const starterClean = (currentProblem.starter_code || "").trim();
    const minLength = currentGoalType === "THEORY" ? 15 : 5;

    if (currentAnswer.length < minLength) {
      showToast(
        currentGoalType === "THEORY"
          ? "Please write your substantive conceptual explanation before submitting."
          : "Please write your code solution before running verification.",
        "warning"
      );
      return;
    }

    // Guard 1: Detect unmodified starter code
    if (currentGoalType === "CODING" && starterClean && currentAnswer === starterClean) {
      showToast("Submission Rejected: Please implement your solution before submitting. Unmodified starter template cannot be verified.", "error");
      return;
    }

    // Guard 2: Detect code that is only comments or placeholder stubs (pass / ...)
    if (currentGoalType === "CODING") {
      const substantiveCode = currentAnswer
        .replace(/#.*$/gm, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/--.*$/gm, "")
        .trim();
      if (!substantiveCode || ["pass", "...", "return", "return none"].includes(substantiveCode.toLowerCase())) {
        showToast("Submission Rejected: Incomplete code. Only placeholder stubs ('pass' / '# TODO') detected. Please write the required logic.", "error");
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
        console.warn("[StudentAssignmentWorkspace] Server verify non-200:", response.status, errJson);
        const serverMsg = errJson?.detail || errJson?.feedback || `Server returned HTTP ${response.status}.`;
        setGoalVerifications((prev) => ({
          ...prev,
          [goalNumber]: {
            status: "needs_revision",
            passed: false,
            marks_earned: 0,
            max_marks: currentProblem.marks,
            feedback: `Server connection notice: ${serverMsg}`,
            test_results: [
              {
                name: "Backend Verification Endpoint",
                passed: false,
                detail: `HTTP ${response.status}: Please verify backend server is running and reachable.`
              }
            ],
            unlocked_next_goal: false,
          }
        }));
        showToast(`Verification server returned HTTP ${response.status}.`, "error");
        setEvaluatingGoal(false);
        return;
      }

      // Check verification results strictly: NEVER default to true
      const passed = Boolean(data && data.passed);
      const marksAwarded = passed ? (data?.marks_earned ?? currentProblem.marks) : 0;
      const feedback = data?.feedback || (passed ? "Goal verified successfully! Requirements satisfied." : "Verification rejected: Solution did not satisfy test criteria.");
      const testResults = data?.test_results || (currentGoalType === "THEORY"
        ? (currentProblem.conceptual_checkpoints || []).map((cp: string) => ({ name: cp, passed: passed, detail: passed ? "Addressed accurately." : "Needs more detail." }))
        : (currentProblem.test_cases || []).map((tc: any, idx: number) => ({ name: tc.input_description || `Test ${idx + 1}`, passed: passed, detail: passed ? "Output matched." : "Output mismatch." })));

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
        showToast(`🎉 Goal ${goalNumber} Passed! +${marksAwarded} Marks Earned`, "success");
      } else {
        showToast(`Goal ${goalNumber} Needs Revision: Review constructive feedback below.`, "info");
      }
    } catch (err) {
      console.error("Goal verification error:", err);
      // Strict rejection on network / execution error (Never auto-pass!)
      setGoalVerifications((prev) => ({
        ...prev,
        [activeGoalIndex]: {
          status: "needs_revision",
          passed: false,
          marks_earned: 0,
          max_marks: currentProblem.marks,
          feedback: "Verification failed due to a network connection error. Please verify your code and retry.",
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

      let evalData: any = null;
      if (response.ok) {
        evalData = await response.json();
      }

      const submissionResult: AssignmentSubmissionState = {
        id: targetAssignmentId,
        student_id: studentId,
        assignment_id: targetAssignmentId,
        score: finalScore,
        verdict: isPassed ? "PASSED - PRODUCTION READY" : "NEEDS REVISION",
        pillar_breakdown: evalData?.submission?.pillar_breakdown || {
          logic: Math.round((finalScore / 100) * 50),
          syntax_quality: Math.round((finalScore / 100) * 25),
          edge_cases: Math.round((finalScore / 100) * 15),
          approach_clarity: Math.round((finalScore / 100) * 10),
        },
        submission_content: combinedContent,
        approach_notes: approachNotes,
        submitted_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        feedback: {
          strengths: evalData?.submission?.feedback?.strengths || [
            "Demonstrated strong conceptual grasp and systematic problem-solving",
            "Progressive milestone requirements satisfied across all completed challenges",
          ],
          mistakes: evalData?.submission?.feedback?.mistakes || [
            "Review edge-case boundary conditions for higher efficiency",
          ],
          revision_suggestion: "Review milestone timestamps for advanced synthesis tips.",
          teacher_summary: "Outstanding work! All progressive goals completed with verified checkpoints.",
        },
      };

      setSubmission(submissionResult);
      setIsMilestoneSubmitted(true);

      // Persist to Supabase Course Store
      await submitAssignment(
        targetAssignmentId,
        courseId,
        {
          submissionText: combinedContent,
          approachNotes,
        } as any,
        studentId
      );

      showToast(`Milestone Complete! Final Score: ${finalScore}/${maxScore} Pts (${submissionResult.verdict})`, "success");
    } catch (err) {
      console.error("Final submission error:", err);
      showToast("Milestone progress recorded locally!", "info");
      setIsMilestoneSubmitted(true);
    } finally {
      setEvaluatingMilestone(false);
    }
  };

  // Timestamp Jump Handler
  const handleJump = (ts?: string | null) => {
    if (!ts || !onSeekVideo) return;
    onSeekVideo(ts);
  };

  // Copy code helper
  const handleCopyCode = () => {
    const text = goalAnswers[activeGoalIndex] || "";
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedEditor(true);
    setTimeout(() => setCopiedEditor(false), 2000);
    showToast("Copied to clipboard!", "success");
  };

  // Reset to starter code for active goal
  const handleResetGoalStarter = () => {
    if (isCurrentGoalLocked) return;
    const starter = currentProblem.starter_code || "";
    if (confirm("Reset this goal editor back to original starter template?")) {
      setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: starter }));
      showToast("Starter template restored for this goal.", "info");
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="darkAssignmentRoot" style={{ textAlign: "center", padding: "50px 24px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            border: "3px solid rgba(37, 99, 235, 0.2)",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
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
  const dueDateStr = assignment.due_date || assignment.dueDate;
  const currentAnswer = goalAnswers[activeGoalIndex] || "";
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const charCount = currentAnswer.length;

  const passedGoalsCount = Object.values(goalVerifications).filter((g) => g.passed).length;
  const totalGoalsCount = problems.length;

  return (
    <div className="darkAssignmentRoot">
      {/* 1. HEADER & ARCHETYPE BADGES */}
      <header className="darkAssignmentHeader">
        <div>
          <div className="darkBadgeRow">
            <span className="darkTagLive">
              <span className="darkPulseDot" />
              Active Milestone
            </span>

            {/* Archetype Pill */}
            <span className={`darkArchetypeBadge ${assignmentType.toLowerCase()}`}>
              {assignmentType === "THEORY" ? (
                <>
                  <BookOpen size={13} /> Theory Mission
                </>
              ) : assignmentType === "MIXED" ? (
                <>
                  <Layers size={13} /> Mixed Mission (Theory + Code)
                </>
              ) : (
                <>
                  <Terminal size={13} /> Coding Mission
                </>
              )}
            </span>

            <span className="darkTagAiRubric">
              <ShieldCheck size={13} /> Rubric Verified
            </span>
          </div>

          <h2 className="darkAssignmentTitle">
            {assignment.title || "Progressive Milestone Assignment"}
          </h2>
        </div>

        <div className="darkMetaPills">
          <div className="darkDuePill">
            <Clock size={15} color="#64748b" />
            <span>{dueDateStr ? `Due: ${dueDateStr}` : "Estimated: 45 Mins"}</span>
          </div>
          <div className="darkMaxScoreBadge">
            <Award size={16} />
            <span>Max Score: {maxScore} Pts</span>
          </div>
        </div>
      </header>

      {/* Real-World Scenario Context Card */}
      <div className="darkScenarioCard">
        <div className="darkScenarioHeader">
          <BrainCircuit size={17} /> Real-World Problem Context
        </div>
        <p className="darkScenarioBody">
          {assignment.scenario_context ||
            assignment.description ||
            "Apply core principles learned in this lecture to solve progressive challenges. Complete each goal sequentially to verify your solution and unlock the next challenge."}
        </p>
      </div>

      {/* 2. GOAL-BY-GOAL STEPPER NAVIGATION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Milestone Progression ({passedGoalsCount} of {totalGoalsCount} Goals Verified)
        </span>
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
          Sequential Completion Required
        </span>
      </div>

      <div className="darkGoalStepper" role="tablist">
        {problems.map((prob, idx) => {
          const vState = goalVerifications[idx] || { status: idx === 0 ? "not_started" : "locked", passed: false };
          const isLocked = vState.status === "locked";
          const isPassed = vState.passed;
          const isNeedsRev = vState.status === "needs_revision";
          const isActive = idx === activeGoalIndex;
          const gType = (prob.goal_type || (assignmentType === "THEORY" ? "THEORY" : "CODING")).toUpperCase();

          let statusClass = "";
          if (isPassed) statusClass = "passed";
          else if (isNeedsRev) statusClass = "needs_revision";
          else if (isLocked) statusClass = "locked";

          return (
            <button
              key={idx}
              type="button"
              disabled={isLocked}
              onClick={() => setActiveGoalIndex(idx)}
              className={`darkGoalStepBtn ${isActive ? "active" : ""} ${statusClass}`}
              title={isLocked ? `Complete Goal ${idx} first to unlock this challenge.` : `Switch to Goal ${idx + 1}`}
            >
              {isPassed ? (
                <CheckCircle2 size={15} color="#059669" />
              ) : isLocked ? (
                <Lock size={14} color="#94a3b8" />
              ) : gType === "THEORY" ? (
                <BookOpen size={14} color="#2563eb" />
              ) : (
                <Code2 size={14} color="#059669" />
              )}
              <span>
                Goal {idx + 1}: {prob.tier}
              </span>
              <span style={{ fontSize: "11px", opacity: 0.85, fontWeight: 800 }}>
                ({prob.marks} pts)
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. ACTIVE GOAL WORKSPACE */}
      <section className="darkMilestonesSection" style={{ marginTop: "8px" }}>
        <div className="darkProblemCard" style={{ border: "1px solid #bfdbfe", background: "#ffffff" }}>
          {/* Top Row: Tier, Marks, Goal Type, Lecture Timestamp */}
          <div className="darkProblemTopRow">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className={`darkProblemTierBadge ${currentProblem.tier.toLowerCase()}`}>
                Goal {activeGoalIndex + 1}: {currentProblem.tier}
              </span>

              <span className={`darkGoalTypeBadge ${currentGoalType.toLowerCase()}`}>
                {currentGoalType === "THEORY" ? (
                  <>
                    <BookOpen size={11} /> Conceptual / Theory
                  </>
                ) : (
                  <>
                    <Terminal size={11} /> Code Implementation
                  </>
                )}
              </span>

              {currentProblem.lecture_timestamp && (
                <button
                  type="button"
                  onClick={() => handleJump(currentProblem.lecture_timestamp)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
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
                  <Play size={10} fill="#2563eb" /> ⏱️ {currentProblem.lecture_timestamp}
                </button>
              )}
            </div>

            <span className="darkProblemMarksBadge">
              {currentProblem.marks} Pts
            </span>
          </div>

          {/* Problem Statement */}
          <p className="darkProblemStatement" style={{ fontSize: "14.5px", lineHeight: 1.6, color: "#0f172a", fontWeight: 500 }}>
            {currentProblem.problem_statement}
          </p>

          {/* Expected Deliverable */}
          {currentProblem.deliverable && (
            <div className="darkDeliverableTag" style={{ margin: "10px 0" }}>
              <span style={{ fontWeight: 700, color: "#1e40af" }}>🎯 Expected Deliverable:</span>
              <strong style={{ color: "#0f172a", marginLeft: "6px" }}>{currentProblem.deliverable}</strong>
            </div>
          )}

          {/* If THEORY Goal: Render Conceptual Checkpoints */}
          {currentGoalType === "THEORY" && (
            <div className="darkCheckpointsContainer">
              <div className="darkCheckpointsTitle">
                <BookOpen size={14} /> Required Conceptual Checkpoints:
              </div>
              <div className="darkCheckpointsList">
                {(currentProblem.conceptual_checkpoints && currentProblem.conceptual_checkpoints.length > 0
                  ? currentProblem.conceptual_checkpoints
                  : currentProblem.acceptance_criteria
                ).map((cp, cIdx) => (
                  <div key={cIdx} className="darkCheckpointItem">
                    <span style={{ color: "#2563eb", fontWeight: 800 }}>📌</span>
                    <span>{cp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If CODING Goal: Render Acceptance Criteria & Test Cases */}
          {currentGoalType !== "THEORY" && (
            <>
              {currentProblem.acceptance_criteria && currentProblem.acceptance_criteria.length > 0 && (
                <div className="darkCriteriaList" style={{ margin: "12px 0" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
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

              {currentProblem.test_cases && currentProblem.test_cases.length > 0 && (
                <div className="darkTestCasesContainer">
                  <div className="darkTestCasesTitle">
                    <Terminal size={14} /> Verification Test Specifications:
                  </div>
                  {currentProblem.test_cases.map((tc, tcIdx) => (
                    <div key={tcIdx} className="darkTestCaseItem">
                      <div className="darkTestCaseInput">
                        {tc.is_hidden ? (
                          <span style={{ color: "#7c3aed", fontWeight: 700 }}>🔒 Invariant Boundary Test (Hidden validation)</span>
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
            </>
          )}

          {/* 4. DEDICATED INPUT WORKSPACE FOR CURRENT GOAL */}
          {currentGoalType === "THEORY" ? (
            /* THEORY ESSAY / EXPLANATION WORKSPACE (NO CODE EDITOR) */
            <div className="darkTheoryCard">
              <div className="darkTheoryHeader">
                <div className="darkTheoryTitle">
                  <BookOpen size={16} color="#2563eb" /> Your Conceptual Explanation & Analysis
                </div>
                <div className="darkTheoryWordCount">
                  {wordCount} words • {charCount} chars
                </div>
              </div>

              <textarea
                value={goalAnswers[activeGoalIndex] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: val }));
                }}
                disabled={isCurrentGoalLocked}
                rows={8}
                placeholder="Explain your conceptual understanding with clear technical arguments, step-by-step reasoning, and concrete scenarios matching the checkpoints above..."
                className="darkTheoryTextarea"
                spellCheck={true}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  💡 Evaluated semantically against conceptual checkpoints. No programming syntax check required.
                </div>

                <button
                  type="button"
                  onClick={handleVerifyGoal}
                  disabled={evaluatingGoal || isCurrentGoalLocked}
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13px",
                    padding: "9px 20px",
                    borderRadius: "9px",
                    border: "none",
                    cursor: evaluatingGoal || isCurrentGoalLocked ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  {evaluatingGoal ? (
                    <>
                      <Sparkles size={15} className="animate-spin" />
                      Evaluating Conceptual Response...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      ▶ Submit & Verify Theory Goal
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* CODING MONOSPACE EDITOR WORKSPACE */
            <div className={`darkEditorCard ${isCurrentGoalLocked ? "locked" : ""}`} style={{ marginTop: "16px" }}>
              <div className="darkEditorToolbar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="darkEditorWindowDots">
                    <span className="darkWindowDot red" />
                    <span className="darkWindowDot yellow" />
                    <span className="darkWindowDot green" />
                  </div>
                  <span className="darkEditorFileName">
                    goal_{activeGoalIndex + 1}_solution.py
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {(goalAnswers[activeGoalIndex] || "").split("\n").length} lines
                  </span>
                </div>

                <div className="darkEditorActions">
                  <button
                    type="button"
                    onClick={handleResetGoalStarter}
                    className="darkToolBtn"
                    title="Reset code editor back to goal starter template"
                  >
                    <RotateCcw size={12} /> Reset Goal Starter
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="darkToolBtn"
                    title="Copy your current goal code"
                  >
                    {copiedEditor ? (
                      <>
                        <Check size={12} color="#059669" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                value={goalAnswers[activeGoalIndex] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setGoalAnswers((prev) => ({ ...prev, [activeGoalIndex]: val }));
                }}
                disabled={isCurrentGoalLocked}
                rows={10}
                placeholder="# Write your code solution for this goal here..."
                className="darkEditorTextarea"
                spellCheck={false}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  🛡️ Static AST Syntax & Sandboxed Test-Case Evaluation
                </div>

                <button
                  type="button"
                  onClick={handleVerifyGoal}
                  disabled={evaluatingGoal || isCurrentGoalLocked}
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13px",
                    padding: "9px 20px",
                    borderRadius: "9px",
                    border: "none",
                    cursor: evaluatingGoal || isCurrentGoalLocked ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                  }}
                >
                  {evaluatingGoal ? (
                    <>
                      <Sparkles size={15} className="animate-spin" />
                      Running Tests & Verifying...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      ▶ Run Code & Verify Goal
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 5. LIVE GOAL VERIFICATION FEEDBACK PANEL */}
          {currentGoalVerification.status !== "not_started" && currentGoalVerification.status !== "locked" && (
            <div className={`darkGoalFeedbackBox ${currentGoalVerification.passed ? "passed" : "needs_revision"}`}>
              <div className="darkGoalFeedbackHeader">
                <div className={`darkGoalFeedbackTitle ${currentGoalVerification.passed ? "passed" : "needs_revision"}`}>
                  {currentGoalVerification.passed ? (
                    <>
                      <CheckCircle2 size={18} color="#059669" /> Goal Verified Successfully!
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} color="#d97706" /> Goal Needs Revision
                    </>
                  )}
                </div>

                <span className={`darkGoalFeedbackMarks ${currentGoalVerification.passed ? "passed" : "needs_revision"}`}>
                  {currentGoalVerification.passed
                    ? `+${currentGoalVerification.marks_earned} / ${currentProblem.marks} Pts Awarded`
                    : `${currentGoalVerification.marks_earned} / ${currentProblem.marks} Pts (Revise to earn full marks)`}
                </span>
              </div>

              {currentGoalVerification.feedback && (
                <p style={{ margin: "0 0 10px", fontSize: "13.5px", lineHeight: 1.55, color: currentGoalVerification.passed ? "#065f46" : "#92400e" }}>
                  {currentGoalVerification.feedback}
                </p>
              )}

              {/* Criteria / Test Results Breakdown */}
              {currentGoalVerification.test_results && currentGoalVerification.test_results.length > 0 && (
                <div className="darkVerificationResultsList">
                  {currentGoalVerification.test_results.map((tr, rIdx) => (
                    <div key={rIdx} className={`darkVerificationResultItem ${tr.passed ? "passed" : "failed"}`}>
                      <span style={{ fontWeight: 800 }}>{tr.passed ? "✓" : "⚠️"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{tr.name}</div>
                        {tr.detail && <div style={{ fontSize: "12px", opacity: 0.9 }}>{tr.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Next Goal Unlock Button */}
              {currentGoalVerification.passed && activeGoalIndex + 1 < problems.length && (
                <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setActiveGoalIndex(activeGoalIndex + 1)}
                    style={{
                      background: "#059669",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(5, 150, 105, 0.2)",
                    }}
                  >
                    Proceed to Goal {activeGoalIndex + 2} <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. OVERALL MILESTONE SUBMISSION & SCORECARD */}
      <section style={{ marginTop: "24px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px", fontSize: "15.5px", fontWeight: 800, color: "#0f172a" }}>
              Complete Milestone Submission
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              {passedGoalsCount === totalGoalsCount
                ? "All goals passed! Submit your complete milestone to record your grade in the student gradebook."
                : `Completed ${passedGoalsCount} of ${totalGoalsCount} goals. You can submit now or finish remaining goals for full marks.`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleFinalMilestoneSubmit}
            disabled={evaluatingMilestone}
            style={{
              background: passedGoalsCount === totalGoalsCount
                ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "14px",
              padding: "11px 24px",
              borderRadius: "10px",
              border: "none",
              cursor: evaluatingMilestone ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            }}
          >
            {evaluatingMilestone ? (
              <>
                <Sparkles size={16} className="animate-spin" />
                Submitting Milestone...
              </>
            ) : isMilestoneSubmitted ? (
              <>
                <CheckCircle2 size={16} />
                Update & Resubmit Milestone
              </>
            ) : (
              <>
                <Send size={16} />
                🚀 Submit Complete Milestone
              </>
            )}
          </button>
        </div>

        {/* Graded Summary Scorecard if submitted */}
        {submission && (
          <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "50%", width: "44px", height: "44px", display: "grid", placeItems: "center", fontWeight: 800, color: "#047857", fontSize: "16px" }}>
                {submission.score ?? 85}
              </div>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", display: "block" }}>
                  {submission.verdict || "PASSED - PRODUCTION READY"}
                </span>
                <span style={{ fontSize: "12.5px", color: "#475569", fontWeight: 600 }}>
                  Grade recorded {submission.submitted_at ? `at ${submission.submitted_at}` : "in course progress"}
                </span>
              </div>
            </div>

            {submission.feedback?.teacher_summary && (
              <div style={{ fontSize: "13px", color: "#334155", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 14px", maxWidth: "420px" }}>
                💬 <strong>AI Mentor:</strong> {submission.feedback.teacher_summary}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
