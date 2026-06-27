"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import "@/styles/PyqsPreparation.css";

type EntryMode = "login" | "register";

type UserAcademicProfile = {
  university_id: string | null;
  branch_id: string | null;
  semester: number | null;
  universities?: { university_name: string } | null;
  branches?: { branch_name: string; branch_code: string | null } | null;
};

type Subject = {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  semester: number;
};

type QuestionPaper = {
  paper_id: string;
  paper_title: string;
  year: number;
  exam_type: string;
  duration: number;
  total_marks: number;
};

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function PyqsPreparationClient() {
  const { currentUser, loading, passwordRecovery } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const [profile, setProfile] = useState<UserAcademicProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [pageLoading, setPageLoading] = useState(false);
  const [papersLoading, setPapersLoading] = useState(false);
  const [message, setMessage] = useState("");

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const isProfileIncomplete =
    !profile?.university_id || !profile?.branch_id || !profile?.semester;
  const universityName = profile?.universities?.university_name || "University";
  const branchName = profile?.branches?.branch_name || "Branch";
  const branchCode = profile?.branches?.branch_code;
  const branchLabel = branchCode ? `${branchName} (${branchCode})` : branchName;
  const semesterLabel = profile?.semester
    ? `Semester ${profile.semester}`
    : "Semester -";

  useEffect(() => {
    async function loadUserSubjects() {
      if (!currentUser || !supabase) return;

      setPageLoading(true);
      setMessage("");
      setSubjects([]);
      setPapers([]);
      setSelectedSubject(null);

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select(`
          university_id,
          branch_id,
          semester,
          universities:university_id (
            university_name
          ),
          branches:branch_id (
            branch_name,
            branch_code
          )
        `)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
        setPageLoading(false);
        return;
      }

      const userProfile = profileData as UserAcademicProfile | null;
      setProfile(userProfile);

      if (
        !userProfile?.university_id ||
        !userProfile?.branch_id ||
        !userProfile?.semester
      ) {
        setMessage("Please complete your academic profile first.");
        setPageLoading(false);
        return;
      }

      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("subject_id, subject_name, subject_code, semester")
        .eq("university_id", userProfile.university_id)
        .eq("branch_id", userProfile.branch_id)
        .eq("semester", userProfile.semester)
        .order("subject_name", { ascending: true });

      if (subjectsError) {
        setMessage(subjectsError.message);
      } else {
        setSubjects(subjectsData || []);
      }

      setPageLoading(false);
    }

    loadUserSubjects();
  }, [currentUser, supabase]);

  const loadPapers = async (subject: Subject) => {
    if (!supabase) return;

    setSelectedSubject(subject);
    setPapers([]);
    setPapersLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("question_papers")
      .select("paper_id, paper_title, year, exam_type, duration, total_marks")
      .eq("subject_id", subject.subject_id)
      .order("year", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setPapers(data || []);
    }

    setPapersLoading(false);
  };

  return (
    <main className="pyqPage">
      <Navbar
        onLogin={() => openAuth("login")}
        onSignUp={() => openAuth("register")}
      />

      <section className="pyqShell">
        <div className="pyqHero">
          <span>Practice papers</span>
          <h1>PYQs</h1>
          <p>Semester-wise question papers.</p>
        </div>

        {loading || pageLoading ? (
          <div className="pyqState">
            <span className="pyqLoader" />
            <h2>Loading your PYQs</h2>
            <p>Fetching subjects from your academic profile...</p>
          </div>
        ) : !currentUser ? (
          <div className="pyqState">
            <h2>Login required</h2>
            <p>Sign in to see semester-wise subjects and PYQs.</p>
            <button type="button" onClick={() => openAuth("login")}>
              Login securely
            </button>
          </div>
        ) : message && isProfileIncomplete ? (
          <div className="pyqState">
            <h2>Complete academic profile</h2>
            <p>{message}</p>
            <Link href="/profile" prefetch={false}>
              Go to profile
            </Link>
          </div>
        ) : (
          <div className="pyqLayout">
            <aside className="pyqSubjectsPanel">
              <div className="pyqProfileCard">
                <span>Profile</span>
                <strong>{semesterLabel}</strong>
                <p>{branchLabel}</p>
                <small>{universityName}</small>
              </div>

              <div className="pyqSubjectHeader">
                <div>
                  <h2>Subjects</h2>
                </div>
                <strong>{subjects.length}</strong>
              </div>

              {subjects.length === 0 ? (
                <div className="pyqEmptyMini">
                  <strong>No subjects yet</strong>
                </div>
              ) : (
                <div className="pyqSubjectList">
                  {subjects.map((subject) => (
                    <div className="pyqSubjectGroup" key={subject.subject_id}>
                      <button
                        type="button"
                        className={
                          selectedSubject?.subject_id === subject.subject_id
                            ? "active"
                            : ""
                        }
                        aria-current={
                          selectedSubject?.subject_id === subject.subject_id
                            ? "true"
                            : undefined
                        }
                        onClick={() => loadPapers(subject)}
                      >
                        <span>{subject.subject_code || "SUB"}</span>
                        <strong>{subject.subject_name}</strong>
                        <em>
                          {selectedSubject?.subject_id === subject.subject_id
                            ? "Selected"
                            : "View papers"}
                        </em>
                      </button>

                      {selectedSubject?.subject_id === subject.subject_id && (
                        <div className="pyqInlinePapers">
                          {papersLoading ? (
                            <div className="pyqInlineState">
                              <span className="pyqLoader" />
                              <p>Loading papers...</p>
                            </div>
                          ) : papers.length === 0 ? (
                            <div className="pyqInlineState">
                              <strong>No papers available</strong>
                              <p>
                                This subject does not have uploaded PYQs yet.
                              </p>
                            </div>
                          ) : (
                            <div className="pyqInlinePaperList">
                              {papers.map((paper) => (
                                <Link
                                  href={`/pyqs/${paper.paper_id}`}
                                  key={paper.paper_id}
                                  className="pyqInlinePaperCard"
                                  prefetch={false}
                                >
                                  <span>{paper.exam_type}</span>
                                  <strong>{paper.paper_title}</strong>
                                  <em>
                                    {paper.year} | {paper.total_marks} marks |{" "}
                                    {paper.duration} min
                                  </em>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </aside>

            <section className="pyqPapersPanel">
              {subjects.length === 0 ? (
                <div className="pyqStartPanel">
                  <span className="pyqStartMark">PYQ</span>
                  <h2>No subjects yet</h2>
                  <Link href="/profile" prefetch={false}>
                    Review profile
                  </Link>
                </div>
              ) : !selectedSubject ? (
                <div className="pyqStartPanel">
                  <span className="pyqStartMark">PYQ</span>
                  <h2>Select subject</h2>
                </div>
              ) : (
                <>
                  <div className="pyqPaperHeader">
                    <div className="pyqPanelHeading">
                      <span>Papers</span>
                      <h2>{selectedSubject.subject_name}</h2>
                      <p>{selectedSubject.subject_code}</p>
                    </div>
                    <strong>
                      {papersLoading
                        ? "Loading"
                        : `${papers.length} paper${papers.length === 1 ? "" : "s"}`}
                    </strong>
                  </div>

                  {papersLoading ? (
                    <div className="pyqState compact">
                      <span className="pyqLoader" />
                      <h2>Loading papers</h2>
                    </div>
                  ) : papers.length === 0 ? (
                    <div className="pyqState compact">
                      <h2>No papers available</h2>
                      <p>This subject does not have uploaded PYQs yet.</p>
                    </div>
                  ) : (
                    <div className="pyqPaperGrid">
                      {papers.map((paper) => (
                        <Link
                          href={`/pyqs/${paper.paper_id}`}
                          key={paper.paper_id}
                          className="pyqPaperCard"
                          prefetch={false}
                        >
                          <span>{paper.exam_type}</span>
                          <h3>{paper.paper_title}</h3>
                          <div>
                            <strong>{paper.year}</strong>
                            <em>{paper.total_marks} marks</em>
                            <em>{paper.duration} min</em>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {message && !isProfileIncomplete && (
          <p className="pyqMessage">{message}</p>
        )}
      </section>

      {(authOpen || passwordRecovery) && (
        <AuthModal
          key={entryMode}
          open={authOpen}
          initialMode={entryMode}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </main>
  );
}
