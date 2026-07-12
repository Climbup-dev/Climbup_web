import { NextResponse } from 'next/server';
import { createAdminClient, createRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const body = await request.json();
    
    if (!body.answer) {
      return NextResponse.json({ error: 'Answer content is required' }, { status: 400 });
    }

    // 1. Authenticate the request first to prevent unauthorized access
    const response = NextResponse.json({ ok: true });
    const authClient = createRouteHandlerClient(request, response);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized access. Please log in.' }, { status: 401 });
    }

    // 2. Proceed with admin client to bypass RLS for system-level insertion
    const supabase = createAdminClient();

    // Store as standard blocks array format
    const answerBlocks = [
      {
        id: crypto.randomUUID(),
        type: 'markdown',
        title: 'Answer',
        content: body.answer
      }
    ];

    // Insert the newly generated answer into the ai_answers table
    const { data, error } = await supabase
      .from('ai_answers')
      .insert({
        question_id: questionId,
        answer: answerBlocks,
        ai_model: 'ClimbUP AI',
      })
      .select('ai_answer_id')
      .single();

    if (error) {
      console.error('Error inserting AI answer:', error);
      return NextResponse.json({ error: 'Failed to save AI answer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ai_answer_id: data.ai_answer_id });
  } catch (error) {
    console.error('Failed to save AI answer:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
