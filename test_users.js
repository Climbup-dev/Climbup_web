
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jueoglgbseoxszygpjdb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1ZW9nbGdic2VveHN6eWdwamRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODUwMjYsImV4cCI6MjA5NzM2MTAyNn0.PmVKzsVVHYS384PahpfCHB-_DZLg4gTlQN1sVOYfa8w');
async function test() {
  const { data, error } = await supabase.from('users').select('*');
  console.log('Error:', error);
  console.log('Data:', data?.length);
}
test();

