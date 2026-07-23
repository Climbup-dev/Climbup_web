import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for DB2 (Class Agent DB)
const supabaseUrl = process.env.CLASS_AGENT_SUPABASE_URL || '';
const supabaseServiceKey = process.env.CLASS_AGENT_SUPABASE_SERVICE_KEY || '';

const supabaseDB2 = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;

    if (!subjectId) {
      return NextResponse.json({ status: 'error', detail: 'Missing subjectId' }, { status: 400 });
    }

    // Query classrooms table from DB2
    const { data, error } = await supabaseDB2
      .from('classrooms')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching topics from DB2:', error);
      return NextResponse.json({ status: 'error', detail: error.message }, { status: 500 });
    }

    // Format the response to exactly match the Python backend format
    const topics = (data || []).map((row) => ({
      classroom_id: row.id,
      topic_name: row.topic_name || 'General Topic',
      pdf_url: row.pdf_url || '',
      created_at: row.created_at || '',
    }));

    return NextResponse.json({
      status: 'success',
      subject_id: subjectId,
      topics: topics,
    });
  } catch (error: any) {
    console.error('Unexpected error in classrooms API:', error);
    return NextResponse.json({ status: 'error', detail: error.message || 'Unknown error' }, { status: 500 });
  }
}
