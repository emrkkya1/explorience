import { supabase } from '@/lib/supabase';
import { getActiveSession } from '@/lib/sessionStore';

export async function ensureAuth(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw new Error(signInError.message);
  return signInData.user!.id;
}

export async function syncPlayerUserId(gameId: string, playerId: string): Promise<void> {
  console.log('[syncPlayerUserId] Syncing player user_id:', { gameId, playerId });
  const userId = await ensureAuth();
  console.log('[syncPlayerUserId] Current auth userId:', userId);

  const { data: playerRow, error: playerError } = await supabase
    .from('players')
    .select('user_id')
    .eq('id', playerId)
    .single();

  if (playerError || !playerRow) {
    console.log('[syncPlayerUserId] Player not found, skipping');
    return;
  }

  if (playerRow.user_id === userId) {
    console.log('[syncPlayerUserId] user_id matches, no update needed');
    return;
  }

  console.log('[syncPlayerUserId] Updating user_id from', playerRow.user_id, 'to', userId);
  const { error: updateError } = await supabase
    .from('players')
    .update({ user_id: userId })
    .eq('id', playerId);

  if (updateError) {
    console.error('[syncPlayerUserId] Update failed:', updateError);
  } else {
    console.log('[syncPlayerUserId] user_id synced successfully');
  }
}

type AuthFailure =
  | { kind: 'permission'; message: string }
  | { kind: 'other'; message: string };

function classifyError(err: unknown): AuthFailure | null {
  if (!err) return null;
  let message = '';
  let code: string | undefined;
  if (typeof err === 'object' && err !== null) {
    const e = err as { message?: string; code?: string };
    message = e.message ?? '';
    code = e.code;
  } else {
    message = String(err);
  }
  const lower = message.toLowerCase();
  if (
    code === '42501' ||
    code === 'PGRST301' ||
    code === 'permission_denied' ||
    lower.includes('permission') ||
    lower.includes('not a member') ||
    lower.includes('does not belong to caller') ||
    lower.includes('jwt') ||
    lower.includes('token') ||
    lower.includes('unauthenticated')
  ) {
    return { kind: 'permission', message };
  }
  return { kind: 'other', message };
}

export async function withAuthRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    const cls = classifyError(err);
    if (!cls || cls.kind !== 'permission') throw err;

    console.warn('[withAuthRetry] auth failure, re-syncing player', cls.message);
    const session = await getActiveSession();
    if (session) {
      try {
        await syncPlayerUserId(session.gameId, session.playerId);
      } catch (syncErr) {
        console.error('[withAuthRetry] syncPlayerUserId failed:', syncErr);
      }
    }
    return op();
  }
}