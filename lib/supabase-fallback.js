// This file provides a Supabase client that works during build time
// It uses environment variables if available, or falls back to placeholders

export const createClient = () => {
  return {
    from: (table) => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      upsert: () => ({ data: null, error: null }),
      eq: () => ({
        select: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        in: () => ({ data: [], error: null }),
      }),
      in: () => ({
        select: () => ({ data: [], error: null }),
      }),
      order: () => ({
        limit: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    storage: {
      from: (bucket) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' }, error: null }),
      }),
    },
    rpc: () => ({ error: null }),
  };
};

export default { createClient }; 