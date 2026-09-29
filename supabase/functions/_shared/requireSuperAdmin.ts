import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Validates the caller's JWT and ensures they are a super admin.
// Returns the admin client on success, or an error message + status.
export async function requireSuperAdmin(req: Request): Promise<
  { ok: true; admin: SupabaseClient; callerId: string } | { ok: false; status: number; error: string }
> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, status: 401, error: 'Требуется вход' }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return { ok: false, status: 401, error: 'Требуется вход' }

  const { data: isSuper, error: roleErr } = await admin.rpc('is_super_admin', { _user_id: userData.user.id })
  if (roleErr || isSuper !== true) return { ok: false, status: 403, error: 'Доступ только для супер-админа' }

  return { ok: true, admin, callerId: userData.user.id }
}
