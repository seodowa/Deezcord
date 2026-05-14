import { encryptData, decryptData } from './crypto';
import type { Message } from '../types/message';

const MESSAGE_CACHE_PREFIX = 'deezcord_msg_cache_';
const CHANNELS_CACHE_PREFIX = 'deezcord_channels_cache_';
const ROOMS_CACHE_KEY = 'deezcord_rooms_cache';
const DMS_CACHE_KEY = 'deezcord_dms_cache';
const FRIENDS_CACHE_KEY = 'deezcord_friends_cache';
const PENDING_CACHE_KEY = 'deezcord_pending_cache';
const MEMBERS_CACHE_PREFIX = 'deezcord_members_cache_';
const MAX_CACHED_MESSAGES = 50;

/**
 * Saves messages for a specific channel to encrypted sessionStorage.
 */
export async function saveMessages(channelId: string, messages: Message[]): Promise<void> {
  try {
    const recentMessages = messages.slice(-MAX_CACHED_MESSAGES);
    const encrypted = await encryptData(recentMessages);
    sessionStorage.setItem(`${MESSAGE_CACHE_PREFIX}${channelId}`, encrypted);
  } catch (err) {
    console.error('Failed to save messages to cache:', err);
  }
}

/**
 * Loads and decrypts messages for a specific channel from sessionStorage.
 */
export async function loadMessages(channelId: string): Promise<Message[]> {
  try {
    const encrypted = sessionStorage.getItem(`${MESSAGE_CACHE_PREFIX}${channelId}`);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as Message[]) || [];
  } catch (err) {
    console.error('Failed to load messages from cache:', err);
    return [];
  }
}

/**
 * Saves channels for a specific room to encrypted sessionStorage.
 */
export async function saveChannels(roomId: string, channels: unknown[]): Promise<void> {
  try {
    const encrypted = await encryptData(channels);
    sessionStorage.setItem(`${CHANNELS_CACHE_PREFIX}${roomId}`, encrypted);
  } catch (err) {
    console.error('Failed to save channels to cache:', err);
  }
}

/**
 * Loads and decrypts channels for a specific room from sessionStorage.
 */
export async function loadChannels(roomId: string): Promise<unknown[]> {
  try {
    const encrypted = sessionStorage.getItem(`${CHANNELS_CACHE_PREFIX}${roomId}`);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as unknown[]) || [];
  } catch (err) {
    console.error('Failed to load channels from cache:', err);
    return [];
  }
}

/**
 * Saves rooms to encrypted sessionStorage.
 */
export async function saveRooms(rooms: unknown[]): Promise<void> {
  try {
    const encrypted = await encryptData(rooms);
    sessionStorage.setItem(ROOMS_CACHE_KEY, encrypted);
  } catch (err) {
    console.error('Failed to save rooms to cache:', err);
  }
}

/**
 * Loads and decrypts rooms from sessionStorage.
 */
export async function loadRooms(): Promise<unknown[]> {
  try {
    const encrypted = sessionStorage.getItem(ROOMS_CACHE_KEY);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as unknown[]) || [];
  } catch (err) {
    console.error('Failed to load rooms from cache:', err);
    return [];
  }
}

/**
 * Saves DMs to encrypted sessionStorage.
 */
export async function saveDMs(dms: unknown[]): Promise<void> {
  try {
    const encrypted = await encryptData(dms);
    sessionStorage.setItem(DMS_CACHE_KEY, encrypted);
  } catch (err) {
    console.error('Failed to save DMs to cache:', err);
  }
}

/**
 * Loads and decrypts DMs from sessionStorage.
 */
export async function loadDMs(): Promise<unknown[]> {
  try {
    const encrypted = sessionStorage.getItem(DMS_CACHE_KEY);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as unknown[]) || [];
  } catch (err) {
    console.error('Failed to load DMs from cache:', err);
    return [];
  }
}

/**
 * Saves friends to encrypted sessionStorage.
 */
export async function saveFriends(friends: unknown[]): Promise<void> {
  try {
    const encrypted = await encryptData(friends);
    sessionStorage.setItem(FRIENDS_CACHE_KEY, encrypted);
  } catch (err) {
    console.error('Failed to save friends to cache:', err);
  }
}

/**
 * Loads and decrypts friends from sessionStorage.
 */
export async function loadFriends(): Promise<unknown[]> {
  try {
    const encrypted = sessionStorage.getItem(FRIENDS_CACHE_KEY);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as unknown[]) || [];
  } catch (err) {
    console.error('Failed to load friends from cache:', err);
    return [];
  }
}

/**
 * Saves pending requests to encrypted sessionStorage.
 */
export async function savePending(pending: unknown[]): Promise<void> {
  try {
    const encrypted = await encryptData(pending);
    sessionStorage.setItem(PENDING_CACHE_KEY, encrypted);
  } catch (err) {
    console.error('Failed to save pending requests to cache:', err);
  }
}

/**
 * Loads and decrypts pending requests from sessionStorage.
 */
export async function loadPending(): Promise<unknown[]> {
  try {
    const encrypted = sessionStorage.getItem(PENDING_CACHE_KEY);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as unknown[]) || [];
  } catch (err) {
    console.error('Failed to load pending requests from cache:', err);
    return [];
  }
}

/**
 * Saves members for a specific room to encrypted sessionStorage.
 */
export async function saveMembers(roomId: string, members: unknown[]): Promise<void> {
  try {
    const encrypted = await encryptData(members);
    sessionStorage.setItem(`${MEMBERS_CACHE_PREFIX}${roomId}`, encrypted);
  } catch (err) {
    console.error('Failed to save members to cache:', err);
  }
}

/**
 * Loads and decrypts members for a specific room from sessionStorage.
 */
export async function loadMembers(roomId: string): Promise<unknown[]> {
  try {
    const encrypted = sessionStorage.getItem(`${MEMBERS_CACHE_PREFIX}${roomId}`);
    if (!encrypted) return [];

    const decrypted = await decryptData(encrypted);
    return (decrypted as unknown[]) || [];
  } catch (err) {
    console.error('Failed to load members from cache:', err);
    return [];
  }
}

/**
 * Removes cached data for a specific channel.
 */
export function clearChannelCache(channelId: string): void {
  sessionStorage.removeItem(`${MESSAGE_CACHE_PREFIX}${channelId}`);
}

/**
 * Clears all cached messages (e.g., on logout).
 */
export function clearMessageCache(): void {
  Object.keys(sessionStorage)
    .filter(key => 
      key.startsWith(MESSAGE_CACHE_PREFIX) || 
      key.startsWith(CHANNELS_CACHE_PREFIX) || 
      key.startsWith(MEMBERS_CACHE_PREFIX) ||
      key === ROOMS_CACHE_KEY ||
      key === DMS_CACHE_KEY ||
      key === FRIENDS_CACHE_KEY ||
      key === PENDING_CACHE_KEY
    )
    .forEach(key => sessionStorage.removeItem(key));
}
