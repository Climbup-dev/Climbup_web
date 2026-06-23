import AppPageShell from "@/components/AppPageShell";

export default function DiscoveriesPageContent() {
  return (
    <AppPageShell
      eyebrow="Student discoveries"
      title="Discoveries"
      description="Save shortcuts, useful explanations, study observations, and learning insights before they disappear."
      primaryAction="Share a Discovery"
      cards={[
        {
          title: "Study Insights",
          copy: "Capture the small ideas that make a hard concept easier to understand.",
        },
        {
          title: "Shared Learning",
          copy: "Help other students learn from what you discovered while studying.",
        },
        {
          title: "Better Recall",
          copy: "Return to your best notes and explanations when revision starts.",
        },
      ]}
    />
  );
}
