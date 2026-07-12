import Link from "next/link";

import EditableAnswerRenderer from "@/Answer_system/Ans/editor/EditableAnswerRenderer";
import QuestionDetailFrame from "@/components/QuestionDetailFrame";
import QuestionHeader from "@/components/QuestionHeader";
import ClimbupAIChatbot from "@/components/ClimbupAIChatbot";
import { getQuestionDetail } from "@/lib/question-detail";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    answerId?: string;
    answerSource?: string;
  }>;
};

export const metadata = {
  title: "Question Answer",
  description: "Question detail and answer view.",
};

export default async function QuestionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const answerSource =
    query.answerSource === "student" || query.answerSource === "ai"
      ? query.answerSource
      : undefined;
  const { data: question, error } = await getQuestionDetail(id, {
    answerId: query.answerId,
    answerSource,
  });
  const backHref = question?.paperId ? `/pyqs/${question.paperId}` : "/pyqs";

  return (
    <QuestionDetailFrame>
      <div className="answerPageSplitLayout">
        <main className="questionDetailPage">
          <section className="questionDetailShell">
            <Link className="questionDetailBack" href={backHref} prefetch={false}>
              Back to Question Paper
            </Link>

          {error ? (
            <div className="questionDetailState">
              <h1>Unable to load question</h1>
              <p>{error}</p>
            </div>
          ) : !question ? (
            <div className="questionDetailState">
              <h1>Question not found</h1>
              <p>This question may not exist or you may not have access.</p>
            </div>
          ) : (
            <>
              <QuestionHeader 
                title={question.title} 
                imageUrls={question.imageUrls} 
              />

              <EditableAnswerRenderer
                key={`${question.id}-${question.answerMeta?.answerId || "no-answer"}`}
                questionId={question.id}
                answerId={question.answerMeta?.answerId || ""}
                answerSource={question.answerMeta?.source}
                data={question.answerData}
                hasImage={!!(question.imageUrls && question.imageUrls.length > 0)}
                questionImage={question.imageUrls?.[0]}
                author={question.answerMeta?.author}
                answeredAt={question.answerMeta?.publishedAt}
                questionTitle={question.title}
              />
            </>
          )}
        </section>
      </main>
      <aside className="chatbotSidePanel">
        <ClimbupAIChatbot embedded={true} initialContextQuestion={question?.title || ""} />
      </aside>
      </div>
    </QuestionDetailFrame>
  );
}
