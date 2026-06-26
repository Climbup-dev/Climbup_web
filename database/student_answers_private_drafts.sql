-- Student private answer drafts use answer_content for the saved editor JSON.
-- This makes Save Private update the same user's answer for the same question.

create unique index if not exists student_answers_user_question_unique
on public.student_answers (user_id, question_id);

