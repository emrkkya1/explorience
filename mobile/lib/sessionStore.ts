import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameSession } from '@/types/GameSession';

const SESSIONS_KEY = 'explorience_sessions';
const ACTIVE_KEY = 'explorience_active_session';

export type StoredSession = GameSession & { username: string };

export async function loadSessions(): Promise<StoredSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

export async function saveSession(session: GameSession, username: string): Promise<void> {
  const sessions = await loadSessions();
  const idx = sessions.findIndex((s) => s.gameId === session.gameId);
  const entry: StoredSession = { ...session, username };
  if (idx >= 0) {
    sessions[idx] = entry;
  } else {
    sessions.push(entry);
  }
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function removeSession(gameId: string): Promise<void> {
  const sessions = await loadSessions();
  await AsyncStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify(sessions.filter((s) => s.gameId !== gameId))
  );
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.multiRemove([SESSIONS_KEY, ACTIVE_KEY]);
}

export async function setActiveSession(gameId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, gameId);
}

export async function getActiveSession(): Promise<StoredSession | null> {
  try {
    const gameId = await AsyncStorage.getItem(ACTIVE_KEY);
    if (!gameId) return null;
    const sessions = await loadSessions();
    return sessions.find((s) => s.gameId === gameId) ?? null;
  } catch {
    return null;
  }
}

export async function clearActiveSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_KEY);
}
