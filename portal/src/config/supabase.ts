const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('Missing VITE_SUPABASE_URL environment variable.');
}

if (!supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Missing VITE_SUPABASE_ANON_KEY environment variable.');
}

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  functionsUrl: supabaseUrl ? `${supabaseUrl}/functions/v1` : '',
};

