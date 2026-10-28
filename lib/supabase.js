
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  'https://gzipmbloqalmkgvugnrk.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aXBtYmxvcWFsbWtndnVnbnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDc1NzMsImV4cCI6MjEwODc4MzU3M30.WK27PQ9uaNOyZxQjLA64m5VjvYHj2DuhDL9BvNqiIrY';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
