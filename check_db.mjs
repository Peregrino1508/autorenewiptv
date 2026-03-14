import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://snoiymaflwumwlbschau.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub2l5bWFmbHd1bXdsYnNjaGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTIzMDIsImV4cCI6MjA4ODU4ODMwMn0.7zpSqaMEe1AnEAutW3qsno3ZfR68t4CLLE356iRvUr4"
);

async function main() {
  const { data, error } = await supabase
    .from('iptv_users')
    .select('*')
    .eq('username', 'h33f962');
    
  if (error) {
    console.error("Error fetching payment:", error);
  } else {
    console.log("Payments found:", JSON.stringify(data, null, 2));
  }
}

main();
