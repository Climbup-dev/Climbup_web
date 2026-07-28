"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Clock, Award, ChevronRight, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getCache, setCache } from "@/lib/cache";
import AcademicProfileEditor from "@/components/AcademicProfileEditor";
import CustomSelect from "@/components/CustomSelect";
import { OpenElectiveBasket } from "@/types/open-electives";
import "@/styles/PyqsPreparation.css";

type EntryMode = "login" | "register";

type UserAcademicProfile = {
  university_id: string | null;
  branch_id: string | null;
  semester: number | null;
  mdm_branch_id: string | null;
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

type Branch = {
  branch_id: string;
  branch_name: string;
  branch_code: string | null;
};

type MdmSubject = {
  mdm_subject_id: string;
  subject_name: string;
  subject_code: string;
  semester: number;
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

  // MDM State
  const [mdmBranches, setMdmBranches] = useState<Branch[]>([]);
  const [selectedMdmBranchId, setSelectedMdmBranchId] = useState<string>("");
  const [selectedMdmSemester, setSelectedMdmSemester] = useState<number | "">("");
  const [mdmSubjects, setMdmSubjects] = useState<MdmSubject[]>([]);
  const [selectedMdmSubject, setSelectedMdmSubject] = useState<MdmSubject | null>(null);
  const [mdmPapers, setMdmPapers] = useState<QuestionPaper[]>([]);
  const [mdmSubjectsLoading, setMdmSubjectsLoading] = useState(false);
  const [mdmPapersLoading, setMdmPapersLoading] = useState(false);

  // Open Elective State
  const [availableOEs, setAvailableOEs] = useState<OpenElectiveBasket[]>([]);
  const [selectedOeId, setSelectedOeId] = useState<string>("");
  const [selectedOeSubject, setSelectedOeSubject] = useState<Subject | null>(null);

  const [isDownloadingAll, setIsDownloadingAll] = useState<string | null>(null);

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

  const handleDownloadAll = async (subjectId: string, paperList: QuestionPaper[]) => {
    setIsDownloadingAll(subjectId);
    try {
      const validPapers = paperList.filter((p) => p.paper_url);
      if (validPapers.length === 0) {
        alert("No valid PDFs found for download.");
        return;
      }

      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const paper of validPapers) {
        try {
          const response = await fetch(paper.paper_url!);
          const arrayBuffer = await response.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error("Error fetching/merging paper:", paper.paper_title, err);
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `All_Papers_${subjectId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error creating merged PDF", error);
      alert("An error occurred while merging the PDFs.");
    } finally {
      setIsDownloadingAll(null);
    }
  };

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
        if (cached.profile?.semester) setSelectedMdmSemester(cached.profile.semester);
        if (cached.profile?.mdm_branch_id) setSelectedMdmBranchId(cached.profile.mdm_branch_id);
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
          mdm_branch_id,
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
      if (userProfile?.semester) setSelectedMdmSemester(userProfile.semester);
      if (userProfile?.mdm_branch_id) setSelectedMdmBranchId(userProfile.mdm_branch_id);

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
    setSelectedMdmSubject(null);
    setMdmPapers([]);
    
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

  // --- MDM LOGIC ---
  useEffect(() => {
    async function loadMdmBranches() {
      if (!supabase) return;
      const { data, error } = await supabase.from('branches').select('branch_id, branch_name, branch_code').order('branch_name');
      if (!error && data) {
        setMdmBranches(data);
      }
    }
    loadMdmBranches();
  }, [supabase]);

  useEffect(() => {
    async function loadMdmSubjects() {
      if (!supabase || !selectedMdmBranchId || !selectedMdmSemester) {
        setMdmSubjects([]);
        setMdmPapers([]);
        setSelectedMdmSubject(null);
        return;
      }
      setMdmSubjectsLoading(true);
      
      const { data, error } = await supabase
        .from('mdm_subjects')
        .select(`
          *,
          mdm_branch_subject_mapping!inner(branch_id, semester)
        `)
        .eq('mdm_branch_subject_mapping.branch_id', selectedMdmBranchId)
        .eq('mdm_branch_subject_mapping.semester', selectedMdmSemester);

      console.log("MDM Query Result:", { data, error, selectedMdmBranchId, selectedMdmSemester });

      if (!error && data) {
        // Data is now an array of MdmSubject directly
        setMdmSubjects(data as MdmSubject[]);
      } else {
        setMdmSubjects([]);
      }
      setMdmSubjectsLoading(false);
      setMdmPapers([]);
      setSelectedMdmSubject(null);
    }
    loadMdmSubjects();
  }, [supabase, selectedMdmBranchId, selectedMdmSemester]);

  const handleMdmBranchChange = async (newBranchId: string) => {
    setSelectedMdmBranchId(newBranchId);
    if (currentUser?.id && newBranchId) {
      const { error } = await supabase
        .from('users')
        .update({ mdm_branch_id: newBranchId })
        .eq('user_id', currentUser.id);
      
      if (!error && profile) {
        const newProfile = { ...profile, mdm_branch_id: newBranchId };
        setProfile(newProfile);
        setCache(`pyqs_profile_${currentUser.id}`, { profile: newProfile, subjects });
      }
    }
  };

  const loadMdmPapers = async (subject: MdmSubject) => {
    if (!supabase) return;
    setSelectedMdmSubject(subject);
    setSelectedSubject(null);
    
    setMdmPapers([]);
    setMdmPapersLoading(true);

    const { data, error } = await supabase
      .from("question_papers")
      .select("paper_id, paper_title, year, exam_type, duration, total_marks, paper_url")
      .eq("mdm_subject_id", subject.mdm_subject_id)
      .order("year", { ascending: false });

    if (!error && data) {
      setMdmPapers(data);
    }
    setMdmPapersLoading(false);
  };

  // --- OE LOGIC ---
  useEffect(() => {
    async function loadOpenElectives() {
      if (!supabase || !profile?.semester || !currentUser?.id) {
        setAvailableOEs([]);
        setSelectedOeId("");
        setSelectedOeSubject(null);
        return;
      }
      
      const { data: oeData } = await supabase
        .from("open_elective_baskets")
        .select(`
          oe_id, semester, subject_id, board_code, course_code, display_order, academic_year, is_active,
          subjects (subject_id, subject_name, subject_code)
        `)
        .eq("semester", profile.semester)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (oeData) {
        const validBaskets = oeData.map((item: any) => ({
          ...item,
          subjects: Array.isArray(item.subjects) ? item.subjects[0] : item.subjects
        })).filter((item: any) => item.subjects != null);
        setAvailableOEs(validBaskets as any);
      } else {
        setAvailableOEs([]);
      }

      const { data: selData } = await supabase
        .from("student_open_electives")
        .select("oe_id")
        .eq("user_id", currentUser.id)
        .eq("semester", profile.semester)
        .maybeSingle();

      if (selData?.oe_id) {
        setSelectedOeId(selData.oe_id);
      } else {
        setSelectedOeId("");
      }
    }
    loadOpenElectives();
  }, [supabase, profile?.semester, currentUser?.id]);

  useEffect(() => {
    if (selectedOeId && availableOEs.length > 0) {
      const basket = availableOEs.find(b => b.oe_id === selectedOeId);
      if (basket?.subjects) {
        setSelectedOeSubject({
          subject_id: basket.subjects.subject_id,
          subject_name: basket.subjects.subject_name,
          subject_code: basket.course_code || basket.subjects.subject_code,
          semester: profile?.semester || 0
        });
      } else {
        setSelectedOeSubject(null);
      }
    } else {
      setSelectedOeSubject(null);
    }
  }, [selectedOeId, availableOEs, profile?.semester]);

  const handleOeChange = async (newOeId: string) => {
    setSelectedOeId(newOeId);
    if (!currentUser?.id || !profile?.semester) return;
    
    if (!newOeId) {
      await supabase
        .from("student_open_electives")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("semester", profile.semester);
      return;
    }

    const { data: existing } = await supabase
      .from("student_open_electives")
      .select("selection_id")
      .eq("user_id", currentUser.id)
      .eq("semester", profile.semester)
      .maybeSingle();
      
    if (existing) {
      await supabase
        .from("student_open_electives")
        .update({ oe_id: newOeId })
        .eq("selection_id", existing.selection_id);
    } else {
      await supabase
        .from("student_open_electives")
        .insert({
          user_id: currentUser.id,
          oe_id: newOeId,
          semester: profile.semester
        });
    }
  };
  // -----------------

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
                  <div className="pyqSubjectHeader" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div>
                        <h2>Subjects</h2>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, marginTop: '4px' }}>
                          {profile.universities?.university_name} • {profile.branches?.branch_name}
                        </p>
                      </div>
                      <strong>{subjects.length + mdmSubjects.length + (selectedOeSubject ? 1 : 0)}</strong>
                    </div>
                    
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <CustomSelect 
                        label="MDM BRANCH (OPTIONAL)"
                        value={selectedMdmBranchId}
                        onChange={handleMdmBranchChange}
                        placeholder="Select MDM branch..."
                        options={mdmBranches.map(b => ({
                          value: b.branch_id,
                          label: `${b.branch_name} ${b.branch_code ? `(${b.branch_code})` : ''}`
                        }))}
                      />
                      
                      {availableOEs.length > 0 && (
                        <CustomSelect 
                          label="OPEN ELECTIVE (OPTIONAL)"
                          value={selectedOeId}
                          onChange={handleOeChange}
                          placeholder="Select Open Elective..."
                          options={availableOEs.map(oe => ({
                            value: oe.oe_id,
                            label: `${oe.subjects?.subject_name} (${oe.course_code || oe.subjects?.subject_code})`
                          }))}
                        />
                      )}
                    </div>
                  </div>

              {(subjects.length === 0 && mdmSubjects.length === 0 && !selectedOeSubject) ? (
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
                            <>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginRight: '16px' }}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadAll(subject.subject_id, papers);
                                  }}
                                  disabled={isDownloadingAll === subject.subject_id}
                                  style={{ padding: '8px 16px', background: 'rgba(56, 211, 153, 0.1)', color: '#38d399', border: '1px solid #38d399', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                                >
                                  {isDownloadingAll === subject.subject_id ? (
                                    <><span className="pyqLoader" style={{width: '14px', height: '14px', borderWidth: '2px', borderBottomColor: '#38d399'}}/> Merging PDFs...</>
                                  ) : (
                                    <><Download size={16} /> Download All</>
                                  )}
                                </button>
                              </div>
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
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {mdmSubjects.map((subject) => (
                      <div className="pyqSubjectGroup" key={subject.mdm_subject_id}>
                        <button
                          type="button"
                          className={selectedMdmSubject?.mdm_subject_id === subject.mdm_subject_id ? "active" : ""}
                          aria-current={selectedMdmSubject?.mdm_subject_id === subject.mdm_subject_id ? "true" : undefined}
                          onClick={() => loadMdmPapers(subject)}
                        >
                          <span>{subject.subject_code || "MDM"}</span>
                          <strong>{subject.subject_name}</strong>
                          <em>
                            {selectedMdmSubject?.mdm_subject_id === subject.mdm_subject_id
                              ? "Selected"
                              : "View papers"}
                          </em>
                        </button>
  
                        {selectedMdmSubject?.mdm_subject_id === subject.mdm_subject_id && (
                          <div className="pyqInlinePapers">
                            {mdmPapersLoading ? (
                              <div className="pyqInlineState">
                                <span className="pyqLoader" />
                                <p>Retrieving papers...</p>
                              </div>
                            ) : mdmPapers.length === 0 ? (
                              <div className="pyqInlineState">
                                <strong>No papers discovered</strong>
                                <p>We haven't uploaded PYQs for this specific MDM subject yet.</p>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginRight: '16px' }}>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadAll(subject.mdm_subject_id, mdmPapers);
                                    }}
                                    disabled={isDownloadingAll === subject.mdm_subject_id}
                                    style={{ padding: '8px 16px', background: 'rgba(56, 211, 153, 0.1)', color: '#38d399', border: '1px solid #38d399', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                                  >
                                    {isDownloadingAll === subject.mdm_subject_id ? (
                                      <><span className="pyqLoader" style={{width: '14px', height: '14px', borderWidth: '2px', borderBottomColor: '#38d399'}}/> Merging PDFs...</>
                                    ) : (
                                      <><Download size={16} /> Download All</>
                                    )}
                                  </button>
                                </div>
                                <div className="pyqInlinePaperList">
                                  {mdmPapers.map((paper) => (
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
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {selectedOeSubject && [selectedOeSubject].map((subject) => (
                      <div className="pyqSubjectGroup" key={subject.subject_id}>
                        <button
                          type="button"
                          className={selectedSubject?.subject_id === subject.subject_id ? "active" : ""}
                          aria-current={selectedSubject?.subject_id === subject.subject_id ? "true" : undefined}
                          onClick={() => loadPapers(subject)}
                        >
                          <span>{subject.subject_code || "OE"}</span>
                          <strong>{subject.subject_name} <span style={{fontSize: '0.7rem', color: '#9ef8dc', marginLeft: '6px', padding: '2px 6px', border: '1px solid #9ef8dc', borderRadius: '4px', textTransform: 'uppercase'}}>OE</span></strong>
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
                                  We haven't uploaded PYQs for this Open Elective yet. Check back later!
                                </p>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginRight: '16px' }}>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadAll(subject.subject_id, papers);
                                    }}
                                    disabled={isDownloadingAll === subject.subject_id}
                                    style={{ padding: '8px 16px', background: 'rgba(56, 211, 153, 0.1)', color: '#38d399', border: '1px solid #38d399', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                                  >
                                    {isDownloadingAll === subject.subject_id ? (
                                      <><span className="pyqLoader" style={{width: '14px', height: '14px', borderWidth: '2px', borderBottomColor: '#38d399'}}/> Merging PDFs...</>
                                    ) : (
                                      <><Download size={16} /> Download All</>
                                    )}
                                  </button>
                                </div>
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
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </aside>

            <section className="pyqPapersPanel">
              {(subjects.length === 0 && mdmSubjects.length === 0 && !selectedOeSubject) ? (
                <div className="pyqStartPanel">
                  <span className="pyqStartMark">PYQ</span>
                  <h2>No subjects yet</h2>
                  <Link href="/profile" prefetch={false}>
                    Review profile
                  </Link>
                </div>
              ) : (!selectedSubject && !selectedMdmSubject) ? (
                <div className="pyqStartPanel">
                  <span className="pyqStartMark">PYQ</span>
                  <h2>Select subject</h2>
                </div>
              ) : selectedSubject ? (
                <>
                  <div className="pyqPaperHeader">
                    <div className="pyqPanelHeading">
                      <span>Papers</span>
                      <h2>{selectedSubject.subject_name}</h2>
                      <p>{selectedSubject.subject_code}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {papers.length > 0 && (
                        <button 
                          onClick={() => handleDownloadAll(selectedSubject.subject_id, papers)}
                          disabled={isDownloadingAll === selectedSubject.subject_id}
                          style={{ padding: '8px 16px', background: 'rgba(56, 211, 153, 0.1)', color: '#38d399', border: '1px solid #38d399', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                        >
                          {isDownloadingAll === selectedSubject.subject_id ? (
                            <><span className="pyqLoader" style={{width: '14px', height: '14px', borderWidth: '2px', borderBottomColor: '#38d399'}}/> Merging PDFs...</>
                          ) : (
                            <><Download size={16} /> Download All</>
                          )}
                        </button>
                      )}
                      <strong>
                        {papersLoading
                          ? "Loading"
                          : `${papers.length} paper${papers.length === 1 ? "" : "s"}`}
                      </strong>
                    </div>
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
              ) : selectedMdmSubject ? (
                <>
                  <div className="pyqPaperHeader">
                    <div className="pyqPanelHeading">
                      <span>MDM Papers</span>
                      <h2>{selectedMdmSubject.subject_name}</h2>
                      <p>{selectedMdmSubject.subject_code || "MDM"}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {mdmPapers.length > 0 && (
                        <button 
                          onClick={() => handleDownloadAll(selectedMdmSubject.mdm_subject_id, mdmPapers)}
                          disabled={isDownloadingAll === selectedMdmSubject.mdm_subject_id}
                          style={{ padding: '8px 16px', background: 'rgba(56, 211, 153, 0.1)', color: '#38d399', border: '1px solid #38d399', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                        >
                          {isDownloadingAll === selectedMdmSubject.mdm_subject_id ? (
                            <><span className="pyqLoader" style={{width: '14px', height: '14px', borderWidth: '2px', borderBottomColor: '#38d399'}}/> Merging PDFs...</>
                          ) : (
                            <><Download size={16} /> Download All</>
                          )}
                        </button>
                      )}
                      <strong>
                        {mdmPapersLoading
                          ? "Loading"
                          : `${mdmPapers.length} paper${mdmPapers.length === 1 ? "" : "s"}`}
                      </strong>
                    </div>
                  </div>

                  {mdmPapersLoading ? (
                    <div className="pyqState compact">
                      <span className="pyqLoader" />
                      <h2>Retrieving papers</h2>
                    </div>
                  ) : mdmPapers.length === 0 ? (
                    <div className="pyqState compact">
                      <h2>No MDM papers discovered</h2>
                      <p>We haven't uploaded PYQs for this MDM subject yet. Check back soon!</p>
                    </div>
                  ) : (
                    <div className="pyqPaperGrid">
                      {mdmPapers.map((paper) => (
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
              ) : null}
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
