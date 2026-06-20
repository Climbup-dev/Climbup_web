// src/components/QuestionsList.tsx

export default function QuestionsList({ questions }: { questions: any[] }) {
  return (
    <div>
      {questions?.map((q, index) => (
        <div key={q.question_id || q.id || index}>
          <p>{q.question_text || q.question || "Question unavailable"}</p>
        </div>
      ))}
    </div>
  );
}