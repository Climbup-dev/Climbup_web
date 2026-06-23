import AppPageShell from "@/components/AppPageShell";

export default function JobsPreparationPage() {
  return (
    <AppPageShell
      eyebrow="Career preparation"
      title="Job Preparation"
      description="Prepare for internships, placements, aptitude rounds, interviews, and practical career growth."
      primaryAction="Prepare for Jobs"
      cards={[
        {
          title: "Placement Ready",
          copy: "Keep aptitude, interview, and resume preparation in one focused place.",
        },
        {
          title: "Opportunity Notes",
          copy: "Track useful job and internship learning without losing the details.",
        },
        {
          title: "Student Growth",
          copy: "Build confidence through steady preparation and shared experience.",
        },
      ]}
    />
  );
}
