"use client";

export default function QuestionDetailError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="questionDetailPage">
      <section className="questionDetailShell">
        <div className="questionDetailState">
          <h1>Something went wrong</h1>
          <p>{error.message || "Unable to load this answer."}</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
