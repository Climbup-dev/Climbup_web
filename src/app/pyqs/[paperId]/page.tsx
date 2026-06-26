import QuestionPaperClient from "@/components/QuestionPaperClient";

type PageProps = {
  params: Promise<{
    paperId: string;
  }>;
};

export default async function QuestionPaperPage({ params }: PageProps) {
  const { paperId } = await params;

  return <QuestionPaperClient paperId={paperId} />;
}
