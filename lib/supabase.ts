import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// クライアントサイド用（anon key）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サーバーサイド用（service role key — RLSをバイパスする）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
