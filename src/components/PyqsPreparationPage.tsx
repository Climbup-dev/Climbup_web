"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Clock, Award, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getCache, setCache } from "@/lib/cache";
import AcademicProfileEditor from "@/components/AcademicProfileEditor";
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
  paper_url?: string | null;
};

const AuthModal = dynamic(() => import("@/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

const INSPIRING_QUOTES = [
  "Your potential is endless. Let's unlock it.",
  "Every question solved is a step closer to success.",
  "Focus, determination, and consistency.",
  "The best time to start is now.",
  "Great things never come from comfort zones.",
  "Preparing your academic arsenal..."
];

export default function PyqsPreparationClient() {
  const router = useRouter();
  const { currentUser, loading, passwordRecovery } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [authOpen, setAuthOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("login");

  const [profile, setProfile] = useState<UserAcademicProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [navigatingPaperId, setNavigatingPaperId] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (navigatingPaperId) {
      const interval = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % INSPIRING_QUOTES.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [navigatingPaperId]);

  const [pageLoading, setPageLoading] = useState(false);
  const [papersLoading, setPapersLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const requiresLogin = !loading && !currentUser;

  const openAuth = (mode: EntryMode) => {
    setEntryMode(mode);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    if (!currentUser) {
      window.location.assign("/");
    }
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

      const cacheKey = `pyqs_profile_${currentUser.id}`;
      const cached = getCache<{ profile: UserAcademicProfile; subjects: Subject[] }>(cacheKey);
      
      if (cached) {
        setProfile(cached.profile);
        setSubjects(cached.subjects);
        setPageLoading(false);
        return;
      }

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
        if (userProfile && !subjectsError) {
          setCache(cacheKey, { profile: userProfile, subjects: subjectsData || [] });
        }
      }

      setPageLoading(false);
    }

    loadUserSubjects();
  }, [currentUser, supabase, refreshKey]);

  const loadPapers = async (subject: Subject) => {
    if (!supabase) return;

    setSelectedSubject(subject);
    
    const cacheKey = `pyqs_papers_${subject.subject_id}`;
    const cached = getCache<QuestionPaper[]>(cacheKey);
    if (cached) {
      setPapers(cached);
      return;
    }

    setPapers([]);
    setPapersLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("question_papers")
      .select("paper_id, paper_title, year, exam_type, duration, total_marks, paper_url")
      .eq("subject_id", subject.subject_id)
      .order("year", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setPapers(data || []);
      if (data) setCache(cacheKey, data);
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
          <div className="pyqHeroContent">
            <span>Academic Resource Center</span>
            <h1>Previous Year Questions</h1>
            <p>Ace your exams with university-specific PYQs. Set your profile below to instantly unlock past papers tailored to your branch and semester.</p>
            <ul className="pyqHeroFeatures">
              <li><CheckCircle2 size={16} /> Fast concept mastery</li>
              <li><CheckCircle2 size={16} /> Save 80% time searching internet & books</li>
              <li><CheckCircle2 size={16} /> Multiple student answers and their skill insights</li>
              <li><CheckCircle2 size={16} /> Ask AI to easily resolve doubts</li>
              <li><CheckCircle2 size={16} /> Edit fast and save privately or publicly</li>
              <li><CheckCircle2 size={16} /> Add YouTube solutions for easy exam-time review</li>
            </ul>
          </div>
          <div className="pyqHeroImageWrapper">
            <Image src="/features/learning_v3.png" alt="Learning PYQs" width={500} height={375} className="pyqHeroImage" priority />
          </div>
        </div>

        {loading ? (
          <div className="pyqState">
            <span className="pyqLoader" />
            <h2>Authenticating Secure Session</h2>
            <p>Please wait while we securely connect to your profile...</p>
          </div>
        ) : !currentUser ? (
          <div className="pyqState">
            <h2>Unlock Your Academic Potential</h2>
            <p>Sign in to access personalized PYQs, curated subjects, and premium study materials tailored specifically to your branch and semester.</p>
            <button type="button" onClick={() => openAuth("login")}>
              Login Securely
            </button>
          </div>
        ) : (
          <div className="pyqLayoutContainer" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            <AcademicProfileEditor 
              userId={currentUser.id} 
              onProfileUpdated={() => {
                setRefreshKey(prev => prev + 1);
                setTimeout(() => {
                  document.getElementById('pyq-subjects-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }} 
            />
            
            {!isProfileIncomplete && (
              <div className="pyqLayout" id="pyq-subjects-section">
                {pageLoading ? (
                  <div className="pyqState compact" style={{ gridColumn: '1 / -1', minHeight: '300px' }}>
                    <span className="pyqLoader" />
                    <h2>Curating your subjects</h2>
                    <p>Synchronizing your personalized academic profile...</p>
                  </div>
                ) : (
                  <>
                    <aside className="pyqSubjectsPanel">
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
                              <p>Retrieving papers...</p>
                            </div>
                          ) : papers.length === 0 ? (
                            <div className="pyqInlineState">
                              <strong>No papers discovered</strong>
                              <p>
                                We haven't uploaded PYQs for this specific subject yet. Check back later!
                              </p>
                            </div>
                          ) : (
                            <div className="pyqInlinePaperList">
                              {papers.map((paper) => (
                                <div
                                  key={paper.paper_id}
                                  className="pyqInlinePaperCard"
                                  onClick={() => router.push(`/pyqs/${paper.paper_id}`)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                                    <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <FileText size={16} color="#38d399" /> {paper.paper_title}
                                    </strong>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <em style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Award size={14} /> {paper.total_marks} marks
                                      </em>
                                      <em style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Clock size={14} /> {paper.duration} min
                                      </em>
                                    </div>
                                  </div>
                                  <div className="pyqCardArrow" style={{ display: "flex", alignItems: "center" }}>
                                    <ChevronRight size={20} color="rgba(158, 248, 220, 0.4)" />
                                  </div>
                                </div>
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
                      <h2>Retrieving papers</h2>
                    </div>
                  ) : papers.length === 0 ? (
                    <div className="pyqState compact">
                      <h2>No papers discovered</h2>
                      <p>We haven't uploaded PYQs for this specific subject yet. Check back soon!</p>
                    </div>
                  ) : (
                    <div className="pyqPaperGrid">
                      {papers.map((paper) => (
                        <div
                          key={paper.paper_id}
                          className="pyqPaperCard"
                          onClick={() => {
                            setNavigatingPaperId(paper.paper_id);
                            router.push(`/pyqs/${paper.paper_id}`);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <FileText size={20} color="#38d399" /> {paper.paper_title}
                          </h3>
                          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", width: "100%" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <em style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <Award size={14} /> {paper.total_marks} marks
                              </em>
                              <em style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <Clock size={14} /> {paper.duration} min
                              </em>
                            </div>
                            <div className="pyqCardArrow">
                              {navigatingPaperId === paper.paper_id ? (
                                <span className="pyqMiniSpinner" />
                              ) : (
                                <ChevronRight size={24} color="#38d399" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {message && !isProfileIncomplete && (
          <p className="pyqMessage">{message}</p>
        )}
      </section>

      {(authOpen || passwordRecovery || requiresLogin) && (
        <AuthModal
          key={entryMode}
          open={authOpen || requiresLogin}
          initialMode={entryMode}
          onClose={closeAuth}
        />
      )}

      {navigatingPaperId && (
        <div className="pyqInspiringLoaderOverlay">
          <div className="pyqInspiringLoaderBox">
            <div className="pyqInspiringSpinner"></div>
            <h3>Preparing your study space...</h3>
            <p>"{INSPIRING_QUOTES[quoteIndex]}"</p>
          </div>
        </div>
      )}
    </main>
  );
}
