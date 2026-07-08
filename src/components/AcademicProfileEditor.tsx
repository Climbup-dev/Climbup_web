"use client";

import { useEffect, useMemo, useState } from "react";
import CustomSelect from "@/components/CustomSelect";
import { createClient } from "@/lib/supabase/client";
import { getCache, setCache, clearCache } from "@/lib/cache";
import "@/styles/Profile.css"; // Reusing profile styles for the form

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

type UserProfile = {
  university_id: string | null;
  branch_id: string | null;
  semester: number | null;
};

interface AcademicProfileEditorProps {
  userId: string;
  onProfileUpdated: () => void;
}

export default function AcademicProfileEditor({ userId, onProfileUpdated }: AcademicProfileEditorProps) {
  const supabase = useMemo(() => createClient(), []);

  const [universities, setUniversities] = useState<University[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [profile, setProfile] = useState<UserProfile>({
    university_id: null,
    branch_id: null,
    semester: null,
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const filteredBranches = branches.filter(
    (branch) => branch.university_id === profile.university_id
  );

  useEffect(() => {
    async function loadInitialData() {
      if (!userId || !supabase) return;

      const cacheKey = `profile_initial_${userId}`;
      const cached = getCache<{ universities: University[]; profile: UserProfile }>(cacheKey);
      
      if (cached) {
        setUniversities(cached.universities);
        setProfile(cached.profile);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileMessage("");

      const [universitiesResult, profileResult] = await Promise.all([
        supabase
          .from("universities")
          .select("university_id, university_name")
          .order("university_name", { ascending: true }),

        supabase
          .from("users")
          .select("university_id, branch_id, semester")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (universitiesResult.error) {
        setProfileMessage(universitiesResult.error.message);
      } else {
        setUniversities(universitiesResult.data || []);
      }

      if (profileResult.error) {
        setProfileMessage(profileResult.error.message);
      } else if (profileResult.data) {
        const newProfile = {
          university_id: profileResult.data.university_id,
          branch_id: profileResult.data.branch_id,
          semester: profileResult.data.semester,
        };
        setProfile(newProfile);

        if (!universitiesResult.error) {
          setCache(cacheKey, {
            universities: universitiesResult.data || [],
            profile: newProfile,
          });
        }
      }

      setProfileLoading(false);
    }

    loadInitialData();
  }, [userId, supabase]);

  useEffect(() => {
    async function loadBranches() {
      if (!supabase || !profile.university_id) {
        setBranches([]);
        return;
      }

      const cacheKey = `profile_branches_${profile.university_id}`;
      const cached = getCache<Branch[]>(cacheKey);
      if (cached) {
        setBranches(cached);
        return;
      }

      const { data, error } = await supabase
        .from("branches")
        .select("branch_id, university_id, branch_name, branch_code")
        .eq("university_id", profile.university_id)
        .order("branch_name", { ascending: true });

      if (error) {
        setProfileMessage(error.message);
        return;
      }

      setBranches(data || []);
      setCache(cacheKey, data || []);
    }

    loadBranches();
  }, [profile.university_id, supabase]);

  const saveProfile = async () => {
    if (!profile.university_id || !profile.branch_id || !profile.semester) {
      setProfileMessage("Please complete all fields.");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const { error } = await supabase
        .from("users")
        .update({
          university_id: profile.university_id,
          branch_id: profile.branch_id,
          semester: profile.semester,
        })
        .eq("user_id", userId);

      if (error) {
        throw new Error(error.message || "Failed to update profile");
      }

      setProfileMessage("Academic profile saved successfully!");
      
      // Clear cache so it fetches fresh data
      clearCache(`profile_initial_${userId}`);
      clearCache(`pyqs_profile_${userId}`);
      
      onProfileUpdated();

      setTimeout(() => setProfileMessage(""), 3000);
    } catch (err: any) {
      setProfileMessage(err.message || "An error occurred");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="profileSelectorBox" style={{ margin: '0 0 30px 0', border: '1px solid rgba(56, 211, 153, 0.2)', background: 'rgba(2, 21, 38, 0.6)' }}>
      <div className="profileSelectorHeader">
        <div>
          <span>Personalized learning</span>
          <h2>Academic Profile</h2>
          <p>Select your university, branch and semester to filter PYQs.</p>
        </div>
      </div>

      <div className="profileFormGrid">
        <CustomSelect
          label="University"
          value={profile.university_id || ""}
          placeholder="Select university"
          disabled={profileLoading}
          options={universities.map((u) => ({
            value: u.university_id,
            label: u.university_name,
          }))}
          onChange={(value) =>
            setProfile({
              university_id: value || null,
              branch_id: null,
              semester: profile.semester,
            })
          }
        />

        <CustomSelect
          label="Branch"
          value={profile.branch_id || ""}
          placeholder="Select branch"
          disabled={!profile.university_id || profileLoading}
          options={filteredBranches.map((b) => ({
            value: b.branch_id,
            label: `${b.branch_name}${b.branch_code ? ` (${b.branch_code})` : ""}`,
          }))}
          onChange={(value) =>
            setProfile((current) => ({
              ...current,
              branch_id: value || null,
            }))
          }
        />

        <CustomSelect
          label="Semester"
          value={profile.semester ? String(profile.semester) : ""}
          placeholder="Select semester"
          disabled={profileLoading}
          options={[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
            value: String(sem),
            label: `Semester ${sem}`,
          }))}
          onChange={(value) =>
            setProfile((current) => ({
              ...current,
              semester: value ? Number(value) : null,
            }))
          }
        />
      </div>

      <div className="profileFormActions">
        <button
          type="button"
          className="profileSaveButton"
          disabled={profileSaving || profileLoading}
          onClick={saveProfile}
        >
          {profileSaving ? "Saving..." : "Save and load PYQs"}
        </button>

        {profileMessage && (
          <p className="profileMessage" style={{ color: profileMessage.includes('successfully') ? '#38d399' : undefined }}>{profileMessage}</p>
        )}
      </div>
    </div>
  );
}
