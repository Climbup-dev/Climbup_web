import AppPageShell from "@/components/AppPageShell";

export default function PyqsPreparationPage() {
  return (
    <AppPageShell
      eyebrow="Previous year questions"
      title="PYQs"
      description="Practice important questions, compare answer patterns, and build exam confidence with focused preparation."
      primaryAction="Start Preparing"
      cards={[
        {
          title: "Question Practice",
          copy: "Organize previous year questions by subject, unit, and exam priority.",
        },
        {
          title: "Answer Support",
          copy: "Keep useful explanations close so revision feels faster and clearer.",
        },
        {
          title: "Exam Focus",
          copy: "Spot repeated ideas and prepare the topics that matter most.",
        },
      ]}
    />
  );
}
