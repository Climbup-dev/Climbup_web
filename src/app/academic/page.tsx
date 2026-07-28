import { Metadata } from "next";
import StudyHubContent from "@/components/StudyHubContent";

export const metadata: Metadata = {
  title: "Academic | ClimbUP",
  description: "Subject-wise notes, resources, and discussion forums for students.",
};

export default function AcademicPage() {
  return <StudyHubContent />;
}
