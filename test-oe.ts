import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("student_open_electives")
    .select(`
      oe_id,
      open_elective_baskets (
        subjects (subject_id, subject_name, subject_code)
      )
    `)
    .limit(1);
    
  console.log("With open_elective_baskets:", JSON.stringify({ data, error }, null, 2));

  // let's just query what columns it has
  const { data: d2, error: e2 } = await supabase
    .from("student_open_electives")
    .select('*')
    .limit(1);
  console.log("Raw row:", JSON.stringify({ d2, e2 }, null, 2));
}

check();
