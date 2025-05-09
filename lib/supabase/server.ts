import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  try {
    // Create a server's supabase client with newly configured cookie,
    // which could be used to maintain user's session
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.error('Cookie ayarlanırken hata:', error instanceof Error ? error.message : String(error))
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('Supabase server client oluşturulurken hata:', error instanceof Error ? error.message : String(error))
    throw error
  }
}