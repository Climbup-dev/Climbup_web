"use client";

import { useEffect, useMemo, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import { createClient } from "@/lib/supabase/client";
import { getCache, setCache } from "@/lib/cache";
import "@/styles/Profile.css"; // Reuse the beautiful profile form styles

type University = {
  university_id: string;
  university_name: string;
};

type Branch = {
  branch_id: string;
  university_id: string | null;
  branch_name: string;
  branch_code: string | null;
};

export interface ClassSelection {
  universityId: string;
  branchId: string;
  semester: number;
  universityName: string;
  branchName: string;
}

interface ClassSelectorProps {
  userId: string;
  onJoinClass: (selection: ClassSelection) => void;
}

export default function ClassSelector({ userId, onJoinClass }: ClassSelectorProps) {
  const supabase = useMemo(() => createClient(), []);

  const [universities, setUniversities] = useState<University[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredBranches = branches.filter(
    (branch) => branch.university_id === selectedUniversityId
  );

  useEffect(() => {
    async function loadInitialData() {
      if (!supabase) return;

      const cacheKey = `profile_initial_universities`; // Universal cache for universities list
      const cached = getCache<University[]>(cacheKey);
      
      if (cached) {
        setUniversities(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("universities")
        .select("university_id, university_name")
        .order("university_name", { ascending: true });

      if (error) {
        setMessage(error.message);
      } else {
        setUniversities(data || []);
        setCache(cacheKey, data || []);
      }
      setLoading(false);
    }
    loadInitialData();
  }, [supabase]);

  useEffect(() => {
    async function loadBranches() {
      if (!supabase || !selectedUniversityId) {
        setBranches([]);
        return;
      }

      const cacheKey = `profile_branches_${selectedUniversityId}`;
      const cached = getCache<Branch[]>(cacheKey);
      if (cached) {
        setBranches(cached);
        return;
      }

      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, university_id, branch_name, branch_code")
        .eq("university_id", selectedUniversityId)
        .order("branch_name", { ascending: true });

      if (error) {
        setMessage(error.message);
        return;
      }

      setBranches(data || []);
      setCache(cacheKey, data || []);
    }
    loadBranches();
  }, [selectedUniversityId, supabase]);

  const handleJoinClass = () => {
    if (!selectedUniversityId || !selectedBranchId || !selectedSemester) {
      setMessage("Please select all options");
      return;
    }

    const uniName = universities.find(u => u.university_id === selectedUniversityId)?.university_name || "";
    const branchName = branches.find(b => b.branch_id === selectedBranchId)?.branch_name || "";

    onJoinClass({
      universityId: selectedUniversityId,
      branchId: selectedBranchId,
      semester: selectedSemester,
      universityName: uniName,
      branchName: branchName
    });
  };

  if (!isMounted) return null;

  return (
    <div className="profileSelectorBox" style={{ margin: 'auto', border: '1px solid rgba(56, 211, 153, 0.2)', background: 'rgba(2, 21, 38, 0.6)', maxWidth: '800px' }}>
      <div className="profileSelectorHeader">
        <div>
          <span>Study Hub Setup</span>
          <h2>Join a Class</h2>
          <p>Select your university, branch, and semester to connect with your classmates and AI agents.</p>
        </div>
      </div>

      <div className="profileFormGrid">
        <CustomSelect
          label="University"
          value={selectedUniversityId || ""}
          placeholder="Select university"
          disabled={loading}
          options={universities.map((u) => ({
            value: u.university_id,
            label: u.university_name,
          }))}
          onChange={(value) => {
            setSelectedUniversityId(value || null);
            setSelectedBranchId(null);
          }}
        />

        <CustomSelect
          label="Branch"
          value={selectedBranchId || ""}
          placeholder="Select branch"
          disabled={!selectedUniversityId || loading}
          options={filteredBranches.map((b) => ({
            value: b.branch_id,
            label: `${b.branch_name}${b.branch_code ? ` (${b.branch_code})` : ""}`,
          }))}
          onChange={(value) => setSelectedBranchId(value || null)}
        />

        <CustomSelect
          label="Semester"
          value={selectedSemester ? String(selectedSemester) : ""}
          placeholder="Select semester"
          disabled={loading}
          options={[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
            value: String(sem),
            label: `Semester ${sem}`,
          }))}
          onChange={(value) => setSelectedSemester(value ? Number(value) : null)}
        />
      </div>

      <div className="profileFormActions">
        <button
          type="button"
          className="profileSaveButton"
          disabled={loading}
          onClick={handleJoinClass}
        >
          Request Approval
        </button>

        {message && (
          <p className="profileMessage">{message}</p>
        )}
      </div>
    </div>
  );
}
