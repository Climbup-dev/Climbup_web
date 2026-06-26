export default function QuestionDetailLoading() {
  return (
    <main className="questionDetailPage">
      <section className="questionDetailShell">
        <div className="questionDetailState">
          <span className="questionDetailLoader" />
          <h1>Loading answer</h1>
          <p>Opening the selected question.</p>
        </div>
      </section>
    </main>
  );
}
