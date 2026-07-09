import Link from "next/link";

import EditableAnswerRenderer from "@/Answer_system/Ans/editor/EditableAnswerRenderer";
import QuestionDetailFrame from "@/components/QuestionDetailFrame";
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
              <header className="questionDetailHeader">
                <h1>{question.title}</h1>
                {question.imageUrls && question.imageUrls.length > 0 && (
                  <div className="questionImages" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
                    {question.imageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Question Figure"
                        style={{ 
                          maxWidth: "100%", 
                          maxHeight: "320px", 
                          objectFit: "contain",
                          borderRadius: "12px", 
                          border: "1.5px solid rgba(158, 248, 220, 0.28)",
                          backgroundColor: "rgba(255, 255, 255, 0.96)",
                          padding: "8px",
                          position: "relative",
                          zIndex: 2
                        }}
                      />
                    ))}
                  </div>
                )}
              </header>

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
              />
            </>
          )}
        </section>
      </main>
    </QuestionDetailFrame>
  );
}
