import { Metadata } from "next";
import StudyHubContent from "@/components/StudyHubContent";

export const metadata: Metadata = {
  title: "Study Hub | ClimbUP",
  description: "Subject-wise notes, resources, and discussion forums for students.",
};

export default function StudyHubPage() {
  return (
    <>
      <StudyHubContent />
    </>
  );
}
